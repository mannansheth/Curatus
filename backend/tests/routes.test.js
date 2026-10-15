const { test, beforeEach, after } = require("node:test"),
  assert = require("node:assert/strict"),
  request = require("supertest"),
  jwt = require("jsonwebtoken"),
  bcrypt = require("bcryptjs");
process.env.JWT_SECRET = "isolated-test-secret";
const dbPath = require.resolve("../config/dbConfig");
let calls = [],
  queue = [];
const db = {
  query: async (sql, params) => {
    calls.push({ sql, params });
    if (!queue.length) throw new Error("Unexpected query: " + sql);
    const value = queue.shift();
    if (value instanceof Error) throw value;
    return [value];
  },
  getConnection: async () => ({
    ...db,
    beginTransaction: async () => calls.push({ tx: "begin" }),
    commit: async () => calls.push({ tx: "commit" }),
    rollback: async () => calls.push({ tx: "rollback" }),
    release: () => calls.push({ tx: "release" }),
  }),
};
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: db,
};
let chatbot = {
  chatbotResponse: "Helpful response",
  newUserContext: "Updated context",
  threatLevel: "moderate",
};
const chatbotPath = require.resolve("../services/chatbot");
require.cache[chatbotPath] = {
  id: chatbotPath,
  filename: chatbotPath,
  loaded: true,
  exports: async () => {
    if (chatbot instanceof Error) throw chatbot;
    return chatbot;
  },
};
const axios = require("axios");
let analysis;
axios.post = async (...args) => {
  calls.push({ analysis: args });
  if (analysis instanceof Error) throw analysis;
  return { data: analysis };
};
const { createApp } = require("../server");
const app = createApp();
const token = (id = 1, role = "user") =>
  jwt.sign({ id, role }, process.env.JWT_SECRET);
