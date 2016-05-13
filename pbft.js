var assert = require('assert');
var protocol = require('./protocol');
var slots = require('./slots');

var PBFT_N = slots.delegates;
var PBFT_F = Math.floor((PBFT_N - 1) / 3);

var State = {
  None: 0,
  Prepare: 1,
  Commit: 2,
};

function Pbft(blockchain) {
  this.blockchain = blockchain;
  this.node = blockchain.node;
  this.pendingBlocks = {};
  this.prepareInfo = null;
  this.commitInfos = {};
  this.state = State.None;
  this.prepareHashCache = {};
  this.commitHashCache = {};
  this.currentSlot = 0;
}

Pbft.prototype.hasBlock = function(hash) {
  return !!this.pendingBlocks[hash];
}

Pbft.prototype.isBusy = function() {
  return this.state !== State.None;
}

Pbft.prototype.addBlock = function(block, slot) {
  var hash = block.getHash();
  console.log('pbft addBlock', this.node.id, hash);
  this.pendingBlocks[hash] = block;
  if (slot > this.currentSlot) {
    this.clearState();
  }
  if (this.state === State.None) {
    this.currentSlot = slot;
    this.state = State.Prepare;
    this.prepareInfo = {
      height: block.getHeight(),
      hash: hash,
      votesNumber: 1,
      votes: {}
    };
    // TODO will need proof of node signature in formal implementation
    this.prepareInfo.votes[this.node.id] = true;
    var self = this;
    setTimeout(function() {
      self.node.broadcast(protocol.prepareMessage({
        height: block.getHeight(),
        hash: hash,
        signer: self.node.id
      }));
    }, 100);
  }
}

Pbft.prototype.clearState = function() {
  this.state = State.None;
  this.prepareInfo = null;
  this.commitInfos = {};
  this.pendingBlocks = {};
}

Pbft.prototype.commit = function(hash) {
  var block = this.pendingBlocks[hash];
  assert(!!block);
  this.blockchain.commitBlock(block);
  this.clearState();
}

Pbft.prototype.processMessage = function(msg) {
  switch (msg.type) {
    case protocol.MessageType.Prepare:
      var d = msg.body;
      var key = d.hash + ':' + d.height + ':' + d.signer;
      if (!this.prepareHashCache[key]) {
        this.prepareHashCache[key] = true;
        this.node.broadcast(msg);
      } else {
        return;
      }
      if (this.state === State.Prepare &&
          d.height === this.prepareInfo.height &&
          d.hash === this.prepareInfo.hash &&
          !this.prepareInfo.votes[d.signer]) {
        this.prepareInfo.votes[d.signer] = true;
        this.prepareInfo.votesNumber++;
        console.log('pbft %d prepare votes: %d', this.node.id, this.prepareInfo.votesNumber);
        if (this.prepareInfo.votesNumber > PBFT_F) {
          console.log('node %d change state to commit', this.node.id);
          this.state = State.Commit;
          var commitInfo = {
            height: this.prepareInfo.height,
            hash: this.prepareInfo.hash,
            votesNumber: 1,
            votes: {}
          };
          commitInfo.votes[this.node.id] = true;
          this.commitInfos[commitInfo.hash] = commitInfo;
          this.node.broadcast(protocol.commitMessage({
            height: this.prepareInfo.height,
            hash: this.prepareInfo.hash,
            signer: this.node.id
          }));
        }
      }
      break;
    case protocol.MessageType.Commit:
      var d = msg.body;
      var key = d.hash + ':' + d.height + ':' + d.signer;
      if (!this.commitHashCache[key]) {
        this.commitHashCache[key] = true;
        this.node.broadcast(msg);
      } else {
        return;
      }
      var commit = this.commitInfos[d.hash];
      if (commit) {
        if (!commit.votes[d.signer]) {
          commit.votes[d.signer] = true;
          commit.votesNumber++;
          console.log('pbft %d commit votes: %d', this.node.id, commit.votesNumber);
          if (commit.votesNumber > 2 * PBFT_F) {
            this.commit(d.hash);
          }
        }
      } else {
        this.commitInfos[d.hash] = {
          hash: d.hash,
          height: d.height,
          votesNumber: 1,
          votes: {}
        }
        this.commitInfos[d.hash].votes[d.signer] = true;
      }
      break;
    default:
      break;
  }
}

module.exports = Pbft;
