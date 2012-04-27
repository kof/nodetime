var d = require('dtrace-provider');

var dtp = d.createDTraceProvider("nodeapp");
dtp.addProbe("probe1", "int", "int");
dtp.addProbe("probe2", "char *");
dtp.enable();      
dtp.fire("probe1", function() { return [1, 2]; });
dtp.fire("probe2", function() { return ["hello, dtrace"]; });

