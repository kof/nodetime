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


var pg = require('pg').native;


module.exports = function(cb) {
  pg.connect("tcp://postgres:postgres@localhost/postgres", function(err, client) {
    if(err) {
      console.error(err);
      cb();
      return;
    }

    client.query('create database test_db', function(err) {
      if (err) {
        console.error(err);
      }

      client.query('create temporary table test_table (str_field varchar(10), int_field integer, date_field timestamptz)', function(err) {
        if(err) {
          console.error(err);
        }
  
        client.query('insert into test_table (str_field, int_field, date_field) values ($1, $2, $3)', ['data', 123, new Date()], function(err) {
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
            client.close();
          });
        });
      });
    });
  });


  var client = new pg.Client("tcp://postgres:postgres@localhost/postgres");
  client.connect();


  var query = client.query('create temporary table test_table (str_field varchar(10), int_field integer, date_field timestamptz)');

  query.on('row', function(row) {
    console.log(row);
  });

  query.on('error', function(err) {
    console.error(err);
  });

  query.on('end', function() {
  });


  var query = client.query('errorgeneratingcommand');

  query.on('row', function(row) {
    console.log(row);
  });

  query.on('error', function(err) {
    console.error(err);
  });

  query.on('end', function() {
  });


};

