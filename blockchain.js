var assert = require('assert');
var EventEmitter = require('events');
var util = require('util');
var slots = require('./slots');
var protocol = require('./protocol');
var Block = require('./block');
var Transaction = require('./transaction');

var COIN = 100000000;

var self;
function BlockChain(nodeId) {
  self = this;
  EventEmitter.call(this);
  this.nodeId = nodeId;
  this.genesis = new Block({
    height: 0,
    timestamp: 1462953000,
    previousHash: '',
    generatorId: 0,
    transactions: [
      {
        amount: 100000000 * COIN,
        timestamp: 1462953000,
        recipient: 'neo',
        sender: '',
      }
    ]
  });
  this.pendingTransactions = {};
  this.pendingBlocks = {};
  this.transactionIndex = {};
  this.chain = new HashList();
  this.chain.add(this.genesis.getHash(), this.genesis);
}

util.inherits(BlockChain, EventEmitter);

BlockChain.prototype.start = function() {
  setImmedidate(function nextLoop() {
    self.loop_(function() {
      setTimeout(nextLoop, 1000);
    });
  });
}

BlockChain.prototype.hasTransaction = function(trs) {
  var id = trs.getHash();
  return !!this.pendingTransactions[id] || !!this.transactionIndex[id];
}

BlockChain.prototype.validateTransaction = function(trs) {
  return !!trs;
}

BlockChain.prototype.addTransaction = function(trs) {
  this.pendingTransactions[trs.getHash()] = trs;
}

BlockChain.prototype.hasBlock = function(block) {
  var id = block.getHash();
  return !!this.pendingBlocks[id] || !!this.chain.get[id];
}

BlockChain.prototype.validateBlock = function(block) {
  if (!block) {
    return false;
  }
  var lastBlock = this.chain.last();
  return block.getHeight() === lastBlock.getHeight() + 1 &&
         block.getPreviousHash() === lastBlock.getHash();
}

BlockChain.prototype.addBlock = function(block) {
  this.chain.add(block);
  var transactions = block.getTransactions();
  for (var i in transactions) {
    this.transactionIndex[transactions[i].getHash()] = transactions[i];
  }
}

BlockChain.prototype.processMessage = function(msg) {
}

BlockChain.prototype.createBlock = function(cb) {
  var lastBlock = this.chain.last();
  assert(!!lastBlock);
  var newBlock = new Block({
    height: lastBlock.getHeight() + 1,
    timestamp: Date.now() / 1000,
    previousHash: lastBlock.getHash(),
    generatorId: this.nodeId,
  });
  for (var k in this.pendingTransactions) {
    newBlock.addTransaction(this.pendingTransactions[k]);
  }
  this.pendingTransactions = {};
  setImmedidate(function() {
    cb(null, newBlock);
  });
}

BlockChain.prototype.loop_ = function(cb) {
  var currentSlot = slots.getSlotNumber();
  var lastBlock = this.chain.last();
  assert(!!lastBlock);
  if (currentSlot === slots.getSlotNumber(lastBlock.getTimestamp())) {
    return cb();
  }
  for (var i = currentSlot; i < slots.getLastSlot(currentSlot); ++i) {
    var delegateId = i % slots.delegates;
    if (this.nodeId === delegateId) {
      this.createBlock(function(err, block) {
        if (!err && currentSlot === slots.getSlotNumber(block.getTimestamp())) {
          self.emit('new-message', protocol.blockMessage(block.getData()));
        }
        cb();
      });
      return;
    }
  }
  cb();
}

module.exports = BlockChain;
