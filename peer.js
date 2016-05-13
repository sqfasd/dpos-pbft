var assert = require('assert');
var net = require('net');
var protocol = require('./protocol');

function Peer(id, port, localId) {
  this.buf = '';
  if (typeof id === 'number') {
    this.id = id;
    this.remotePort = port;
    this.localId = localId;
    this.socket = net.connect(port, this.onConnected_.bind(this));
  } else if (typeof id === 'object') {
    this.socket = id;
    this.localId = port;
    this.socket.setEncoding('utf8');
    this.socket.on('data', this.onData_.bind(this));
    this.socket.on('end', this.onClose_.bind(this));
  } else {
    assert(false);
  }
}

Peer.prototype.send = function(msg) {
  var data = JSON.stringify(msg);
  // console.log(this.localId + ' >> [' + this.id + ']', data);
  this.socket.write('' + data.length);
  this.socket.write('\n');
  this.socket.write(data);
}

Peer.prototype.getId = function() {
  return this.id;
}

Peer.prototype.setMessageCb = function(cb) {
  assert(typeof cb === 'function');
  this.messageCb = cb;
}

Peer.prototype.close = function() {
  this.socket.end();
}

Peer.prototype.onConnected_ = function() {
  console.log('peer ' + this.id + ' connected with ' + this.localId);
  this.socket.setEncoding('utf8');
  this.socket.on('data', this.onData_.bind(this));
  this.send(protocol.initMessage(this.localId));
}

Peer.prototype.onData_ = function(data) {
  this.buf += data;
  var start = 0;
  var pos = this.buf.indexOf('\n', start);
  var end = 0;
  while (pos !== -1) {
    var len = parseInt(this.buf.substring(start, pos));
    if (this.buf.length - pos - 1 < len) {
      break;
    }
    var body = this.buf.substr(pos + 1, len);
    end = pos + 1 + len;

    var msg = JSON.parse(body);
    if (msg.type === protocol.MessageType.Init) {
      this.id = msg.id;
      console.log('peer ' + this.id + ' accpeted on ' + this.localId);
    }
    // console.log(this.localId + ' << ' + this.id, body);
    this.messageCb(this, msg);

    start = pos + 1 + len;
    pos = this.buf.indexOf('\n', start);
  }
  this.buf = this.buf.substring(end);
}

Peer.prototype.onClose_ = function() {
  console.log('connection ' + this.id + ' -> ' + this.localId + ' closed');
}

module.exports = Peer;
