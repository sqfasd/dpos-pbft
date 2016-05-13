var assert = require('assert');
var EventEmitter = require('events');
var util = require('util');
var slots = require('./slots');
var protocol = require('./protocol');
var Block = require('./block');
var Transaction = require('./transaction');
var HashList = require('./hashlist');
var Pbft = require('./pbft');

var COIN = 100000000;

function BlockChain(node) {
  EventEmitter.call(this);
  this.node = node;
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
  this.transactionIndex = {};
  this.chain = new HashList();
  this.chain.add(this.genesis.getHash(), this.genesis);
  this.pbft = new Pbft(this);
  this.lastSlot = 0;
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

BlockChain.prototype.hasBlock = function(hash) {
  return !!this.chain.get(hash) || this.pbft.hasBlock(hash);
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
  if (Flags.pbft && !this.node.isBad) {
    var slotNumber = slots.getSlotNumber(slots.getTime(block.getTimestamp() * 1000));
    this.pbft.addBlock(block, slotNumber);
  } else {
    this.commitBlock(block);
    this.isBusy = false;
  }
}

BlockChain.prototype.commitBlock = function(block) {
  this.chain.add(block.getHash(), block);
  var transactions = block.getTransactions();
  for (var i in transactions) {
    this.transactionIndex[transactions[i].getHash()] = transactions[i];
  }
}

BlockChain.prototype.processMessage = function(msg) {
  switch (msg.type) {
    case protocol.MessageType.Transaction:
      var trs = new Transaction(msg.body);
      if (!this.hasTransaction(trs)) {
        if (this.validateTransaction(trs)) {
          this.node.broadcast(msg);
          this.addTransaction(trs);
        }
      }
      break;
    case protocol.MessageType.Block:
      var block = new Block(msg.body);
      if (!this.hasBlock(block.getHash())) {
        if (this.validateBlock(block)) {
          this.node.broadcast(msg);
          this.addBlock(block);
        }
      }
      break;
    default:
      if (Flags.pbft && !this.node.isBad) {
        this.pbft.processMessage(msg);
      }
      break;
  }
}

BlockChain.prototype.createBlock = function(cb) {
  var lastBlock = this.chain.last();
  assert(!!lastBlock);
  var newBlock = new Block({
    height: lastBlock.getHeight() + 1,
    timestamp: Math.floor(Date.now() / 1000),
    previousHash: lastBlock.getHash(),
    generatorId: this.node.id,
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
    output += util.format('(%d:%s:%d) -> ', i, block.getHash().substr(0, 6), block.getGeneratorId());
  });
  console.log('node ' + this.node.id, output);
}

BlockChain.prototype.makeFork_ = function() {
  var lastBlock = this.chain.last();
  assert(!!lastBlock);
  var height = lastBlock.getHeight() + 1;
  var timestamp = Math.floor(Date.now() / 1000);
  var block1 = new Block({
    height: height,
    timestamp: timestamp,
    previousHash: lastBlock.getHash(),
    generatorId: this.node.id
  });
  block1.addTransaction(new Transaction({
    amount: 1000,
    recipient: 'alice',
    sender: 'cracker'
  }));
  var block2 = new Block({
    height: height,
    timestamp: timestamp,
    previousHash: lastBlock.getHash(),
    generatorId: this.node.id
  });
  block2.addTransaction(new Transaction({
    amount: 1000,
    recipient: 'bob',
    sender: 'cracker'
  }));
  console.log('fork on node: %d, height: %d, fork1: %s, fork2: %s', this.node.id, lastBlock.getHeight() + 1, block1.getHash(), block2.getHash());
  var i = 0;
  for (var id in this.node.peers) {
    if (i++ % 2 === 0) {
      console.log('send fork1 to', id);
      this.node.peers[id].send(protocol.blockMessage(block1.getData()));
    } else {
      console.log('send fork2 to', id);
      this.node.peers[id].send(protocol.blockMessage(block2.getData()));
    }
  }
  this.addBlock(block1);
}

BlockChain.prototype.loop_ = function(cb) {
  var currentSlot = slots.getSlotNumber();
  var lastBlock = this.chain.last();
  assert(!!lastBlock);
  // this.printBlockChain();
  var lastSlot = slots.getSlotNumber(slots.getTime(lastBlock.getTimestamp() * 1000));
  if (currentSlot === lastSlot || Date.now() % 10000 > 5000) {
    return cb();
  }
  if (Flags.pbft && this.lastSlot === currentSlot) {
    return cb();
  }
  var delegateId = currentSlot % slots.delegates;
  if (this.node.id === delegateId) {
    if (!this.node.isBad) {
      var block = this.createBlock();
      console.log('slot: %d, height: %d, nodeId: %d', currentSlot, block.getHeight(), this.node.id);
      this.addBlock(block);
      this.emit('new-message', protocol.blockMessage(block.getData()));
      this.lastSlot = currentSlot;
    } else {
      this.makeFork_();
    }
  }
  cb();
}

module.exports = BlockChain;
