var Node = require('./node');
var async = require('async');

var nodes = [];
var badIds = [1, 5, 10, 15];

function main() {
  async.series([
    function(next) {
      console.log('step 1 init nodes ...');
      for (var i = 0; i < 20; i++) {
        nodes[i] = new Node(i, badIds.indexOf(i) !== -1);
      }
      setTimeout(next, 1000);
    },
    function(next) {
      console.log('step 2 init p2p network ...');
      for (var i in nodes) {
        nodes[i].connect();
      }
      setTimeout(next, 2000);
    },
    function(next) {
      console.log('step 3 start forging');
      for (var i in nodes) {
        nodes[i].start();
      }
      next();
    }
  ], function(err, results) {
    setInterval(function() {
      nodes.forEach(function(node) {
        node.printBlockChain();
      });
    }, 3);
  });
}

main();
