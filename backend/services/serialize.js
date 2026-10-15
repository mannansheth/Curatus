// Serialize conversation/reset work for each account within one Node process.
const pending = new Map();
async function serialize(key, task) {
  const previous = pending.get(key) || Promise.resolve();
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  pending.set(key, gate);
  await previous;
  try {
    return await task();
  } finally {
    release();
    if (pending.get(key) === gate) pending.delete(key);
  }
}
module.exports = serialize;
