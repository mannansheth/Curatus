const v = require("./validation");
const minutes = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
function slots(start, end) {
  if (!v.time(start) || !v.time(end)) return [];
  const result = [];
  for (let n = minutes(start); n + 60 <= minutes(end); n += 60)
    result.push(
      String(Math.floor(n / 60)).padStart(2, "0") +
        ":" +
        String(n % 60).padStart(2, "0") +
        ":00",
    );
  return result;
}
function available(profile, date) {
  const days = String(profile.availableDays || "")
    .split(/[\s,]+/)
    .map((x) => x.toLowerCase().slice(0, 3));
  return days.includes(
    ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][
      new Date(date + "T12:00:00Z").getUTCDay()
    ],
  );
}
const overlaps = (a, b) => Math.abs(minutes(a) - minutes(b)) < 60;
function expired(apt) {
  if (!apt.date || !apt.time) return false;
  const day =
    apt.date instanceof Date
      ? `${apt.date.getFullYear()}-${String(apt.date.getMonth() + 1).padStart(2, "0")}-${String(apt.date.getDate()).padStart(2, "0")}`
      : String(apt.date).slice(0, 10);
  return new Date(day + "T" + apt.time).getTime() + 3600000 <= Date.now();
}
module.exports = { slots, available, overlaps, expired };
