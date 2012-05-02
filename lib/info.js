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


var os = require('os');
var nt = require('./nodetime');


exports.init = function() {
  nt.values = {};

  nt.on("call", function(point, time) {
    if(point === "done") {
      exports.value(time.scope, 'Requests per minute', 1, undefined, 'sum');
      exports.value(time.scope, 'Average response time', time.ms, 'ms', 'avg');
      exports.value(time.scope, 'Response time histogram', time.ms, 'ms', 'hist');
      if(time.cputime) exports.value(time.scope, 'Average CPU time', time.cputime, 'ms', 'avg');
    }
  });


  setInterval(function() {
    try {
      collect();
    }
    catch(e) {
      nt.error(e);
    }
  }, 60000);

  collect();
}

exports.value = function(scope, name, value, unit, op) {
  process.nextTick(function() {
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
  });
};


var emit = function(scope, name, value, unit, op) {
  nt.emit('value', {scope: scope, name: name, value: value, unit: unit, op: op, _id: nt.nextId++, _ns: 'values', _ts: nt.millis()});
};


var collect = function() {
  for (var key in nt.values) {
    var obj = nt.values[key];

    if(obj.op === 'hist') {
      emit(obj.scope, obj.name, obj._bins, obj.unit, obj.op);
    }
    else if(obj.op === 'sum') {
      emit(obj.scope, obj.name, obj._sum, obj.unit, obj.op);
    }
    else if(obj.op === 'avg') {
      var avg = Math.round(obj._sum / obj._count);
      emit(obj.scope, obj.name, avg, obj.unit, obj.op);
    }
  }

  nt.values = {};


  var osScope = os.hostname();
  var processScope = osScope + ' - Process[' + process.pid + ']';

  try { emit(osScope, 'Load average', os.loadavg()[0]); } catch(err) { nt.error(err); }
  try { emit(osScope, 'Free memory', os.freemem() / 1000000, 'MB'); } catch(err) { nt.error(err); }


  try {
    var mem = process.memoryUsage();
    emit(processScope, 'Node RSS', mem.rss / 1000000, 'MB');
    emit(processScope, 'V8 heap used', mem.heapUsed / 1000000, 'MB');
    emit(processScope, 'V8 heap total', mem.heapTotal / 1000000, 'MB');
  }
  catch(err) {
    nt.error(err);
  }

  var cpuTime = nt.cputime();
  if(cpuTime !== undefined && nt.lastCpuTime !== undefined) {
    emit(processScope, 'CPU time', (cpuTime - nt.lastCpuTime) / 1000, 'ms');
    nt.lastCpuTime = cpuTime;
  }


  var info = {};
  try { info['Hostname'] = os.hostname() } catch(err) { nt.error(err) } 
  try { info['OS type'] = os.type() } catch(err) { nt.error(err) } 
  try { info['Platform'] = os.platform() } catch(err) { nt.error(err) } 
  try { info['Total memory (MB)'] = os.totalmem() / 1000000 } catch(err) { nt.error(err) } 
  try { var cpus = os.cpus(); info['CPU'] = {architecture: os.arch(), model: cpus[0].model, speed: cpus[0].speed, cores: cpus.length} } catch(err) { nt.error(err) } 
  try { info['Interfaces'] = os.networkInterfaces() } catch(err) { nt.error(err) } 
  try { info['OS Uptime (Hours)'] = Math.floor(os.uptime() / 3600) } catch(err) { nt.error(err) } 
  try { info['Node arguments'] = process.argv } catch(err) { nt.error(err) } 
  try { info['Node versions'] = process.versions } catch(err) { nt.error(err) } 
  try { info['Node PID'] = process.pid; } catch(err) { nt.error(err) } 
  try { info['Node uptime (Hours)'] = Math.floor(process.uptime() / 3600); } catch(err) { nt.error(err) } 

  nt.emit('info', info);
};