const api = (method, url, body, id = 1) => {
  let req = request(app)
    [method](url)
    .set("Authorization", "Bearer " + token(id));
  return body === undefined ? req : req.send(body);
};
beforeEach(() => {
  calls = [];
  queue = [];
  analysis = {
    success: true,
    result: { mood: "Neutral", score: 5, emoji: "🙂" },
  };
  chatbot = {
    chatbotResponse: "Helpful response",
    newUserContext: "Updated context",
    threatLevel: "moderate",
  };
});
test("health, route fallback and malformed JSON are uniform", async () => {
  assert.equal((await request(app).get("/health")).body.status, "ok");
  assert.equal((await request(app).get("/missing")).status, 404);
  assert.equal(
    (
      await request(app)
        .post("/api/auth/login")
        .set("Content-Type", "application/json")
        .send("{")
    ).status,
    400,
  );
});
test("authentication rejects absent, malformed, invalid and wrong-algorithm tokens", async () => {
  for (const header of [
    null,
    "Basic abc",
    "Bearer broken",
    "Bearer " + jwt.sign({ id: 1 }, "wrong"),
  ]) {
    let r = request(app).get("/api/user/stats");
    if (header) r = r.set("Authorization", header);
    assert.ok([401, 403].includes((await r).status));
  }
  const bad = jwt.sign({ id: 0 }, process.env.JWT_SECRET);
  assert.equal(
    (
      await request(app)
        .get("/api/user/stats")
        .set("Authorization", "Bearer " + bad)
    ).status,
    403,
  );
  assert.equal(calls.length, 0);
});
test("signup validates input and prevents duplicates", async () => {
  assert.equal(
    (await api("post", "/api/auth/signup", { email: "bad" })).status,
    400,
  );
  queue = [[{ ID: 2 }]];
  assert.equal(
    (
      await api("post", "/api/auth/signup", {
        name: "A",
        email: "a@test.dev",
        password: "password123",
      })
    ).status,
    400,
  );
});
test("signup hashes password and commits normalized account", async () => {
  queue = [[], { insertId: 8 }];
  const r = await api("post", "/api/auth/signup", {
    name: " Alice ",
    email: "ALICE@test.dev",
    password: "password123",
  });
  assert.equal(r.status, 201);
  assert.equal(r.body.user.id, 8);
  assert.equal(r.body.user.email, "alice@test.dev");
  const insert = calls.find((c) => c.sql?.includes("INSERT INTO users"));
  assert.ok(await bcrypt.compare("password123", insert.params[2]));
  assert.ok(calls.some((c) => c.tx === "commit"));
  assert.equal(jwt.verify(r.body.token, process.env.JWT_SECRET).id, 8);
});
test("signup transaction rolls back failure", async () => {
  queue = [[], new Error("insert failed")];
  assert.equal(
    (
      await api("post", "/api/auth/signup", {
        name: "A",
        email: "a@test.dev",
        password: "password123",
      })
    ).status,
    500,
  );
  assert.ok(calls.some((c) => c.tx === "rollback"));
  assert.ok(calls.some((c) => c.tx === "release"));
});
test("therapist registration validates availability and atomically creates profile", async () => {
  const b = {
    name: "T",
    email: "t@test.dev",
    password: "password123",
    phone: "123",
    specialization: "Anxiety",
    yearsOfExperience: 2,
    bio: "bio",
    city: "City",
    consultationFee: 100,
    mode: "online",
    availableDays: ["Mon"],
    startTime: "09:00",
    endTime: "17:00",
  };
  assert.equal(
    (
      await api("post", "/api/auth/therapist-signup", {
        ...b,
        availableDays: [],
      })
    ).status,
    400,
  );
  queue = [[], { insertId: 9 }, { insertId: 1 }];
  const r = await api("post", "/api/auth/therapist-signup", b);
  assert.equal(r.status, 201);
  assert.equal(r.body.user.role, "therapist");
  assert.ok(calls.some((c) => c.sql?.includes("INSERT INTO therapists")));
});
test("login handles missing user, wrong password and therapist role", async () => {
  assert.equal((await api("post", "/api/auth/login", {})).status, 400);
  queue = [[]];
  assert.equal(
    (
      await api("post", "/api/auth/login", {
        email: "a@test.dev",
        password: "password123",
      })
    ).body.success,
    false,
  );
  queue = [[{ ID: 1, Password: await bcrypt.hash("correct123", 4) }]];
  assert.equal(
    (
      await api("post", "/api/auth/login", {
        email: "a@test.dev",
        password: "wrong123",
      })
    ).body.type,
    "password",
  );
  queue = [
    [
      {
        ID: 1,
        Name: "A",
        Email: "a@test.dev",
        Password: await bcrypt.hash("correct123", 4),
      },
    ],
    [{ 1: 1 }],
  ];
  const r = await api("post", "/api/auth/login", {
    email: "a@test.dev",
    password: "correct123",
  });
  assert.equal(r.body.user.role, "therapist");
  assert.ok(!r.body.user.Password);
});
test("me resolves persisted user and role", async () => {
  queue = [[{ id: 1, name: "Alice", email: "a@test.dev" }], []];
  assert.equal((await api("get", "/api/auth/me")).body.role, "user");
  queue = [[]];
  assert.equal((await api("get", "/api/auth/me")).status, 404);
});
test("stats and profile scoped to authenticated identity", async () => {
  queue = [[{ ID: 2 }], []];
  assert.equal((await api("get", "/api/user/stats")).body.hasSubmitted, false);
  assert.deepEqual(calls[0].params, [1]);
  queue = [[{ name: "A", journalEntries: 0 }]];
  assert.equal(
    (await api("get", "/api/user/profile")).body.userData.journalEntries,
    0,
  );
  queue = [[]];
  assert.equal((await api("get", "/api/user/profile")).status, 404);
});
test("assessment validates complete scores and saves JSON", async () => {
  for (const data of [null, [], {}, { anxiety: 9 }])
    assert.equal(
      (await api("post", "/api/user/assessment", { data })).status,
      400,
    );
  const data = Object.fromEntries(
    [
      "anxiety",
      "sleep",
      "mood",
      "stress",
      "social",
      "energy",
      "focus",
      "hope",
    ].map((k) => [k, 2]),
  );
  queue = [{ insertId: 1 }];
  assert.equal(
    (await api("post", "/api/user/assessment", { data })).body.success,
    true,
  );
  assert.deepEqual(JSON.parse(calls[0].params[1]), data);
});
test("profile update validation and conflicting email", async () => {
  assert.equal(
    (await api("put", "/api/user/profile", { name: "A", email: "no" })).status,
    400,
  );
  queue = [{ affectedRows: 1 }];
  assert.equal(
    (
      await api("put", "/api/user/profile", {
        name: " A ",
        email: "A@test.dev",
      })
    ).body.success,
    true,
  );
  assert.equal(calls[0].params[0], "A");
  queue = [Object.assign(new Error(), { code: "ER_DUP_ENTRY" })];
  assert.equal(
    (await api("put", "/api/user/profile", { name: "A", email: "a@test.dev" }))
      .status,
    409,
  );
});
test("password change verifies current password and hashes replacement", async () => {
  assert.equal(
    (await api("put", "/api/user/password", { newPassword: "short" })).status,
    400,
  );
  queue = [[]];
  assert.equal(
    (
      await api("put", "/api/user/password", {
        currentPassword: "old12345",
        newPassword: "new12345",
      })
    ).status,
    403,
  );
  queue = [
    [{ Password: await bcrypt.hash("old12345", 4) }],
    { affectedRows: 1 },
  ];
  assert.equal(
    (
      await api("put", "/api/user/password", {
        currentPassword: "old12345",
        newPassword: "new12345",
      })
    ).body.success,
    true,
  );
  assert.ok(
    await bcrypt.compare(
      "new12345",
      calls.find((c) => c.sql?.includes("UPDATE users")).params[0],
    ),
  );
});
test("account deletion requires password and runs dependency cleanup transaction", async () => {
  assert.equal((await api("delete", "/api/user/account", {})).status, 400);
  queue = [[]];
  assert.equal(
    (await api("delete", "/api/user/account", { password: "password123" }))
      .status,
    403,
  );
  queue = [
    [{ Password: await bcrypt.hash("password123", 4) }],
    ...Array(13).fill({ affectedRows: 1 }),
  ];
  const r = await api("delete", "/api/user/account", {
    password: "password123",
  });
  assert.equal(r.status, 200);
  assert.ok(calls.some((c) => c.tx === "commit"));
  assert.ok(
    calls.some((c) => c.sql?.includes("UPDATE messages SET userID=NULL")),
  );
});
test("journal validates content, analysis failure and persisted returned id", async () => {
  assert.equal((await api("post", "/api/journal/addEntry", {})).status, 400);
  analysis = new Error("down");
  assert.equal(
    (await api("post", "/api/journal/addEntry", { content: "Today was hard" }))
      .status,
    502,
  );
  analysis = {
    success: true,
    result: { mood: "Neutral", score: 5, emoji: "🙂" },
  };
  queue = [{ insertId: 44 }];
  const r = await api("post", "/api/journal/addEntry", {
    content: "Today was hard",
    id: "client",
  });
  assert.equal(r.body.entry.id, 44);
  assert.equal(calls.find((c) => c.analysis).analysis[2].timeout, 30000);
});
test("journal rejects malformed analysis and lists scoped entries", async () => {
  for (const result of [
    null,
    { mood: "x", score: 0, emoji: "x" },
    { mood: "Neutral", score: true, emoji: "x" },
  ]) {
    analysis = { success: true, result };
    assert.equal(
      (await api("post", "/api/journal/addEntry", { content: "hello" })).status,
      502,
    );
  }
  queue = [[{ ID: 1 }]];
  assert.equal(
    (await api("get", "/api/journal/entries")).body.entries.length,
    1,
  );
  assert.deepEqual(calls.at(-1).params, [1]);
});
test("public therapist defaults and detail queries exclude password", async () => {
  queue = [[]];
  assert.equal((await request(app).get("/api/therapist/all")).status, 200);
  assert.ok(!calls[0].sql.includes("SELECT *"));
  assert.equal(calls[0].params.st, "");
  assert.equal(
    (await request(app).get("/api/therapist/all?maxFee=-1")).status,
    400,
  );
  assert.equal((await request(app).get("/api/therapist/no")).status, 400);
  queue = [[]];
  assert.equal((await request(app).get("/api/therapist/2")).status, 404);
  queue = [[{ ID: 2, Name: "Therapist" }]];
  assert.equal(
    (await request(app).get("/api/therapist/2")).body.therapist.ID,
    2,
  );
});
test("chatbot rejects invalid input, unknown and another user chat", async () => {
  assert.equal((await api("post", "/api/chatbot/message", {})).status, 400);
  queue = [[]];
  assert.equal(
    (
      await api("post", "/api/chatbot/message", {
        message: { text: "hello", chatID: 9 },
      })
    ).status,
    404,
  );
  assert.equal(
    (await api("get", "/api/chatbot/messages?chatID=bad")).status,
    400,
  );
});
test("chatbot commands create chats and reset usable context", async () => {
  queue = [{ insertId: 10 }];
  assert.equal(
    (await api("post", "/api/chatbot/message", { message: { text: "/newc" } }))
      .body.chatId,
    10,
  );
  queue = [{ insertId: 11 }, { affectedRows: 1 }];
  assert.equal(
    (await api("post", "/api/chatbot/message", { message: { text: "/newnc" } }))
      .body.chatId,
    11,
  );
  assert.deepEqual(
    calls.find((c) => c.sql?.includes("isUsable = 0")).params,
    [1],
  );
});
test("chatbot conversation awaits atomic persistence and returns chat id", async () => {
  queue = [
    [{ summary: "Earlier" }],
    { insertId: 10 },
    { insertId: 1 },
    { insertId: 2 },
    { insertId: 3 },
  ];
  const r = await api("post", "/api/chatbot/message", {
    message: { text: "I feel worried" },
  });
  assert.equal(r.body.chatId, 10);
  assert.equal(r.body.botReply.text, "Helpful response");
  assert.ok(calls.some((c) => c.tx === "commit"));
});
test("chatbot persistence rolls back and history isolates current user", async () => {
  queue = [[], { insertId: 10 }, new Error("db failure")];
  assert.equal(
    (await api("post", "/api/chatbot/message", { message: { text: "hello" } }))
      .status,
    500,
  );
  assert.ok(calls.some((c) => c.tx === "rollback"));
  queue = [[]];
  assert.equal((await api("get", "/api/chatbot/messages")).status, 200);
  assert.deepEqual(calls.at(-1).params, [1, null, 1]);
});
test("community validates before moderation and rejects invalid token", async () => {
  assert.equal(
    (await request(app).post("/api/community/message").send({})).status,
    400,
  );
  assert.equal(
    (
      await request(app)
        .get("/api/community/messages")
        .set("Authorization", "Bearer bad")
    ).status,
    403,
  );
});
test("community rate limit numeric count and authenticated anonymous ownership", async () => {
  queue = [[{ count: 5 }]];
  assert.equal(
    (
      await api("post", "/api/community/message", {
        message: { content: "hello" },
      })
    ).body.success,
    false,
  );
  queue = [[{ count: 0 }], { insertId: 1 }];
  assert.equal(
    (
      await api("post", "/api/community/message", {
        message: { content: "hello", isAnonymous: true },
      })
    ).body.success,
    true,
  );
  assert.equal(calls.at(-1).params[1], 1);
  assert.equal(calls.at(-1).params[3], 1);
  queue = [[{ count: 2 }]];
  assert.equal(
    (
      await request(app)
        .post("/api/community/message")
        .send({ message: { content: "hello" } })
    ).body.success,
    false,
  );
});
test("community aggregates reactions, omits private identities and handles guest ownership", async () => {
  queue = [
    [
      {
        ID: 1,
        userID: 1,
        ipAddress: null,
        reactions: "❤️,❤️,🙂",
        isAnonymous: 1,
      },
    ],
  ];
  const r = await api("get", "/api/community/messages");
  assert.equal(r.body.messages[0].isOwn, true);
  assert.equal(r.body.messages[0].reactions["❤️"], 2);
  assert.ok(!("userID" in r.body.messages[0]));
  assert.ok(!("ipAddress" in r.body.messages[0]));
});
test("community reaction validates, detects missing post and updates existing single reaction", async () => {
  assert.equal(
    (await api("post", "/api/community/posts/1/react", { reaction: "a,b" }))
      .status,
    400,
  );
  queue = [[]];
  assert.equal(
    (await api("post", "/api/community/posts/1/react", { reaction: "🙂" }))
      .status,
    404,
  );
  queue = [[{ ID: 1 }], [{ ID: 1 }], [{ ID: 8 }], { affectedRows: 1 }, []];
  assert.equal(
    (await api("post", "/api/community/posts/1/react", { reaction: "🙂" })).body
      .success,
    true,
  );
  assert.ok(calls.some((c) => c.sql?.includes("UPDATE reactions")));
});
const apt = {
  ID: 1,
  userID: 1,
  therapistID: 2,
  patientName: "P",
  therapistName: "T",
  status: "upcoming",
};
test("appointment access rejects nonparticipants and invalid ids", async () => {
  for (const [method, url, body] of [
    ["get", "/api/appointments/chat/messages?aptId=1"],
    [
      "post",
      "/api/appointments/chat/message",
      { aptId: 1, message: { content: "hello" } },
    ],
    ["delete", "/api/appointments/1"],
    ["put", "/api/appointments/remark", { id: 1, remarks: "hello" }],
  ]) {
    queue = [[]];
    assert.equal((await api(method, url, body)).status, 404);
    assert.ok(calls.at(-1).sql.includes("(a.userID=? OR a.therapistID=?)"));
  }
  assert.equal(
    (await api("get", "/api/appointments/chat/messages?aptId=bad")).status,
    400,
  );
});
test("appointment remarks restricted to assigned therapist", async () => {
  queue = [[apt]];
  assert.equal(
    (await api("put", "/api/appointments/remark", { id: 1, remarks: "hello" }))
      .status,
    403,
  );
  queue = [[apt], { affectedRows: 1 }];
  assert.equal(
    (
      await api(
        "put",
        "/api/appointments/remark",
        { id: 1, remarks: "hello" },
        2,
      )
    ).body.success,
    true,
  );
});
test("appointment chat marks incoming messages and computes ownership", async () => {
  queue = [
    [apt],
    { affectedRows: 1 },
    [
      { sentBy: 1, content: "hello" },
      { sentBy: 2, content: "reply" },
    ],
  ];
  const r = await api("get", "/api/appointments/chat/messages?aptId=1");
  assert.equal(r.body.chatWith, "T");
  assert.deepEqual(
    r.body.messages.map((m) => m.isOwn),
    [true, false],
  );
  assert.ok(calls[1].sql.includes("sentBy != ?"));
  queue = [[apt], { insertId: 1 }];
  assert.equal(
    (
      await api("post", "/api/appointments/chat/message", {
        aptId: 1,
        message: { content: "hello" },
      })
    ).body.success,
    true,
  );
  queue = [[{ ...apt, status: "cancelled" }]];
  assert.equal(
    (
      await api("post", "/api/appointments/chat/message", {
        aptId: 1,
        message: { content: "hello" },
      })
    ).status,
    409,
  );
});
test("appointment cancellation, both lists and unavailable slots", async () => {
  queue = [[{ ...apt, status: "completed" }]];
  assert.equal((await api("delete", "/api/appointments/1")).status, 409);
  queue = [[apt], { affectedRows: 1 }];
  assert.equal((await api("delete", "/api/appointments/1")).body.success, true);
  for (const role of ["user", "therapist"]) {
    queue = [{ affectedRows: 0 }, [apt]];
    assert.equal(
      (await api("get", "/api/appointments/" + role)).body.appointments.length,
      1,
    );
  }
  assert.equal(
    (await api("get", "/api/appointments/slots?therapistId=2&date=2026-99-99"))
      .status,
    400,
  );
  queue = [[]];
  assert.equal(
    (await api("get", "/api/appointments/slots?therapistId=2&date=2099-01-05"))
      .status,
    404,
  );
  queue = [
    [{ startTime: "09:00:00", endTime: "12:00:00", availableDays: "Tuesday" }],
  ];
  assert.deepEqual(
    (await api("get", "/api/appointments/slots?therapistId=2&date=2099-01-05"))
      .body.slots,
    [],
  );
});
test("appointment booking validates, rejects conflicts, locks and commits available slot", async () => {
  assert.equal(
    (
      await api("post", "/api/appointments/book", {
        therapistId: 1,
        date: "2099-01-05",
        time: "09:00",
      })
    ).status,
    400,
  );
  const body = { therapistId: 2, date: "2099-01-05", time: "09:00" };
  const profile = {
    startTime: "09:00:00",
    endTime: "12:00:00",
    availableDays: "Monday",
  };
  queue = [[{ ID: 1 }, { ID: 2 }], [profile], [{ ID: 9 }]];
  assert.equal((await api("post", "/api/appointments/book", body)).status, 409);
  assert.ok(calls.some((c) => c.tx === "rollback"));
  queue = [[{ ID: 1 }, { ID: 2 }], [profile], [], { insertId: 7 }];
  const r = await api("post", "/api/appointments/book", body);
  assert.equal(r.body.id, 7);
  assert.ok(calls.some((c) => c.sql?.includes("FOR UPDATE")));
  assert.ok(calls.some((c) => c.tx === "commit"));
});

