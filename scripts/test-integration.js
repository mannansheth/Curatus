/** Real SQL and HTTP integration. Only a uniquely named disposable database is mutated. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const { createInterface } = require("node:readline");
const root = path.resolve(__dirname, "..");
require(path.join(root, "backend/node_modules/dotenv")).config({
  path: path.join(root, "backend/.env"),
  quiet: true,
});
const mysql = require(path.join(root, "backend/node_modules/mysql2/promise"));
const dbName = `curatus_test_${Date.now()}_${process.pid}`;
const migrationDbName = `${dbName}_migration`;
const results = [];
let admin, db, runtime, pythonProcess;

function check(label, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      results.push(label);
      process.stdout.write(`PASS ${label}\n`);
    });
}

async function startPython() {
  const local = path.join(
    root,
    "backend-py/venv",
    process.platform === "win32" ? "Scripts/python.exe" : "bin/python",
  );
  const python =
    process.env.CURATUS_TEST_PYTHON ||
    (fs.existsSync(local)
      ? local
      : process.platform === "win32"
        ? "python"
        : "python3");
  pythonProcess = spawn(python, ["tests/http_fixture.py"], {
    cwd: path.join(root, "backend-py"),
    stdio: ["ignore", "pipe", "pipe"],
  });
  pythonProcess.stderr.on("data", () => {}); // Fixture HTTP access logs contain no useful test results.
  const lines = createInterface({ input: pythonProcess.stdout });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Python fixture startup timed out")),
      15000,
    );
    pythonProcess.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    pythonProcess.once("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`Python fixture exited (${code})`));
    });
    lines.once("line", (line) => {
      clearTimeout(timer);
      if (!/^\d+$/.test(line)) reject(new Error("Invalid Python fixture port"));
      else resolve(`http://127.0.0.1:${line}`);
    });
  });
}

async function main() {
  if (!/^curatus_test_\d+_\d+$/.test(dbName))
    throw new Error("Unsafe test database name");
  admin = await mysql.createConnection({
    host: process.env.MYSQL_HOST || "localhost",
    port: Number(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASS,
    multipleStatements: true,
  });
  await admin.query(`CREATE DATABASE \`${dbName}\` CHARACTER SET utf8mb4`);
  const schema = fs
    .readFileSync(path.join(root, "backend/config/db.sql"), "utf8")
    .replace(/^\uFEFF/, "")
    .replace(/CREATE DATABASE IF NOT EXISTS `curatus`[^;]*;/i, "")
    .replace(/USE `curatus`;/i, `USE \`${dbName}\`;`);
  // Fail closed if a fresh-schema edit would target the application database.
  if (/\b(?:USE|CREATE DATABASE)[^;]*\bcuratus\b/i.test(schema))
    throw new Error("Schema database substitution failed");
  await admin.query(schema);
  await check("legacy schema migration preserves chatbot history", async () => {
    const legacy = fs.readFileSync(
      path.join(root, "scripts/fixtures/legacy-schema.sql"),
      "utf8",
    );
    const original = legacy
      .replace(/^\uFEFF/, "")
      .replace(/CREATE DATABASE IF NOT EXISTS `curatus`[^;]*;/i, "")
      .replace(/USE `curatus`;/i, `USE \`${migrationDbName}\`;`);
    if (/\b(?:USE|CREATE DATABASE)[^;]*\bcuratus\b/i.test(original))
      throw new Error("Legacy database substitution failed");
    await admin.query(
      `CREATE DATABASE \`${migrationDbName}\` CHARACTER SET utf8mb4`,
    );
    await admin.query(original);
    await admin.query(
      "INSERT INTO users (Name,Email,Password) VALUES ('Legacy','legacy@example.test','unused-test-hash')",
    );
    await admin.query(
      "INSERT INTO chatbotmessages (userID,message,sender,riskLevel,sentAt) VALUES (1,'Preserve this conversation','user','low',NOW())",
    );
    await admin.query(
      "INSERT INTO appointments (userID,therapistID,date,time,status) VALUES (1,1,'2000-01-01','09:00','')",
    );
    await admin.query(
      "INSERT INTO personalchats (aptID,content,sentBy,status,createdAt) VALUES (1,'Legacy receipt',1,'',NOW())",
    );
    const migration = fs
      .readFileSync(
        path.join(root, "backend/config/migrations/001_complete_schema.sql"),
        "utf8",
      )
      .replace(/^\uFEFF/, "");
    await admin.query(migration);
    const [messages] = await admin.query(
      "SELECT cm.message,cc.userID FROM chatbotmessages cm JOIN chatbotchats cc ON cc.ID=cm.chatID",
    );
    assert.equal(messages[0].message, "Preserve this conversation");
    assert.equal(messages[0].userID, 1);
    const [columns] = await admin.query("SHOW COLUMNS FROM users");
    assert.ok(columns.some((column) => column.Field === "phone"));
    assert.ok(columns.some((column) => column.Field === "bio"));
    const [legacyAppointments] = await admin.query(
      "SELECT status FROM appointments",
    );
    const [legacyReceipts] = await admin.query(
      "SELECT status FROM personalchats",
    );
    assert.equal(legacyAppointments[0].status, "completed");
    assert.equal(legacyReceipts[0].status, "delivered");
    await admin.query(`USE \`${dbName}\``);
  });
  process.env.MYSQL_DB = dbName;
  process.env.JWT_SECRET = "integration-test-only-secret";
  process.env.PYTHON_API_URL = await startPython();
  // Explicit provider boundary fixture: real route/transaction/persistence, no paid network generation.
  const providerPath = require.resolve(
    path.join(root, "backend/services/chatbot"),
  );
  require.cache[providerPath] = {
    id: providerPath,
    filename: providerPath,
    loaded: true,
    exports: async (context, message) => {
      if (message === "__provider_failure__") {
        const error = new Error("Provider fixture unavailable");
        error.status = 502;
        throw error;
      }
      return {
        chatbotResponse: `Fixture response to ${message}`,
        newUserContext: `${context} Summary of ${message}`.trim(),
        threatLevel: "low",
      };
    },
  };
  runtime = require(path.join(root, "backend/server")).createRuntime();
  db = require(path.join(root, "backend/config/dbConfig"));
  runtime.httpServer.listen(0, "127.0.0.1");
  await once(runtime.httpServer, "listening");
  const base = `http://127.0.0.1:${runtime.httpServer.address().port}`;
  async function request(
    route,
    { method = "GET", token, body, status = 200 } = {},
  ) {
    const response = await fetch(base + route, {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json();
    assert.equal(
      response.status,
      status,
      `${method} ${route}: ${JSON.stringify(data)}`,
    );
    return data;
  }
  const account = {
    name: "Integration Patient",
    email: "patient@example.test",
    password: "TestPass123!",
  };
  let patient, therapist, outsider, appointmentId, journalId, postId;
  await check("health and unauthenticated protection", async () => {
    await request("/health");
    await request("/api/user/stats", { status: 401 });
  });
  await check(
    "registration, login, session identity, duplicate account",
    async () => {
      patient = await request("/api/auth/signup", {
        method: "POST",
        body: account,
        status: 201,
      });
      assert.equal(patient.user.role, "user");
      const login = await request("/api/auth/login", {
        method: "POST",
        body: account,
      });
      assert.equal(login.success, true);
      assert.equal(
        (await request("/api/auth/me", { token: patient.token })).id,
        patient.user.id,
      );
      await request("/api/auth/signup", {
        method: "POST",
        body: account,
        status: 400,
      });
      outsider = await request("/api/auth/signup", {
        method: "POST",
        body: { ...account, email: "outsider@example.test" },
        status: 201,
      });
    },
  );
  await check("therapist registration and safe public discovery", async () => {
    therapist = await request("/api/auth/therapist-signup", {
      method: "POST",
      status: 201,
      body: {
        name: "Integration Therapist",
        email: "therapist@example.test",
        password: account.password,
        phone: "1234567890",
        specialization: "Anxiety & Stress",
        yearsOfExperience: 5,
        bio: "Test therapist",
        city: "Test City",
        consultationFee: 500,
        mode: "online",
        availableDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        startTime: "09:00",
        endTime: "12:00",
      },
    });
    const listing = await request("/api/therapist/all?mode=online&maxFee=600");
    assert.equal(listing.therapists.length, 1);
    assert.equal(listing.therapists[0].Password, undefined);
    assert.equal(
      (await request(`/api/therapist/${therapist.user.id}`)).therapist.Name,
      "Integration Therapist",
    );
  });
  await check("profile persistence, assessment, stats", async () => {
    await request("/api/user/profile", {
      method: "PUT",
      token: patient.token,
      body: {
        name: "Updated Patient",
        email: account.email,
        phone: "12345",
        bio: "Persisted bio",
      },
    });
    assert.equal(
      (await request("/api/user/profile", { token: patient.token })).userData
        .bio,
      "Persisted bio",
    );
    const assessment = await request("/api/user/assessment", {
      method: "POST",
      token: patient.token,
      body: {
        data: {
          anxiety: 1,
          sleep: 1,
          mood: 1,
          stress: 1,
          social: 1,
          energy: 1,
          focus: 1,
          hope: 3,
        },
      },
    });
    assert.equal(assessment.score, 75);
    assert.ok(assessment.feedback.length > 0);
    assert.equal(
      (await request("/api/user/stats", { token: patient.token })).hasSubmitted,
      true,
    );
  });
  await check(
    "journal Node-to-Flask HTTP contract and SQL persistence",
    async () => {
      const analysis = await fetch(
        process.env.PYTHON_API_URL + "/journal/entry/analyze",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: "Fixture contract check" }),
        },
      );
      assert.deepEqual(await analysis.json(), {
        success: true,
        result: { emoji: "\u{1f642}", score: 6, mood: "Neutral" },
      });
      const entry = await request("/api/journal/addEntry", {
        method: "POST",
        token: patient.token,
        body: { content: "A calm integration test journal." },
      });
      journalId = entry.entry.id;
      const entries = await request("/api/journal/entries", {
        token: patient.token,
      });
      assert.equal(entries.entries[0].ID, journalId);
      assert.equal(Number(entries.entries[0].score), 6);
      assert.equal(
        (await request("/api/user/stats", { token: patient.token })).entries
          .length,
        1,
      );
      await request("/api/journal/addEntry", {
        method: "POST",
        token: patient.token,
        body: {},
        status: 400,
      });
    },
  );
  await check(
    "client compatibility endpoints and owned journal deletion",
    async () => {
      assert.equal(
        (
          await request("/api/auth/logout", {
            method: "POST",
            token: patient.token,
          })
        ).success,
        true,
      );
      assert.equal(
        (await request("/api/mood/history", { token: patient.token })).entries
          .length,
        1,
      );
      assert.equal(
        (
          await request("/api/mood/analyze", {
            method: "POST",
            token: patient.token,
            body: { text: "Standalone analysis" },
          })
        ).result.score,
        6,
      );
      const entry = await request("/api/journal/addEntry", {
        method: "POST",
        token: patient.token,
        body: { content: "Delete only this entry" },
      });
      await request(`/api/journal/${entry.entry.id}`, {
        method: "DELETE",
        token: outsider.token,
        status: 404,
      });
      await request(`/api/journal/${entry.entry.id}`, {
        method: "DELETE",
        token: patient.token,
      });
      await request(`/api/journal/${entry.entry.id}`, {
        method: "DELETE",
        token: patient.token,
        status: 404,
      });
      const invalid = await fetch(base + "/api/user/profile", {
        method: "PUT",
        headers: { Authorization: `Bearer ${patient.token}` },
      });
      assert.equal(invalid.status, 400, "missing JSON body is a client error");
    },
  );
  const date = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  await check(
    "booking availability, concurrency conflicts and participant listing",
    async () => {
      const slots = await request(
        `/api/appointments/slots?therapistId=${therapist.user.id}&date=${date}`,
        { token: patient.token },
      );
      assert.ok(
        slots.slots.some((slot) => slot.time === "09:00:00" && !slot.booked),
      );
      const booking = await request("/api/appointments/book", {
        method: "POST",
        token: patient.token,
        body: { therapistId: therapist.user.id, date, time: "09:00" },
      });
      appointmentId = booking.id;
      await request("/api/appointments/book", {
        method: "POST",
        token: outsider.token,
        body: { therapistId: therapist.user.id, date, time: "09:00" },
        status: 409,
      });
      const offsetTherapist = await request("/api/auth/therapist-signup", {
        method: "POST",
        status: 201,
        body: {
          name: "Offset Therapist",
          email: "offset@example.test",
          password: account.password,
          phone: "1234567890",
          specialization: "Anxiety & Stress",
          yearsOfExperience: 3,
          bio: "Offset availability",
          city: "Test City",
          consultationFee: 500,
          mode: "online",
          availableDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
          startTime: "09:30",
          endTime: "12:30",
        },
      });
      const offsetSlots = await request(
        `/api/appointments/slots?therapistId=${offsetTherapist.user.id}&date=${date}`,
        { token: patient.token },
      );
      assert.equal(
        offsetSlots.slots.find((slot) => slot.time === "09:30:00").booked,
        true,
      );
      await request("/api/appointments/book", {
        method: "POST",
        token: patient.token,
        body: { therapistId: offsetTherapist.user.id, date, time: "09:30" },
        status: 409,
      });
      assert.equal(
        (await request("/api/appointments/user", { token: patient.token }))
          .appointments[0].ID,
        appointmentId,
      );
      assert.equal(
        (
          await request("/api/appointments/therapist", {
            token: therapist.token,
          })
        ).appointments[0].ID,
        appointmentId,
      );
      const concurrent = await Promise.all(
        [patient.token, outsider.token].map((token) =>
          fetch(base + "/api/appointments/book", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              therapistId: therapist.user.id,
              date,
              time: "10:00",
            }),
          }),
        ),
      );
      assert.deepEqual(
        concurrent.map((response) => response.status).sort(),
        [200, 409],
      );
      const [rows] = await db.query(
        "SELECT ID FROM appointments WHERE therapistID=? AND date=? AND time='10:00:00' AND status='upcoming'",
        [therapist.user.id, date],
      );
      assert.equal(rows.length, 1, "exactly one concurrent request persists");
    },
  );
  await check("authenticated socket rooms and real delivery", async () => {
    const { io } = require(
      path.join(root, "backend/node_modules/socket.io-client"),
    );
    const clients = [];
    async function connect(token) {
      const client = io(base, {
        auth: { token },
        transports: ["websocket"],
        reconnection: false,
        timeout: 3000,
      });
      clients.push(client);
      await Promise.race([
        once(client, "connect"),
        once(client, "connect_error").then(([error]) => {
          throw error;
        }),
      ]);
      return client;
    }
    function acknowledge(client, event, payload) {
      return new Promise((resolve, reject) =>
        client
          .timeout(3000)
          .emit(event, payload, (error, result) =>
            error ? reject(error) : resolve(result),
          ),
      );
    }
    try {
      const invalid = io(base, {
        auth: { token: "invalid" },
        transports: ["websocket"],
        reconnection: false,
        timeout: 3000,
      });
      clients.push(invalid);
      const [error] = await once(invalid, "connect_error");
      assert.match(error.message, /Authentication/);
      const recipient = await connect(therapist.token);
      const stranger = await connect(outsider.token);
      assert.equal(
        (
          await acknowledge(recipient, "join_chat", {
            aptId: appointmentId,
            userId: outsider.user.id,
          })
        ).success,
        true,
      );
      assert.equal(
        (
          await acknowledge(stranger, "join_chat", {
            aptId: appointmentId,
            userId: patient.user.id,
          })
        ).success,
        false,
      );
      assert.equal(
        (await acknowledge(stranger, "mark_read", { aptId: appointmentId }))
          .success,
        false,
      );
      const delivery = once(recipient, "receive_message", {
        signal: AbortSignal.timeout(5000),
      });
      await request("/api/appointments/chat/message", {
        method: "POST",
        token: patient.token,
        body: {
          aptId: appointmentId,
          message: { content: "Socket delivery test" },
        },
      });
      const [message] = await delivery;
      assert.equal(message.content, "Socket delivery test");
      assert.equal(message.sentBy, patient.user.id);
    } finally {
      for (const client of clients) client.disconnect();
    }
  });
  await check(
    "private messaging, read receipts, remarks and access denial",
    async () => {
      await request("/api/appointments/chat/message", {
        method: "POST",
        token: patient.token,
        body: { aptId: appointmentId, message: { content: "Hello therapist" } },
      });
      const messages = await request(
        `/api/appointments/chat/messages?aptId=${appointmentId}`,
        { token: therapist.token },
      );
      assert.equal(messages.messages.at(-1).content, "Hello therapist");
      assert.equal(messages.messages[0].isOwn, false);
      await request(`/api/appointments/chat/messages?aptId=${appointmentId}`, {
        token: outsider.token,
        status: 404,
      });
      await request("/api/appointments/remark", {
        method: "PUT",
        token: patient.token,
        body: { id: appointmentId, remarks: "Unauthorized" },
        status: 403,
      });
      await request("/api/appointments/remark", {
        method: "PUT",
        token: therapist.token,
        body: { id: appointmentId, remarks: "Follow up" },
      });
    },
  );
  await check(
    "rescheduling availability, authorization and persistence",
    async () => {
      await request(`/api/appointments/${appointmentId}/reschedule`, {
        method: "PUT",
        token: outsider.token,
        body: { date, time: "11:00" },
        status: 404,
      });
      await request(`/api/appointments/${appointmentId}/reschedule`, {
        method: "PUT",
        token: patient.token,
        body: { date, time: "10:00" },
        status: 409,
      });
      await request(`/api/appointments/${appointmentId}/reschedule`, {
        method: "PUT",
        token: patient.token,
        body: { date, time: "11:00" },
      });
      const [rows] = await db.query(
        "SELECT time FROM appointments WHERE ID=?",
        [appointmentId],
      );
      assert.equal(rows[0].time, "11:00:00");
    },
  );
  await check("community privacy and reaction replacement", async () => {
    await request("/api/community/message", {
      method: "POST",
      token: patient.token,
      body: { message: { content: "Community test", isAnonymous: true } },
    });
    const history = await request("/api/community/messages");
    postId = history.messages[0].ID;
    assert.equal(history.messages[0].Name, "Anonymous");
    assert.equal(history.messages[0].ipAddress, undefined);
    assert.equal(history.messages[0].userID, undefined);
    await request(`/api/community/posts/${postId}/react`, {
      method: "POST",
      token: outsider.token,
      body: { reaction: "heart" },
    });
    await request(`/api/community/posts/${postId}/react`, {
      method: "POST",
      token: outsider.token,
      body: { reaction: "support" },
    });
    const [reactions] = await db.query(
      "SELECT * FROM reactions WHERE messageID=?",
      [postId],
    );
    assert.equal(reactions.length, 1);
    assert.equal(reactions[0].reaction, "support");
  });
  await check(
    "community post aliases and owner deletion clean reactions",
    async () => {
      await request("/api/community/posts", {
        method: "POST",
        token: patient.token,
        body: { content: "Delete this post", isAnonymous: false },
      });
      const posts = await request("/api/community/posts", {
        token: patient.token,
      });
      const post = posts.messages.find(
        (message) => message.content === "Delete this post",
      );
      assert.ok(post);
      await request(`/api/community/posts/${post.ID}/react`, {
        method: "POST",
        token: outsider.token,
        body: { reaction: "support" },
      });
      await request(`/api/community/posts/${post.ID}`, {
        method: "DELETE",
        token: outsider.token,
        status: 404,
      });
      await request(`/api/community/posts/${post.ID}`, {
        method: "DELETE",
        token: patient.token,
      });
      const [reactions] = await db.query(
        "SELECT ID FROM reactions WHERE messageID=?",
        [post.ID],
      );
      assert.equal(reactions.length, 0);
    },
  );
  await check(
    "guest pseudonyms, anonymous defaults, quotas and ownership",
    async () => {
      await request("/api/community/message", {
        method: "POST",
        body: {
          message: {
            content: "Guest named post",
            isAnonymous: false,
            usedName: " Guest Alias ",
          },
        },
      });
      await request("/api/community/posts", {
        method: "POST",
        body: { content: "Guest default anonymous" },
      });
      const limited = await request("/api/community/posts", {
        method: "POST",
        body: { content: "Guest third post" },
      });
      assert.equal(limited.success, false);
      const history = await request("/api/community/messages");
      const named = history.messages.find(
        (message) => message.content === "Guest named post",
      );
      assert.equal(named.Name, "Guest Alias");
      assert.equal(named.isOwn, true);
      assert.equal(named.ipAddress, undefined);
      assert.equal(
        history.messages.find(
          (message) => message.content === "Guest default anonymous",
        ).Name,
        "Anonymous",
      );
      await request(`/api/community/posts/${named.ID}`, {
        method: "DELETE",
        token: outsider.token,
        status: 404,
      });
      await request(`/api/community/posts/${named.ID}`, { method: "DELETE" });
    },
  );
  await check("chat session commands and cross-account ownership", async () => {
    const first = await request("/api/chatbot/message", {
      method: "POST",
      token: patient.token,
      body: { message: { text: "First turn" } },
    });
    assert.equal(first.botReply.chatID, first.chatId);
    const second = await request("/api/chatbot/message", {
      method: "POST",
      token: patient.token,
      body: { message: { text: "Second turn", chatID: first.botReply.chatID } },
    });
    assert.equal(second.chatId, first.chatId);
    const beforeFailure = await request("/api/chatbot/messages", {
      token: patient.token,
    });
    assert.equal(beforeFailure.messages.length, 4);
    await request("/api/chatbot/message", {
      method: "POST",
      token: patient.token,
      body: { message: { text: "__provider_failure__" } },
      status: 502,
    });
    assert.deepEqual(
      (await request("/api/chatbot/messages", { token: patient.token }))
        .messages,
      beforeFailure.messages,
    );
    const [sessions] = await db.query(
      "SELECT ID FROM chatbotchats WHERE userID=?",
      [patient.user.id],
    );
    assert.equal(
      sessions.length,
      1,
      "failed provider does not hide existing history with empty session",
    );
    const chat = await request("/api/chatbot/message", {
      method: "POST",
      token: patient.token,
      body: { message: { text: "/newc" } },
    });
    assert.ok(chat.chatId);
    await request("/api/chatbot/message", {
      method: "POST",
      token: outsider.token,
      body: { message: { text: "hello", chatID: chat.chatId } },
      status: 404,
    });
    assert.deepEqual(
      (await request("/api/chatbot/messages", { token: patient.token }))
        .messages,
      [],
    );
    await request("/api/chatbot/message", {
      method: "POST",
      token: patient.token,
      body: { message: { text: "/newnc" } },
    });
    const [contexts] = await db.query(
      "SELECT isUsable FROM usercontext WHERE userID=?",
      [patient.user.id],
    );
    assert.ok(
      contexts.length > 0 &&
        contexts.every((context) => context.isUsable === 0),
    );
  });
  await check("cancellation authorization and state", async () => {
    await request(`/api/appointments/${appointmentId}`, {
      method: "DELETE",
      token: outsider.token,
      status: 404,
    });
    await request(`/api/appointments/${appointmentId}`, {
      method: "DELETE",
      token: patient.token,
    });
    const appointments = (
      await request("/api/appointments/user", { token: patient.token })
    ).appointments;
    assert.equal(
      appointments.find((appointment) => appointment.ID === appointmentId)
        .status,
      "cancelled",
    );
  });
  await check("password change and transactional account cleanup", async () => {
    await request("/api/user/password", {
      method: "PUT",
      token: patient.token,
      body: {
        currentPassword: account.password,
        newPassword: "ChangedPass123!",
      },
    });
    assert.equal(
      (
        await request("/api/auth/login", {
          method: "POST",
          body: { email: account.email, password: "ChangedPass123!" },
        })
      ).success,
      true,
    );
    await request("/api/user/account", {
      method: "DELETE",
      token: patient.token,
      body: { password: "ChangedPass123!" },
    });
    const [users] = await db.query("SELECT ID FROM users WHERE ID=?", [
      patient.user.id,
    ]);
    assert.equal(users.length, 0);
    const [messages] = await db.query(
      "SELECT userID,isAnonymous FROM messages WHERE ID=?",
      [postId],
    );
    assert.equal(messages[0].userID, null);
    assert.equal(messages[0].isAnonymous, 1);
  });
  process.stdout.write(
    `${results.length} integration groups passed. Real MySQL + Express + Flask HTTP; model fixture, no Gemini generation.\n`,
  );
}

main()
  .catch((error) => {
    process.stderr.write(`${error.stack}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (runtime) await new Promise((resolve) => runtime.io.close(resolve));
    if (db) await db.end();
    if (pythonProcess && pythonProcess.exitCode == null) {
      pythonProcess.kill();
      await once(pythonProcess, "exit");
    }
    if (admin) {
      await admin.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
      await admin.query(`DROP DATABASE IF EXISTS \`${migrationDbName}\``);
      await admin.end();
    }
  });
