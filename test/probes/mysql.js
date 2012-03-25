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


var mysql = require('mysql');

var client = mysql.createClient({
	user: 'root',
	password: ''
});

module.exports = function(cb) {
	client.query('create database test_db', function(err) {
		if (err) {
			console.error(err);
		}

		client.query('use test_db', function(err) {
			client.query('create temporary table test_table (id int(11) auto_increment, test_field text, created datetime, primary key(id))', function(err) {
				if(err) {
					console.error(err);
					cb();
					return;
				}
	
				client.query('insert into test_table set test_field=?, created=?', ['data', '2012-03-25 10:00:00'], function(err) {
					if(err) {
						console.error(err);
						cb();
						return;
					}

					client.query('select * from test_table', function(err) {
						if(err) {
							console.error(err);
							cb();
							return;
						}
	
						cb();
					});
				});
			});
		});
	});
};

