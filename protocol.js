var MessageType = {
  Init: 1,
  Block: 2,
  Prepare: 3,
  Commit: 4
};

module.exports = {
  MessageType: MessageType,

  initMessage: function(id) {
    return {type: MessageType.Init, id: id};
  },

  blockMessage: function(body) {
    return {type: MessageType.Block, body: body};
  },

  prepareMessage: function(body) {
    return {type: MessageType.Prepare, body: body};
  },

  commitMessage: function(body) {
    return {type: MessageType.Commit, body: body};
  },
};
