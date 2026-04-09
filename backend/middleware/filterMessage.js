const WORD_LIST = require("../data/badwordsList")

const isMessageInvalid = (message) => {
  return WORD_LIST.some(w => message.toLowerCase().includes(w))
}

module.exports = isMessageInvalid;