test("missing, null, arrays and non-JSON request bodies are rejected before handlers", async () => {
  const paths = [
    "/api/auth/signup",
    "/api/auth/login",
    "/api/auth/therapist-signup",
    "/api/user/assessment",
    "/api/journal/addEntry",
    "/api/chatbot/message",
    "/api/community/message",
    "/api/appointments/book",
    "/api/mood/analyze",
  ];
  for (const path of paths) {
    assert.equal((await api("post", path)).status, 400);
    assert.equal((await api("post", path, [])).status, 400);
    assert.equal(
      (
        await request(app)
          .post(path)
          .set("Authorization", "Bearer " + token())
          .set("Content-Type", "application/json")
          .send("null")
      ).status,
      400,
    );
  }
  assert.equal(calls.length, 0);
});
test("password validation rejects overlong UTF8 input before bcrypt truncation", async () => {
  assert.equal(
    (
      await api("post", "/api/auth/signup", {
        name: "A",
        email: "a@test.dev",
        password: "é".repeat(37),
      })
    ).status,
    400,
  );
  assert.equal(calls.length, 0);
});
test("journal deletion scopes entry ownership", async () => {
  assert.equal((await api("delete", "/api/journal/bad")).status, 400);
  queue = [{ affectedRows: 0 }];
  assert.equal((await api("delete", "/api/journal/2")).status, 404);
  queue = [{ affectedRows: 1 }];
  assert.equal((await api("delete", "/api/journal/2")).body.success, true);
  assert.deepEqual(calls.at(-1).params, ["2", 1]);
});
test("stateless logout acknowledges frontend token removal", async () => {
  assert.equal((await api("post", "/api/auth/logout")).body.success, true);
});
test("mood history and analysis preserve service contract without persistence", async () => {
  queue = [[{ ID: 1, score: 6 }]];
  assert.equal(
    (await api("get", "/api/mood/history")).body.entries[0].score,
    6,
  );
  assert.equal((await api("post", "/api/mood/analyze", {})).status, 400);
  analysis = new Error("down");
  assert.equal(
    (await api("post", "/api/mood/analyze", { text: "hello" })).status,
    502,
  );
  analysis = {
    success: true,
    result: { mood: "Neutral", score: true, emoji: "x" },
  };
  assert.equal(
    (await api("post", "/api/mood/analyze", { text: "hello" })).status,
    502,
  );
  analysis = {
    success: true,
    result: { mood: "Neutral", score: 5, emoji: "x" },
  };
  assert.equal(
    (await api("post", "/api/mood/analyze", { text: "hello" })).body.result
      .score,
    5,
  );
});
test("community post aliases and ownership deletion work", async () => {
  queue = [[{ count: 0 }], { insertId: 1 }];
  assert.equal(
    (
      await api("post", "/api/community/posts", {
        content: "hello",
        isAnonymous: false,
      })
    ).body.success,
    true,
  );
  queue = [[]];
  assert.equal((await api("get", "/api/community/posts")).status, 200);
  queue = [[{ userID: 2 }]];
  assert.equal((await api("delete", "/api/community/posts/1")).status, 404);
  queue = [[{ userID: 1 }], { affectedRows: 1 }, { affectedRows: 1 }];
  assert.equal(
    (await api("delete", "/api/community/posts/1")).body.success,
    true,
  );
  assert.ok(calls.some((c) => c.tx === "commit"));
  queue = [[{ userID: 1 }], new Error("cleanup error")];
  assert.equal((await api("delete", "/api/community/posts/1")).status, 500);
  assert.ok(calls.some((c) => c.tx === "rollback"));
});
test("appointment slots detect offset overlaps and expired appointment mutations", async () => {
  queue = [
    [{ startTime: "09:30:00", endTime: "12:30:00", availableDays: "Monday" }],
    [{ time: "09:00:00" }],
  ];
  const r = await api(
    "get",
    "/api/appointments/slots?therapistId=2&date=2099-01-05",
  );
  assert.deepEqual(
    r.body.slots.map((x) => x.booked),
    [true, false, false],
  );
  queue = [[{ ...apt, date: "2020-01-01", time: "09:00:00" }]];
  assert.equal((await api("delete", "/api/appointments/1")).status, 409);
  queue = [[{ ...apt, date: "2020-01-01", time: "09:00:00" }]];
  assert.equal(
    (
      await api("put", "/api/appointments/1/reschedule", {
        date: "2099-01-05",
        time: "09:00",
      })
    ).status,
    409,
  );
});
test("reschedule validates owner, state, availability, conflicts and commits update", async () => {
  const body = { date: "2099-01-05", time: "09:00" },
    profile = {
      startTime: "09:00:00",
      endTime: "12:00:00",
      availableDays: "Monday",
    };
  assert.equal(
    (
      await api("put", "/api/appointments/1/reschedule", {
        ...body,
        time: "24:00",
      })
    ).status,
    400,
  );
  queue = [[]];
  assert.equal(
    (await api("put", "/api/appointments/1/reschedule", body)).status,
    404,
  );
  queue = [[apt]];
  assert.equal(
    (await api("put", "/api/appointments/1/reschedule", body, 2)).status,
    403,
  );
  queue = [[{ ...apt, status: "cancelled" }]];
  assert.equal(
    (await api("put", "/api/appointments/1/reschedule", body)).status,
    409,
  );
  queue = [[apt], [], [{ status: "completed" }]];
  assert.equal(
    (await api("put", "/api/appointments/1/reschedule", body)).status,
    409,
  );
  queue = [
    [apt],
    [],
    [{ status: "upcoming" }],
    [{ ...profile, availableDays: "Tuesday" }],
  ];
  assert.equal(
    (await api("put", "/api/appointments/1/reschedule", body)).status,
    400,
  );
  queue = [[apt], [], [{ status: "upcoming" }], [profile], [{ ID: 4 }]];
  assert.equal(
    (await api("put", "/api/appointments/1/reschedule", body)).status,
    409,
  );
  queue = [
    [apt],
    [],
    [{ status: "upcoming" }],
    [profile],
    [],
    { affectedRows: 1 },
  ];
  assert.equal(
    (await api("put", "/api/appointments/1/reschedule", body)).body.success,
    true,
  );
  assert.ok(calls.some((c) => c.tx === "commit"));
  assert.ok(calls.some((c) => c.sql?.includes("ABS(TIME_TO_SEC")));
  queue = [[apt], new Error("lock failure")];
  assert.equal(
    (await api("put", "/api/appointments/1/reschedule", body)).status,
    500,
  );
  assert.ok(calls.some((c) => c.tx === "rollback"));
});
test("booking handles missing therapist, unavailable schedule and rollback", async () => {
  const body = { therapistId: 2, date: "2099-01-05", time: "09:00" };
  queue = [[], []];
  assert.equal((await api("post", "/api/appointments/book", body)).status, 404);
  queue = [
    [],
    [{ startTime: "09:00:00", endTime: "12:00:00", availableDays: "Tuesday" }],
  ];
  assert.equal((await api("post", "/api/appointments/book", body)).status, 400);
  queue = [new Error("lock failure")];
  assert.equal((await api("post", "/api/appointments/book", body)).status, 500);
  assert.ok(calls.some((c) => c.tx === "rollback"));
});
test("account deletion rollback preserves partial transaction on cleanup failure", async () => {
  queue = [
    [{ Password: await bcrypt.hash("password123", 4) }],
    new Error("cleanup failed"),
  ];
  assert.equal(
    (await api("delete", "/api/user/account", { password: "password123" }))
      .status,
    500,
  );
  assert.ok(calls.some((c) => c.tx === "rollback"));
});
test("community creates guest reactions and removes old duplicate records", async () => {
  queue = [[{ ID: 1 }], [{ ID: 1 }], [], { insertId: 1 }, []];
  assert.equal(
    (
      await request(app)
        .post("/api/community/posts/1/react")
        .send({ reaction: "🙂" })
    ).body.success,
    true,
  );
  const insert = calls.find((c) => c.sql?.includes("INSERT INTO reactions"));
  assert.equal(insert.params[0], null);
  assert.ok(insert.params[2]);
  queue = [
    [{ ID: 1 }],
    [{ ID: 1 }],
    [{ ID: 8 }, { ID: 9 }],
    { affectedRows: 1 },
    { affectedRows: 1 },
    [],
  ];
  assert.equal(
    (await api("post", "/api/community/posts/1/react", { reaction: "🙂" })).body
      .success,
    true,
  );
  assert.ok(calls.some((c) => c.sql?.includes("DELETE FROM reactions")));
  queue = [[{ ID: 1 }], new Error("lock failed")];
  assert.equal(
    (await api("post", "/api/community/posts/1/react", { reaction: "🙂" }))
      .status,
    500,
  );
  assert.ok(calls.some((c) => c.tx === "rollback"));
});

