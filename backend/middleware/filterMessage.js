const WORD_LIST = require("../data/badwordsList");

const escapeRegex = (word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const escapedWords = WORD_LIST.map(escapeRegex);

const BANNED_REGEX = new RegExp(`(?:^|[^\\p{L}\\p{N}_])(${escapedWords.join("|")})(?=$|[^\\p{L}\\p{N}_])`, "iu");

const isMessageInvalid = (message) => {
  if (typeof message !== "string") return true;
  const match = message.match(BANNED_REGEX);

  return !!match;
};

module.exports = isMessageInvalid;
