const { test, beforeEach } = require("node:test"),
  assert = require("node:assert/strict"),
  jwt = require("jsonwebtoken"),
  { io: client } = require("socket.io-client");
process.env.JWT_SECRET = "socket-test-secret";
const dbPath = require.resolve("../config/dbConfig");
let queue = [],
  calls = [];
const db = {
  query: async (sql, params) => {
    calls.push({ sql, params });
    const r = queue.shift();
    if (r instanceof Error) throw r;
    return [r || []];
  },
};
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: db,
};
const { createRuntime } = require("../server");
const v = require("../lib/validation"),
  slots = require("../lib/slots"),
  filter = require("../middleware/filterMessage");
beforeEach(() => {
  queue = [];
  calls = [];
});
test("validation boundaries reject wrong types, invalid calendar and zero ids", () => {
  assert.ok(v.text(" hello "));
  for (const x of [null, {}, [], 0, "   "]) assert.equal(v.text(x), false);
  for (const x of ["0", "-1", "1x", undefined]) assert.equal(v.id(x), false);
  assert.ok(v.id("123"));
  assert.equal(v.date("2026-02-30"), false);
  assert.ok(v.date("2028-02-29"));
  assert.equal(v.time("24:00"), false);
  assert.equal(v.time("09:00:01"), false);
  assert.equal(v.normalizeTime("09:00"), "09:00:00");
});
test("slots use full hours without exceeding closing time, availability checks weekday", () => {
  assert.deepEqual(slots.slots("09:30:00", "12:00:00"), [
    "09:30:00",
    "10:30:00",
  ]);
  assert.deepEqual(slots.slots("bad", "12:00"), []);
  assert.ok(slots.available({ availableDays: "Mon Wed" }, "2099-01-05"));
  assert.equal(slots.available({ availableDays: "Tue" }, "2099-01-05"), false);
});
test("moderation detects word boundaries, literal special characters and malformed input", () => {
  assert.equal(filter(undefined), true);
  assert.equal(filter("hello friend"), false);
  assert.equal(filter("bc"), true);
  assert.equal(filter("abcd"), false);
  assert.equal(filter("b.c."), true);
});
const event = (socket, name) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Timed out " + name)),
      3000,
    );
    socket.once(name, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
async function start() {
  const r = createRuntime();
  await new Promise((resolve) => r.httpServer.listen(0, "127.0.0.1", resolve));
  return { ...r, url: "http://127.0.0.1:" + r.httpServer.address().port };
}
async function close(r, socket) {
  socket?.disconnect();
  await new Promise((resolve) => r.io.close(resolve));
}
test("socket connection rejects unauthenticated clients", async () => {
  const r = await start();
  const socket = client(r.url, {
    transports: ["websocket"],
    reconnection: false,
  });
  try {
    assert.equal(
      (await event(socket, "connect_error")).message,
      "Authentication required",
    );
  } finally {
    await close(r, socket);
  }
});
test("socket rooms infer identity, deny foreign appointment, and mark only incoming read", async () => {
  const r = await start();
  const token = jwt.sign({ id: 1 }, process.env.JWT_SECRET),
    socket = client(r.url, {
      auth: { token },
      transports: ["websocket"],
      reconnection: false,
    });
  try {
    await event(socket, "connect");
    const serverSocket = [...r.io.sockets.sockets.values()][0];
    assert.ok(serverSocket.rooms.has("user_1"));
    socket.emit("join_user", 999);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(serverSocket.rooms.has("user_999"), false);
    queue = [[]];
    const denied = event(socket, "chat_error");
    socket.emit("join_chat", { aptId: 7, userId: 999 });
    await denied;
    assert.equal(serverSocket.rooms.has("apt_7"), false);
    queue = [[{ ID: 7, userID: 1, therapistID: 2 }]];
    const joined = event(socket, "user_joined");
    socket.emit("join_chat", { aptId: 7, userId: 999 });
    assert.equal(await joined, 1);
    assert.ok(serverSocket.rooms.has("apt_7"));
    await new Promise((resolve) =>
      socket.emit("leave_chat", { aptId: 7 }, resolve),
    );
    assert.equal(serverSocket.rooms.has("apt_7"), false);
    queue = [[{ ID: 7, userID: 1, therapistID: 2 }]];
    const rejoined = event(socket, "user_joined");
    socket.emit("join_chat", { aptId: 7 });
    await rejoined;
    queue = [[{ ID: 7, userID: 1, therapistID: 2 }], { affectedRows: 1 }];
    const read = event(socket, "messages_read");
    socket.emit("mark_read", { aptId: 7, userId: 999 });
    assert.equal((await read).readBy, 1);
    const update = calls.find((c) => c.sql.includes("UPDATE personalchats"));
    assert.deepEqual(update.params, [7, 1]);
    assert.ok(update.sql.includes("sentBy != ?"));
    queue = [new Error("DB down")];
    const error = event(socket, "chat_error");
    socket.emit("mark_read", { aptId: 7 });
    await error;
  } finally {
    await close(r, socket);
  }
});

test("serializer orders same-user work, allows independent users and releases failures", async () => {
  const serialize = require("../services/serialize"),
    order = [];
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const first = serialize("same", async () => {
    order.push("first");
    await gate;
    order.push("finished");
  });
  const second = serialize("same", async () => {
    order.push("second");
  });
  await serialize("different", async () => {
    order.push("other");
  });
  assert.deepEqual(order, ["first", "other"]);
  release();
  await Promise.all([first, second]);
  assert.deepEqual(order, ["first", "other", "finished", "second"]);
  await assert.rejects(
    serialize("same", async () => {
      throw new Error("failure");
    }),
  );
  assert.equal(await serialize("same", async () => 42), 42);
});
