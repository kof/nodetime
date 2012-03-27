var fs = require('fs');
var path = require('path');

module.exports = function(cb) {
  var probes = [];
  var files = fs.readdirSync(path.dirname(require.resolve('./probes.js')) + '/probes');
  files.forEach(function(file) {
    var m = file.match('^(.*)\\.js$');
    if(m && m.length == 2) probes.push(require('./probes/' + m[1]));
  });

  var cbCount = 0;
  probes.forEach(function(probe) {
    probe(function() {
      if(++cbCount == probes.length) cb(); 
    });
  });
};

