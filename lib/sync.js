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


var nt = require('./nodetime');
var request = require('./request');

if(!nt.payload) { 
  nt.payload = {};
  nt.syncRetry = 0;
  nt.nextId = Math.round(Math.random() * Math.pow(10, 9));
}
 


function clone(source, depth) {
  if(!depth) depth = 0;
  if(depth > 20) return {};

  var target = {};

  for(var prop in source) {
    var val = source[prop];
    if(val == undefined || prop.match(/^_/)) continue;
  
    if(typeof val === 'string' || typeof val === 'number') {
      target[prop] = source[prop];
    }
    else if(typeof val === 'object') {
      target[prop] = clone(val, depth + 1);
    }
  }
  
  return target;
}


exports.add = function(type, obj) {
  obj._id = nt.nextId++;

  if(type === 'samples') {
    obj['In-time operations'] = obj._related;
    obj['Application state'] = obj._state;
    obj['Node information'] = obj._info;

    nt.emit('sample', clone(obj));
  }

  if(nt.headless) return;

  if(nt.payload[type]) {
    nt.payload[type].push(obj);
  }
  else {
    nt.payload[type] = [obj];
  }

  // cleanup
  if(nt.payload.length > 1000) {
    nt.payload.splice(1000);
  }
};


var hasData = function() {
  for(var key in nt.payload) {
    return true;
  }
};


var send = function() {
  if(nt.headless) return; 
 
  // nothing to send or emit
  if(!hasData()) return;

  // worker without token
  if(!(nt.master || nt.token)) return;


  nt.payload['version'] = nt.version;

  nt.dump(nt.payload);

  if(!nt.payloadSending) {
    nt.payloadSending = nt.payload;
    nt.payload = {};
  }
  request.post('https://nodetime.com/upload' + (nt.token ? '?token=' + nt.token : ''), nt.payloadSending, function(err, headers, buf) {
    if(err) {
      if(nt.syncRetry++ > 1) {
        nt.payloadSending = null;
        nt.syncRetry = 0;
      }

      nt.error(err);
      return;
    }
  
    var ret = JSON.parse(buf.toString());
    if(!nt.token && ret.token) {
      nt.token = ret.token;
      console.log("\033[1mNodetime:\033[0m profiler console for this instance is at \033[33mhttps://nodetime.com/" + nt.token + "\033[0m");
      nt.emit('session', ret.token);
    }

    nt.payloadSending = null;
    nt.syncRetry = 0;

    nt.log('uploaded payload');
  });
}


if(!nt.syncIntervalId) {
  nt.syncIntervalId = setInterval(function() {
    try {
      send();
    }
    catch(e) {
      nt.error(e);
    }
  }, 2000);
}