test("chatbot provider failure leaves prior history intact and command reset rolls back", async () => {
  queue = [[]];
  chatbot = Object.assign(new Error("Provider down"), { status: 502 });
  assert.equal(
    (await api("post", "/api/chatbot/message", { message: { text: "hello" } }))
      .status,
    502,
  );
  assert.equal(calls.filter((c) => c.sql?.includes("INSERT")).length, 0);
  chatbot = {
    chatbotResponse: "Hi",
    newUserContext: "context",
    threatLevel: "low",
  };
  queue = [new Error("insert failed")];
  assert.equal(
    (
      await api("post", "/api/chatbot/message", {
        message: { text: " /newnc " },
      })
    ).status,
    500,
  );
  assert.ok(calls.some((c) => c.tx === "rollback"));
});
test("moderation rejects banned words consistently across private routes", async () => {
  assert.equal(
    (await api("post", "/api/chatbot/message", { message: { text: "bc" } }))
      .body.success,
    false,
  );
  assert.equal(
    (
      await api("post", "/api/community/message", {
        message: { content: "bc" },
      })
    ).body.success,
    false,
  );
  queue = [[apt]];
  assert.equal(
    (
      await api("post", "/api/appointments/chat/message", {
        aptId: 1,
        message: { content: "bc" },
      })
    ).body.success,
    false,
  );
});

