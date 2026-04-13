const WORD_LIST = require("../data/badwordsList");

const escapeRegex = (word) =>
  word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const escapedWords = WORD_LIST.map(escapeRegex);

const BANNED_REGEX = new RegExp(`\\b(${escapedWords.join('|')})\\b`, 'i');

const isMessageInvalid = (message) => {
  const match = message.match(BANNED_REGEX);
  console.log(match ? match[0] : null);
  return !!match;
};

module.exports = isMessageInvalid;