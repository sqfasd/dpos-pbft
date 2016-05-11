var Node = require('./node');

function main() {
  var nodes = [];
  for (var i = 0; i < 20; i++) {
    nodes[i] = new Node(i);
  }
  setTimeout(function() {
    for (var i in nodes) {
      nodes[i].connect();
    }
  }, 1000);
}

main();