test("guest display pseudonym respects explicit choice while private IP retains ownership", async () => {
  queue = [[{ count: 0 }], { insertId: 1 }];
  const named = await request(app)
    .post("/api/community/message")
    .send({
      message: {
        content: "hello everyone",
        isAnonymous: false,
        usedName: "  River  ",
      },
    });
  assert.equal(named.body.success, true);
  const insert = calls.find((c) => c.sql?.includes("INSERT INTO messages"));
  assert.equal(insert.params[1], null);
  assert.ok(insert.params[2]);
  assert.equal(insert.params[3], 0);
  assert.equal(insert.params[4], "River");
  queue = [
    [
      {
        ID: 1,
        Name: "River",
        userID: null,
        ipAddress: insert.params[2],
        isAnonymous: 0,
        reactions: null,
      },
    ],
  ];
  const listed = await request(app).get("/api/community/messages");
  assert.equal(listed.body.messages[0].Name, "River");
  assert.equal(listed.body.messages[0].isOwn, true);
  assert.ok(!("ipAddress" in listed.body.messages[0]));
  queue = [[{ count: 0 }], { insertId: 2 }];
  assert.equal(
    (
      await request(app)
        .post("/api/community/message")
        .send({ message: { content: "default anonymous", usedName: "River" } })
    ).body.success,
    true,
  );
  const lastInsert = calls
    .filter((c) => c.sql?.includes("INSERT INTO messages"))
    .at(-1);
  assert.equal(lastInsert.params[3], 1);
  assert.equal(lastInsert.params[4], null);
  for (const message of [
    { content: "hello", isAnonymous: "false", usedName: "River" },
    { content: "hello", isAnonymous: false, usedName: " " },
    { content: "hello", isAnonymous: false, usedName: "x".repeat(101) },
  ])
    assert.equal(
      (await request(app).post("/api/community/message").send({ message }))
        .status,
      400,
    );
});

