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
  'set',
  'delete',
  'add',
  'replace',
  'append',
  'prepend',
  'cas',
  'increment',
  'decrement',
  'stats'
];


var findCallback = function(args) {
  for(var i = 0; i < args.length; i++)
    if(typeof args[i] === 'function') return i;
};


module.exports = function(obj) {

  // connect
  proxy.after(obj.Client.prototype, 'connect', function(obj, args, ret) {
    obj.__trace__ = stats.trace();
    obj.__time__ = stats.time();
  });

  proxy.before(obj.Client.prototype, 'on', function(obj, args) {
    var client = obj;
    var event = args[0];
    if(event !== 'connect' && event !== 'timeout' && event !== 'error') return;

    proxy.callback(args, -1, function(obj, args) {
      if(nt.paused) return;

      var time = client.__time__;
      if(!time || !time.measure()) return;

      var error = undefined;
      if(event === 'timeout') {
        error = 'socket timeout';
      }
      else if(event === 'error') {
        error = args.length > 0 ? args[0].message : undefined;
      }

      var obj = {'Type': 'Memcached',
          'Connection': {host: client.host, port: client.port}, 
          'Command': 'connect', 
          'Stack trace': client.__trace__,
          'Error': error};

      stats.sample(time, obj, 'Memcached: ' + obj['Command']);
      stats.metrics(time, 'Memcached');
    });
  });
 

  // commands
  commands.forEach(function(command) {
    proxy.before(obj.Client.prototype, command, function(obj, args) {
      if(nt.paused) return;

      var client = obj;
      var trace = stats.trace();
      var params = args;
      var time = stats.time();

      // there might be args after callback, need to do extra callback search
      var pos = findCallback(args);
      if(pos == undefined) return;

      proxy.callback(args, pos, function(obj, args) {
        if(!time.measure()) return;

        var error = (args && args.length > 0) ? (args[0] ? args[0].message : undefined) : undefined;
        var obj = {'Type': 'Memcached',
            'Connection': {host: client.host, port: client.port}, 
            'Command': command, 
            'Params': stats.truncate(params),
            'Stack trace': trace,
            'Error': error};

        stats.sample(time, obj, 'Memcached: ' + obj['Command']);
        stats.metrics(time, 'Memcached');
      });
    });
  });
};

