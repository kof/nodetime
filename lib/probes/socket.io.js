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

module.exports = function(obj) {
  proxy.after(obj, 'listen', function(obj, args, ret) {
    if(!ret.sockets) return;

    proxy.before(ret.sockets, ['on', 'addListener'], function(obj, args) {
      if(args[0] !== 'connection') return;

      proxy.callback(args, -1, function(obj, args) {
        var socket = args[0];     

        proxy.before(socket, ['on', 'addListener'], function(obj, args) {
          if(nt.paused) return;

          var msg = args[0];
          var time = undefined;

          proxy.callback(args, -1, function(obj, args) {
            time = stats.time("Socket.io", msg, true);
          });

          proxy.after(socket, ['emit', 'send'], function(obj, args) {
            if(!time || !time.done()) return;
  
            stats.sample(time, {'Type': 'Socket.io', 
              'Message': msg, 
              'Namespace': socket.namespace ? socket.namespace.name : undefined}, 
              'Socket.io: ' + msg);
          });
        });
      });
    });
  });
};