test("assessment reflection returns deterministic extremes, midpoint and reverse-coded hope", async () => {
  const keys = [
    "anxiety",
    "sleep",
    "mood",
    "stress",
    "social",
    "energy",
    "focus",
  ];
  const lowBurden = Object.fromEntries(keys.map((k) => [k, 0]));
  lowBurden.hope = 4;
  const highBurden = Object.fromEntries(keys.map((k) => [k, 4]));
  highBurden.hope = 0;
  const midpoint = Object.fromEntries([...keys, "hope"].map((k) => [k, 2]));
  const reflect = require("../lib/assessment");
  assert.equal(reflect(lowBurden).score, 100);
  assert.equal(reflect(highBurden).score, 0);
  assert.equal(reflect(midpoint).score, 50);
  assert.equal(reflect({ ...lowBurden, hope: 0 }).score, 88);
  assert.equal(reflect({ ...highBurden, hope: 4 }).score, 13);
  for (const data of [lowBurden, highBurden, midpoint]) {
    queue = [{ insertId: 1 }];
    const response = await api("post", "/api/user/assessment", { data });
    assert.equal(response.body.success, true);
    assert.deepEqual(
      { score: response.body.score, feedback: response.body.feedback },
      reflect(data),
    );
    assert.ok(response.body.feedback.length > 20);
    assert.deepEqual(JSON.parse(calls.at(-1).params[1]), data);
  }
});
