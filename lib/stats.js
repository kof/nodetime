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
var sync = require('./sync');

if(!nt.values) { 
  nt.state = {};
  nt.values = {};
  nt.samples = {root: [], related: []};
  nt.rpm = {last: 0, current: 0};
}



function Time(root) {
  this.root = root;

  this.begin = nt.micros();
  this.end = undefined;
  this.ms = undefined;

  this.cpuTime = root ? nt.cputime() : null;
};

Time.prototype.measure = function() {
  if(this.end) return false;

  this.end = nt.micros();
  this.ms = (this.end - this.begin) / 1000;
  this.begin = this.begin / 1000;
  this.end = this.end / 1000;

  if(this.cpuTime != null) this.cpuTime = (nt.cputime() - this.cpuTime) / 1000;

  return true;
};


exports.time = function(root) {
  return new Time(root);
}; 


exports.truncate = function(args) {
  if(!args) return undefined;

  if(typeof args === 'string') {
    return (args.length > 80 ? (args.substr(0, 80) + '...') : args); 
  }

  var arr = [];
  var argsLen = (args.length > 10 ? 10 : args.length); 
  for(var i = 0; i < argsLen; i++) {
    if(typeof args[i] === 'function') continue;
    if(typeof args[i] === 'string' && args[i].length > 80) {
      arr.push(args[i].substr(0, 80) + '...'); 
    }
    else {
      arr.push(args[i]);
    }
  } 

  if(argsLen < args.length) arr.push('...');

  return arr;
};


exports.production = function() {
  return (nt.rpm.last > 10 || nt.rpm.current > 10);
};


exports.trace = function() {
  if(exports.production()) return undefined;

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


exports.info = function(info) {
  nt.info = info;
};


exports.state = function(scope, name, value, unit) {
  if(!nt.state[scope]) nt.state[scope] = {};
  nt.state[scope][name + (unit ? ' (' + unit + ')' : '')] = value;
};


exports.metrics = function(time, scope) {
  exports.value(scope, 'Requests per minute', 1, undefined, 'sum');
  exports.value(scope, 'Average response time', time.ms, 'ms', 'avg');
  exports.value(scope, 'Response time histogram', time.ms, 'ms', 'hist');
  if(time.cpuTime) exports.value(scope, 'Average CPU time', time.cpuTime, 'ms', 'avg');
};


exports.value = function(scope, name, value, unit, op) {
  var key = scope + ':' + name;
  if(!nt.values[key]) {
    if(op === 'hist') {
      nt.values[key] = {
        scope: scope,
        name: name,
        unit: unit,
        op: op,
        _bins: {}
      };
    }
    else { // sum, avg
      nt.values[key] = {
        scope: scope,
        name: name,
        unit: unit,
        op: op,
        _sum: 0,
        _count: 0
      };
    }
  }
    
  var valObj = nt.values[key];
  if(op === 'hist') {
    var bin = Math.pow(10, Math.floor(Math.log(value) / Math.LN10) + 1); 
    if(valObj._bins[bin]) {
      valObj._bins[bin]++;
    }
    else {
      valObj._bins[bin] = 1;
    }
  }
  else { // sum, avg
    valObj._sum += value;
    valObj._count++;
  }
};


exports.sample = function(time, sample, label) {
  sample._root = time.root;
  sample._begin = time.begin;
  sample._end = time.end;
  sample._ms = time.ms;
  sample._ts = time.begin;

  if(label && label.length > 80) label = label.substring(0, 80) + '...';
  sample._label = label;

  sample['Response time (ms)'] = sample._ms;
  sample['Timestamp (ms)'] = sample._ts;

  if(time.cpuTime) sample['CPU time (ms)'] = time.cpuTime;


  if(sample._root) {
    nt.rpm.current++;
    if(!exports.production()) {
      sample._related = related(sample);
      sample._info = nt.info;
      sample._state = nt.state;
      sync.add('samples', sample);
    }
    else {
      nt.samples.root.push(sample);
    }
  }
  else {
    nt.samples.related.push(sample);
  }
}


var related = function(sample) {
  var found = [];

  nt.samples.related.forEach(function(s) {
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

  return found.splice(0, 20);
};


var send = function() {
  // sending values
  for (var key in nt.values) {
    var obj = nt.values[key];

    if(obj.op === 'hist') {
      sync.add('values', {scope: obj.scope, name: obj.name, value: obj._bins, unit: obj.unit, op: obj.op, _ts: nt.millis()});
    }
    else if(obj.op === 'sum') {
      sync.add('values', {scope: obj.scope, name: obj.name, value: obj._sum, unit: obj.unit, op: obj.op, _ts: nt.millis()});
      exports.state(obj.scope, obj.name, obj._sum, obj.unit);
    }
    else if(obj.op === 'avg') {
      var avg = Math.round(obj._sum / obj._count);
      sync.add('values', {scope: obj.scope, name: obj.name, value: avg, unit: obj.unit, op: obj.op, _ts: nt.millis()});
      exports.state(obj.scope, obj.name, avg, obj.unit);
    }
  }
  
  nt.values = {};


  // sending samples
  var slowest = nt.samples.root;
  slowest = slowest.sort(function(a, b) {
    return b._ms - a._ms;
  });

  for(var i = 0; i < (slowest.length < 50 ? slowest.length : 50); i++) {
    slowest[i]._related = related(slowest[i]);
    slowest[i]._info = nt.info;
    slowest[i]._state = nt.state;
    sync.add('samples', slowest[i]);
  }

  nt.samples.root = [];
  nt.samples.related = [];


  // rpm reset
  nt.rpm.last = nt.rpm.current;
  nt.rpm.current = 0;
};


if(!nt.statsIntervalId) {
  nt.statsIntervalId = setInterval(function() {
    try {
      send();
    }
    catch(e) {
      nt.error(e);
    }
  }, 60000);
}

