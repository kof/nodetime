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

exports.init = function() {
  nt.payload = {};
  nt.syncRetry = 0;
  nt.commandRetry = 0;

  setInterval(function() {
    try {
      send();
      if(!nt.waitingForCommand) waitForCommand();
    }
    catch(e) {
      nt.error(e);
    }
  }, 2000);
};
 

exports.add = function(type, obj) {
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
  request.post(nt.server + '/upload' + (nt.token ? '?token=' + nt.token : ''), nt.payloadSending, function(err, headers, buf) {
    if(err) {
      if(++nt.syncRetry == 2) {
        nt.payloadSending = null;
        nt.syncRetry = 0;
      }

      return nt.error(err);
    }
 
    try {
      var ret = JSON.parse(buf.toString());
      if(!nt.token && ret.token) {
        nt.token = ret.token;
        nt.message("profiler console for this instance is at \033[33m" + nt.server + "/" + nt.token + "\033[0m");
        nt.emit('session', ret.token);
      }
    }
    catch(err) {
      nt.error(err);
    }

    nt.payloadSending = null;
    nt.syncRetry = 0;
    nt.lastCommandTs = 0;

    nt.log('uploaded payload');
  });
}


var waitForCommand = function() {
  if(!nt.token) return;

  nt.log('waiting for command...');

  nt.waitingForCommand = true;
  request.get(nt.server + '/command/' + nt.token + '/?since=' + (nt.lastCommand ? nt.lastCommand.ts : 0), function(err, headers, buf) {
    if(err) {
      if(++nt.commandRetry == 2) {
        setTimeout(function() {
          nt.commandRetry = 0;
          nt.waitingForCommand = false;
        }, 60000);
      }
      else {
        nt.waitingForCommand = false;
      }

      return nt.error(err);
    }
 
    try {
      var ret = JSON.parse(buf.toString());
      nt.log('command received: ' + ret.cmd + ', args: ' + ret.args);

      ret.cmd = ret.cmd || 'noop';
      ret.args = ret.args || [];

      if(isValidCommand(ret)) {
        nt.lastCommand = ret;

        if(ret.cmd === 'resume') {
          nt.resume.apply(nt, ret.args);
        }
      }
      else {
        nt.error("invalid command from server");
      }
    }
    catch(err) {
      nt.error(err);
    }

    nt.commandRetry = 0;
    nt.waitingForCommand = false;
  });
};


var isValidCommand = function(obj) { 
  if(typeof obj.ts !== 'number') return false;
  if(typeof obj.cmd !== 'string' || obj.cmd.length > 256) return false;

  if(!Array.isArray(obj.args)) return false;

  var valid = true;
  obj.args.forEach(function(arg) {
    if(!valid) return;

    valid = (!arg || typeof arg === "number" || (typeof arg === "string" && arg.length < 1024)); 
  });

  return valid;
};

