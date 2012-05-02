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
var Time = require('./time').Time;


exports.init = function() {
  nt.state = {};
  nt.roots = [];
  nt.operations = [];
  nt.stackTraceCalls = 0;


  nt.on('info', function(info) {
    nt.info = info;
  });

  nt.on('value', function(value) {
    if(!nt.state[value.scope]) nt.state[value.scope] = {};
    nt.state[value.scope][value.name + (value.unit ? ' (' + value.unit + ')' : '')] = value.value;
  });


  setInterval(function() {
    try {
      if(!nt.headless && nt.token) send();
      nt.roots = [];
      nt.operations = [];
    }
    catch(e) {
      nt.error(e);
    }
  }, 2000);


  setInterval(function() {
    try {
      nt.stackTraceCalls = 0;
    }
    catch(e) {
      nt.error(e);
    }
  }, 60000);
}

exports.time = function(scope, command, root) {
  var t =  new Time(scope, command, root);
  t.start();

  return t;
}; 


exports.truncate = function(args) {
  if(!args) return undefined;

  if(typeof args === 'string') {
    return (args.length > 80 ? (args.substr(0, 80) + '...') : args); 
  }
  
  if(!args.length) return undefined;

  var arr = [];
  var argsLen = (args.length > 10 ? 10 : args.length); 
  for(var i = 0; i < argsLen; i++) {
   if(typeof args[i] === 'string') {
      if(args[i].length > 80) {
        arr.push(args[i].substr(0, 80) + '...'); 
      }
      else {
        arr.push(args[i]); 
      }
    }
    else if(typeof args[i] === 'number') {
      arr.push(args[i]); 
    }
    else if(args[i] === undefined) {
      arr.push('[undefined]');
    }
    else if(args[i] === null) {
      arr.push('[null]');
    }
    else if(typeof args[i] === 'object') {
      arr.push('[object]');
    }
    if(typeof args[i] === 'function') {
      arr.push('[function]');
    }
  } 

  if(argsLen < args.length) arr.push('...');

  return arr;
};



exports.stackTrace = function() {
  if(this.stackTraceCalls++ > 1000) return undefined;

  var err = new Error();
  Error.captureStackTrace(err);

  if(err.stack) {
    var lines = err.stack.split("\n");
    lines.shift();
    lines = lines.filter(function(line) {
      return (!line.match(/nodetime/) || line.match(/nodetime\/test/));;
    });

    return lines; 
  }

  return undefined;
};



exports.add = function(time, sample, label) {
  process.nextTick(function() {
    if(time.root) {
      // filter
    }

    sample._version = nt.version;
    sample._ns = 'samples';
    sample._id = time.id;
    sample._root = time.root;
    sample._begin = time.begin;
    sample._end = time.end;
    sample._ms = time.ms;
    sample._ts = time.begin;
    sample._cputime = time.cputime

    if(label && label.length > 80) label = label.substring(0, 80) + '...';
    sample._label = label;

    sample['Response time (ms)'] = sample._ms;
    sample['Timestamp (ms)'] = sample._ts;
    if(sample._cputime !== undefined) sample['CPU time (ms)'] = sample._cputime;


    if(sample._root) {
      sample['Operations'] = operations(sample);
      sample['Application state'] = nt.state;
      sample['Node information'] = nt.info;
 
      nt.emit('sample', sample);
    }
    else {
      nt.operations.push(sample);
    }
  });
}


var operations = function(sample) {
  var found = [];

  nt.operations.forEach(function(s) {
    if(!s._root && 
      s._begin >= sample._begin && s._end <= sample._end &&
      (!s.URL || !s.URL.match(/^nodetime\.com/))) 
    {
      found.push(s);
    }
  });
        
  found = found.sort(function(a, b) {
    return b._ms - a._ms;
  });

  return found.splice(0, 50);
};



var send = function() {
  var slowest = nt.roots;
  slowest = slowest.sort(function(a, b) {
    return b._ms - a._ms;
  });

  for(var i = 0; i < (slowest.length < 10 ? slowest.length : 10); i++) {
    slowest[i]['Operations'] = operations(slowest[i]);
    slowest[i]['Application state'] = nt.state;
    slowest[i]['Node information'] = nt.info;
    nt.agent.send({'samples': slowest[i]});
  }
};


