require("dotenv").config();
const express = require("express"),
  cors = require("cors"),
  { createServer } = require("http"),
  { Server } = require("socket.io"),
  auth = require("./middleware/authenticateToken"),
  access = require("./services/appointmentAccess"),
  markRead = require("./services/UpdateMessageStatus");
function createApp(io) {
  const app = express();
  const origins = (
    process.env.CORS_ORIGINS || "http://localhost:3000,http://127.0.0.1:3000"
  )
    .split(",")
    .map((s) => s.trim());
  app.use(cors({ origin: origins, credentials: true }));
  app.use(express.json({ limit: "128kb" }));
  app.use((req, res, next) => {
    if (
      (["POST", "PUT", "PATCH"].includes(req.method) &&
        req.path !== "/api/auth/logout") ||
      (req.method === "DELETE" && req.path === "/api/user/account")
    ) {
      if (!req.body || typeof req.body !== "object" || Array.isArray(req.body))
        return res
          .status(400)
          .json({ success: false, message: "JSON object body required" });
    }
    next();
  });
  app.use((req, res, next) => {
    req.io = io || app.locals.io;
    next();
  });
  app.get("/health", (req, res) => res.json({ status: "ok" }));
  app.use("/api/auth", require("./routes/auth"));
  for (const name of ["user", "journal", "appointments", "chatbot"])
    app.use(
      "/api/" + name,
      auth,
      require("./routes/" + (name === "appointments" ? "appointment" : name)),
    );
  app.use("/api/community", require("./routes/community"));
  app.use("/api/mood", auth, require("./routes/mood"));
  app.use("/api/therapist", require("./routes/therapist"));
  app.use((req, res) => res.status(404).json({ message: "Route not found" }));
  app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    const status =
      err.status || (err.type === "entity.parse.failed" ? 400 : 500);
    if (status >= 500) console.error("Request failed:", err.code || err.name);
    res.status(status).json({
      success: false,
      message:
        status === 500
          ? "Internal server error"
          : status === 400
            ? "Invalid JSON request"
            : err.message,
    });
  });
  return app;
}
function configureSockets(io) {
  io.use((socket, next) => {
    try {
      const d = auth.decodeToken("Bearer " + socket.handshake.auth?.token);
      if (!d) throw new Error();
      socket.userId = d.id;
      next();
    } catch {
      next(new Error("Authentication required"));
    }
  });
  io.on("connection", (socket) => {
    socket.join("user_" + socket.userId);
    socket.on("join_user", () => socket.join("user_" + socket.userId));
    socket.on("leave_chat", (payload = {}, ack) => {
      if (payload && require("./lib/validation").id(payload.aptId))
        socket.leave("apt_" + payload.aptId);
      if (typeof ack === "function") ack({ success: true });
    });
    const guarded =
      (fn) =>
      async (payload = {}, ack) => {
        try {
          await fn(payload);
          if (typeof ack === "function") ack({ success: true });
        } catch {
          socket.emit("chat_error", { message: "Appointment unavailable" });
          if (typeof ack === "function") ack({ success: false });
        }
      };
    socket.on(
      "join_chat",
      guarded(async ({ aptId }) => {
        const apt = await access(aptId, socket.userId);
        if (!apt) throw new Error();
        socket.join("apt_" + aptId);
        socket.emit("user_joined", socket.userId);
      }),
    );
    socket.on(
      "mark_read",
      guarded(async ({ aptId }) => {
        if (!(await access(aptId, socket.userId))) throw new Error();
        await markRead(aptId, socket.userId);
        io.to("apt_" + aptId).emit("messages_read", {
          aptId,
          readBy: socket.userId,
        });
      }),
    );
  });
}
function createRuntime() {
  const app = createApp(),
    httpServer = createServer(app),
    io = new Server(httpServer, {
      cors: {
        origin: (
          process.env.CORS_ORIGINS ||
          "http://localhost:3000,http://127.0.0.1:3000"
        ).split(","),
        credentials: true,
      },
    });
  // Attach before route handling through the application's dedicated injection slot.
  app.locals.io = io;

  configureSockets(io);
  return { app, httpServer, io };
}
if (require.main === module) {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is required");
  const runtime = createRuntime();
  runtime.httpServer.listen(Number(process.env.PORT) || 5000, () =>
    console.log("Curatus API listening"),
  );
  for (const signal of ["SIGINT", "SIGTERM"])
    process.on(signal, () =>
      runtime.io.close(() => require("./config/dbConfig").end()),
    );
}
module.exports = { createApp, createRuntime, configureSockets };
