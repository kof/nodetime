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


var proxy = require('../proxy');
var stats = require('../stats');

var nt = global._nodetime;


module.exports = function(obj) {
	if(obj.version && obj.version.match(/^3\./)) return; // after 3.0 no need for express probe

	var handler = function() {
		return function(req, res, next) {
			try {
				var begin = new Date().getTime();	
				var time = stats.time(true);
				proxy.after(res, 'end', function(obj, args) {
					if(!time.measure()) return;

					stats.value('HTTP Server', 'Requests per minute', 1, undefined, 'sum');
					stats.value('HTTP Server', 'Average response time', time.ms, 'ms', 'avg');
					stats.sample(time, {'Type': 'HTTP', 
							'Method': req.method, 
							'URL': req.url, 
							'Request headers': req.headers, 
							'Status code': res.statusCode}, 
							req.url);
				});
			}
			catch(err) {
				nt.error(err);
			}		

			next();
		}
	};

	proxy.after(obj, 'createServer', function(obj, args, ret) {
		ret.configure(function() {
			ret.use(handler());
		});
	});
};

