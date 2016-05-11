var assert = require('assert');
var EventEmitter = require('events');
var util = require('util');
var slots = require('./slots');
var protocol = require('./protocol');
var Block = require('./block');
var Transaction = require('./transaction');
var HashList = require('./hash-list');

var COIN = 100000000;

function BlockChain(nodeId) {
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
  var self = this;
  setImmediate(function nextLoop() {
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
  return !!this.pendingBlocks[id] || !!this.chain.get(id);
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
  this.chain.add(block.getHash(), block);
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
    timestamp: Math.floor(Date.now() / 1000),
    previousHash: lastBlock.getHash(),
    generatorId: this.nodeId,
  });
  for (var k in this.pendingTransactions) {
    newBlock.addTransaction(this.pendingTransactions[k]);
  }
  this.pendingTransactions = {};
  return newBlock;
}

BlockChain.prototype.printBlockChain = function() {
  var output = '';
  this.chain.each(function(block, i) {
    output += util.format('(%d:%s) -> ', i, block.getHash().substr(0, 6));
  });
  console.log('node ' + this.nodeId, output);
}

BlockChain.prototype.loop_ = function(cb) {
  var currentSlot = slots.getSlotNumber();
  var lastBlock = this.chain.last();
  assert(!!lastBlock);
  this.printBlockChain();
  var lastSlot = slots.getSlotNumber(slots.getTime(lastBlock.getTimestamp() * 1000));
  if (currentSlot === lastSlot || Date.now() % 10000 > 5000) {
    return cb();
  }
  var delegateId = currentSlot % slots.delegates;
  if (this.nodeId === delegateId) {
    var block = this.createBlock();
    console.log('slot: %d, height: %d, nodeId: %d', currentSlot, block.getHeight(), this.nodeId);
    this.addBlock(block);
    this.emit('new-message', protocol.blockMessage(block.getData()));
  }
  cb();
}

module.exports = BlockChain;
