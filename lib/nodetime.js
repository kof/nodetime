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

if(global._nodetime) return global._nodetime;

var fs = require('fs');
var os = require('os');
var util = require('util');
var path = require('path');
var events = require('events');
var cluster = require('cluster');
var timekit = undefined;


var Nodetime = function() {
  this.version = '0.2.4';
  this.master = cluster.isMaster;
  this.paused = true;
  this.pauseAt = undefined;
  this.nextId = Math.round(Math.random() * Math.pow(10, 6));

  events.EventEmitter.call(this);
};

util.inherits(Nodetime, events.EventEmitter);
exports = module.exports = global._nodetime = new Nodetime(); 


Nodetime.prototype.profile = function(opt) {
  var self = this;

  if(!opt) opt = {};
  this.token = opt.token; 
  this.headless = opt.headless;
  this.dtrace = opt.dtrace;
  this.stdout = opt.stdout;
  if(this.stdout && typeof opt.headless === 'undefined') this.headless = true;
  this.debug = opt.debug;  



  // try to load timekit
  try { 
    timekit = require('timekit'); 
    if(!timekit.time() || !timekit.cputime()) throw new Error('timekit broken');
  } 
  catch(err) { 
    timekit = undefined;
    this.error(err);
  }


  // initialize stats
  require('./stats').init();

  // initialize sync
  require('./sync').init();

  // initialze stdout dump
  if(this.stdout) require('./stdout')(this);

  // initialize dtrace
  if(this.dtrace) require('./dtrace')(this);


  // prepare probes
  var probes = {};
  var files = fs.readdirSync(path.dirname(require.resolve('./nodetime')) + '/probes');
  files.forEach(function(file) {
    var m = file.match('^(.*)+\.js$');
    if(m && m.length == 2) probes[m[1]] = true;
  });

  var proxy = require('./proxy');
  proxy.after(module.__proto__, 'require', function(obj, args, ret) {
    if(ret.__required__) return;

    var builtin = true;
    if(!args[0].match(/^[^\/\\]+$/)) {
      builtin = false;
    }

    if(!builtin) {
      path.exists(args[0] + '.probe', function(exists) {
        if(exists) {
          ret.__required__ = true; 
          require(args[0] + '.probe')(ret);
        }
      });
    }
    else if(probes[args[0]]) {
      ret.__required__ = true; 
      require('./probes/' + args[0])(ret);
    }
  });


  // broadcast token to all workers in a cluster
  if(!this.headless && !this.token) {
    if(this.master) {
      proxy.after(cluster, 'fork', function(obj, args, worker) {
        if(self.token) {
            worker.send({nodetimeToken: self.token});
            self.log('master ' + process.pid + ' sent token ' + self.token + ' to worker ' + worker.pid)
        }
        else {
          self.once('session', function(token) {
            worker.send({nodetimeToken: token});
            self.log('master ' + process.pid + ' sent token ' + token + ' to worker ' + worker.pid)
          });
        }
      });
    }
    else {
      process.on('message', function(msg) {
        if(!msg || !msg.nodetimeToken) return;

        self.token = msg.nodetimeToken;
        self.log('worker ' + process.pid + ' received token ' + msg.nodetimeToken + ' from master');
      });
    }  
  }


  // expose tools for non-builtin modules  
  this.proxy = require('./proxy');
  this.stats = require('./stats');
  this.sync = require('./sync');


  // always activate profiler at startup and pause if not resumed for 3 minutes
  this.resume(300);
  setInterval(function() {
    if(!self.paused && self.millis() > self.pauseAt) self.pause(); 
  }, 1000);


  // start sending system info  
  require('./info');
};


Nodetime.prototype.pause = function() {
  this.paused = true;
  this.pauseAt = undefined;

  this.message('profiler paused');
};


Nodetime.prototype.resume = function(seconds) {
  if(!seconds) seconds = 180;

  this.pauseAt = this.millis() + seconds * 1000;
  this.paused = false;

  this.message('profiler resumed for ' + seconds + ' seconds');
};


Nodetime.prototype.fire = function(event, scope, command) {
  this.stats.metrics()
};



Nodetime.prototype.micros = function() {
  return timekit ? timekit.time() : new Date().getTime() * 1000;
};


Nodetime.prototype.millis = function() {
  return timekit ? timekit.time() / 1000 : new Date().getTime();
};


Nodetime.prototype.cputime = function() {
  return timekit ? timekit.cputime() : undefined;
};


Nodetime.prototype.log = function(msg) {
  if(this.debug && msg) console.log('nodetime:', msg);
};


Nodetime.prototype.error = function(e) {
  if(this.debug && e) console.error('nodetime error:', e, e.stack);
};


Nodetime.prototype.dump = function(obj) {
  if(this.debug) console.log(util.inspect(obj, false, 10, true));
};


Nodetime.prototype.message = function(msg) {
  util.log("\033[1;31mNodetime:\033[0m " + msg);
};

