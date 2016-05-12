var crypto = require('crypto');
var ByteBuffer = require('bytebuffer');
var _ = require('lodash');
var Transaction = require('./transaction');

function Block(data) {
  this.data = _.assign({
    version: 0,
    height: 0,
    size: 0,
    timestamp: 0,
    generatorId: 0,
    previousHash: '',
    merkleHash: '',
    transactions: []
  }, data);

  this.transactions = [];
  var size = 0;
  for (var i in this.data.transactions) {
    var t = new Transaction(this.data.transactions[i]);
    size += t.getSize();
    this.transactions.push(t);
  }
  if (this.transactions.length === 0) {
    var coinbaseTrs = new Transaction({
      amount: 5,
      recipient: 'somebody',
      sender: 'nobody'
    });
    size += coinbaseTrs.getSize();
    this.transactions.push(coinbaseTrs);
  }
  for (var i in this.transactions) {
    this.data.transactions.push(this.transactions[i].getData());
  }
  if (!this.data.size) {
    this.data.size = size;
  }
  if (!this.data.merkleHash) {
    this.data.merkleHash = this.calculateMerkleHash();
  }
  if (!this.data.hash) {
    this.data.hash = this.calculateHash();
  }
}

Block.prototype.addTransaction = function(trs) {
  this.transactions.push(trs);
  this.size += trs.getSize();
  this.data.transactions.push(trs.getData());
  this.data.merkleHash = this.calculateMerkleHash();
  this.data.hash = this.calculateHash();
}

Block.prototype.getData = function() {
  return this.data;
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

Block.prototype.getMerkleHash = function() {
  return this.data.merkleHash;
}

Block.prototype.getTransactions = function() {
  return this.transactions;
}

Block.prototype.calculateMerkleHash = function() {
  var hashes = [];
  this.transactions.forEach(function(t) {
    hashes.push(t.getHash());
  });
  while (hashes.length > 1) {
    var tmp = [];
    for (var i = 0; i < hashes.length / 2; ++i) {
      var md = crypto.createHash('sha256');
      md.update(hashes[i*2]);
      md.update(hashes[i*2+1]);
      tmp.push(md.digest().toString('hex'));
    }
    if (hashes.length % 2 === 1) {
      tmp.push(hashes[hashes.length - 1]);
    }
    hashes = tmp;
  }
  return hashes[0];
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
  buf.writeIString(d.merkleHash);
  buf.flip();
  var bytes = buf.toBuffer();
  return crypto.createHash('sha256').update(bytes).digest().toString('hex');
}

module.exports = Block;
