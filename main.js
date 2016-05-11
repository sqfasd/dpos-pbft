var Node = require('./node');
var async = require('async');

var nodes = [];

function main() {
  async.series([
    function(next) {
      console.log('step 1 init nodes ...');
      for (var i = 0; i < 20; i++) {
        nodes[i] = new Node(i);
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
    }
  ], function(err, results) {
  });
}

main();
