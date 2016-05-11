var MessageType = {
  Init: 1,
  Block: 2,
  Vote: 3,
  Commit: 4
};

module.exports = {
  MessageType: MessageType,

  initMessage: function(id) {
    return {type: MessageType.Init, id: id};
  },

  blockMessage: function(body) {
    return {type: MessageType.Block, body: body};
  }

};
