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
var stats = require('./stats');
var sync = require('./sync');


var send = function() {
  // minute values
  var value = function(scope, name, value, unit) {
    sync.add('values', {scope: scope, name: name, value: value, unit: unit, _ts: nt.millis()});
    stats.state(scope, name, value, unit);
  };

  var osScope = os.hostname();
  var processScope = osScope + ' - Process[' + process.pid + ']';

  value(osScope, 'Load average', os.loadavg()[0]);
  value(osScope, 'Free memory', os.freemem() / 1000000, 'MB');

  var mem = process.memoryUsage();
  value(processScope, 'Node RSS', mem.rss / 1000000, 'MB');
  value(processScope, 'V8 heap used', mem.heapUsed / 1000000, 'MB');
  value(processScope, 'V8 heap total', mem.heapTotal / 1000000, 'MB');

  var cpuTime = nt.cputime();
  if(cpuTime && nt.lastCpuTime) {
    value(processScope, 'CPU time', (cpuTime - nt.lastCpuTime) / 1000, 'ms');
    nt.lastCpuTime = cpuTime;
  }


  // set info for samples
  var cpus = os.cpus(); 
  var info = {
    'Hostname': os.hostname(),
    'OS type': os.type(),
    'Platform': os.platform(),
    'Total memory (MB)': os.totalmem() / 1000000,
    'CPU': {architecture: os.arch(), model: cpus[0].model, speed: cpus[0].speed, cores: cpus.length},
    'Interfaces': os.networkInterfaces(), 
    'OS Uptime (Hours)': Math.floor(os.uptime() / 3600),
    'Node arguments': process.argv,
    'Node versions': process.versions,
    'Node PID': process.pid,
    'Node uptime (Hours)': Math.floor(process.uptime() / 3600)
  };

  stats.info(info);
};


if(!nt.infoInitialSync) {
  nt.infoInitialSync = true;

  send();
}


if(!nt.infoIntervalId) {
  nt.infoIntervalId = setInterval(function() {
    try {
      send();
    }
    catch(e) {
      nt.error(e);
    }
  }, 60000);
}

