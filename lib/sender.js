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

exports.init = function() {

  nt.valuesBuffer = [];
  nt.samplesBuffer = [];

  nt.on('value', function(value) {
    if(!nt.headless)
      nt.valuesBuffer.push(value);
  });

  nt.on('sample', function(sample) {
    if(!nt.headless && nt.token)
      nt.samplesBuffer.push(sample);
  });


  if(!nt.token) {
    nt.on('session', function(token) {

    });
  }

  setInterval(function() {
    try {
      sendValues();
      sendSamples();
    }
    catch(e) {
      nt.error(e);
    }
  }, 1000);


  // empty buffer if no token for more than 30 sec
  setInterval(function() {
    try {
      if(!nt.token) 
        nt.valuesBuffer = [];
    }
    catch(e) {
      nt.error(e);
    }
  }, 30000);
};


var sendValues = function() {
  if(!nt.token || nt.valuesBuffer.length == 0) return;

  nt.valuesBuffer.forEach(function(value) {
    nt.agent.send(value);
  });

  nt.valuesBuffer = [];
};


var sendSamples = function() {
  if(nt.samplesBuffer.length == 0) return;

  var slowest = nt.samplesBuffer;
  slowest = slowest.sort(function(a, b) {
    return b._ms - a._ms;
  });

  for(var i = 0; i < (slowest.length < 10 ? slowest.length : 10); i++) {
    nt.agent.send(slowest[i]);
  }

  nt.samplesBuffer = [];
};


