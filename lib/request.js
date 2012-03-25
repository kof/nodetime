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


var http = require('http');
var https = require('https');
var url = require('url');

exports.get = function(urlStr, callback) {
	exports.request('GET', urlStr, null, callback);
}

exports.post = function(urlStr, data, callback) {
	exports.request('POST', urlStr, data, callback);
}

exports.request = function(method, urlStr, data, callback) {
	var parts = url.parse(urlStr, false);
	var secure = parts.protocol.match('^https');

	var headers = {};
	if(method == 'POST') {
		if(typeof data === 'object') {
			data = JSON.stringify(data);
			headers['Content-type'] = 'application/json';
		}
		else {
			headers['Content-type'] = 'application/x-www-form-urlencoded';
		}

		headers['Content-length'] = data.length;
	}

	var options = {
		host: parts.hostname,
		port: parts.port,
		path: parts.pathname + (parts.search || ''),
		method: method,
		headers: headers
	};

	var req = (secure ? https : http).request(options, function(res) {
		if(res.statusCode != 200) {
			callback('failed loading url ' + urlStr + ' with status code ' + res.statusCode);
			return;
		}
		
		var buf = '';
		res.on('data', function (chunk) { 
			buf += chunk; 
		});

		res.on('end', function (chunk) {
			callback(null, res.headers, buf);
		});
	});

	req.on('error', function(e) {
		callback('failed requesting url ' + urlStr);
	});

	if(data) {
		req.write(data);
	}

	req.end();
};
