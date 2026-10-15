const text = (v, max = 10000) =>
  typeof v === "string" && v.trim().length > 0 && v.length <= max;
const id = (v) =>
  (typeof v === "string" || typeof v === "number") &&
  /^\d+$/.test(String(v)) &&
  Number(v) > 0 &&
  Number.isSafeInteger(Number(v));
const password = (v) => text(v, 72) && Buffer.byteLength(v, "utf8") <= 72;
const nonnegative = (v) =>
  (typeof v === "number" || (typeof v === "string" && v.trim() !== "")) &&
  Number.isFinite(Number(v)) &&
  Number(v) >= 0;
const email = (v) => text(v, 255) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const date = (v) =>
  typeof v === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  !Number.isNaN(Date.parse(v)) &&
  new Date(v).toISOString().slice(0, 10) === v;
const time = (v) =>
  typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d(:00)?$/.test(v);
const normalizeTime = (v) => (v.length === 5 ? v + ":00" : v);
const fail = (res, message = "Invalid request") =>
  res.status(400).json({ success: false, message });
module.exports = {
  text,
  id,
  email,
  date,
  time,
  normalizeTime,
  fail,
  password,
  nonnegative,
};
