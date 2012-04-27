var profiler = require('v8-profiler');
  
profiler.startProfiling("nodetime");
setTimeout(function() {
  var cpuProfile = profiler.stopProfiling("nodetime")   //finish cpu profiling
  console.log(cpuProfile);
}, 6000);

function slow() {
  for(var i = 0; i < 1000000000; i++) {
  }
}

slow();
