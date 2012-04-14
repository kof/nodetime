/*
 * Copyright (c) 2012 Dmitri Melikyan
 *
 * Permission is hereby granted, free of charge, to any person obtaining a 
 * copy of this software and associated documentation files (the 
 * "Software"), to deal in the Software without restriction, including 
 * without limitation the rights to use, copy, modify, merge, publish, 
 * distribute, sublicense, and/or sell copies of the Software, and to permit 
 * persons to whom the Software is furnished to do so, subject to the 
 * following conditions:
 * 
 * The above copyright notice and this permission notice shall be included 
 * in all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS 
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF 
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN 
 * NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, 
 * DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR 
 * OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR 
 * THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */


var nt = require('../nodetime');
var proxy = require('../proxy');
var stats = require('../stats');

var commands = [
  'get',
  'count',
  'set',
  'remove',
  'truncate',
  'use',
  'addKeySpace',
  'dropKeySpace'
];

module.exports = function(obj) {
  // not tested, skip
  return;

  commands.forEach(function(command) {
    proxy.before(obj.ColumnFamily.prototype, command, function(obj, args) {
      if(nt.paused) return;

      var cf = obj;
      var trace = stats.trace();
      var params = args.length > 1 && Array.isArray(args[1]) ? args[1] : undefined;
      var time = stats.time();

      proxy.callback(args, -1, function(obj, args) {
        if(!time.measure()) return;
        stats.metrics(time, 'Cassandra');

        var error = args.length > 0 ? (args[0] ? args[0].message : undefined) : undefined;
        var obj = {'Type': 'Cassandra',
            'Connection': {host: cf.client_.host, port: cf.client_.port, keyspace: cf.client_.keyspace, columnFamily: cf.name}, 
            'Command': command, 
            'Params': stats.truncate(params),
            'Stack trace': trace,
            'Error': error};

        stats.sample(time, obj, 'Cassandra: ' + obj['Command']);
      });
    });
  });
};

