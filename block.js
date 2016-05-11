var crypto = require('crypto');
var bytebuffer = require('bytebuffer');
var _ = require('lodash');

function Block(data) {
  this.data = _.assign({
    version: 0,
    height: 0,
    size: 0,
    timestamp: 0,
    generatorId: 0,
    previousHash: '',
    merkelHash: '',
    transactions: []
  }, data);

  this.transactions = [];
  var size = 0;
  for (var i in this.data.transactions) {
    var t = new Transaction(this.data.transactions[i]);
    size += t.getSize();
    this.transactions.push(t);
  }
  if (!this.data.size) {
    this.data.size = size;
  }
  if (!this.data.merkelHash) {
    this.data.merkelHash = this.calculateMerkelHash();
  }
  if (!this.data.hash) {
    this.data.hash = this.calculateHash();
  }
}

Block.prototype.getVersion = function() {
  return this.data.version;
}

Block.prototype.getHeight = function() {
  return this.data.height;
}

Block.prototype.getSize = function() {
  return this.data.size;
}

Block.prototype.getTimestamp = function() {
  return this.data.timestamp;
}

Block.prototype.getGeneratorId = function() {
  return this.data.generatorId;
}

Block.prototype.getPreviousHash = function() {
  return this.data.previousHash;
}

Block.prototype.getHash = function() {
  return this.data.hash;
}

Block.prototype.getMerkelHash = function() {
  return this.data.merkelHash;
}

Block.prototype.getTransactions = function() {
  return this.transactions;
}

Block.prototype.calculateHash = function() {
  var buf = new ByteBuffer();
  var d = this.data;
  buf.writeInt(d.version);
  buf.writeInt(d.height);
  buf.writeInt(d.size);
  buf.writeInt(d.timestamp);
  buf.writeInt(d.generatorId);
  buf.writeIString(d.previousHash);
  buf.writeIString(d.merkelHash);
  buf.flip();
  var bytes = buf.toBuffer();
  return crypto.createHash('sha256').update(bytes).digest();
}
