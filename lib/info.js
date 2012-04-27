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

  try { value(osScope, 'Load average', os.loadavg()[0]); } catch(err) { nt.error(err); }
  try { value(osScope, 'Free memory', os.freemem() / 1000000, 'MB'); } catch(err) { nt.error(err); }


  try {
    var mem = process.memoryUsage();
    value(processScope, 'Node RSS', mem.rss / 1000000, 'MB');
    value(processScope, 'V8 heap used', mem.heapUsed / 1000000, 'MB');
    value(processScope, 'V8 heap total', mem.heapTotal / 1000000, 'MB');
  }
  catch(err) {
    nt.error(err);
  }

  var cpuTime = nt.cputime();
  if(cpuTime !== undefined && nt.lastCpuTime !== undefined) {
    value(processScope, 'CPU time', (cpuTime - nt.lastCpuTime) / 1000, 'ms');
    nt.lastCpuTime = cpuTime;
  }

  // set info for samples
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

