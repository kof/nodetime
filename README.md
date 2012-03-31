Nodetime - Performance Profiler for Node.js
===

Nodetime reveals response time and other internals of HTTP requests and underlying HTTP/database calls in your Node.js application. Coupled with related process and OS state information it enables tracing performance problems down to the root cause. Nodetime supports multiple APIs including native HTTP client and sockets, Express, Socket.io, Redis, MongoDB and MySQL.

Nodetime profiler running within the application securely sends profiling data to the Nodetime server, where it is stored and sent to the browser in real-time. Profiling data is kept on the server only for 10 minutes.


## Installation and Usage

Install Nodetime with npm `npm install nodetime`. Ideally it should be the first require statement in your node application, e.g. at the first line of your main module `require('nodetime').profile()`. After your start your app, a link of the form `https://nodetime.com/[session]` will be printed to the console. The session will be your unique id for accessing the profiler server. Copy the link into your browser and you're done! No need to refresh the browser, new data will appear as it arrives from the profiler.


## Modes of Operation

Nodetime automatically detects if an application is running under constant load, e.g. production, or it is being tested or debugged. Under load Nodetime will capture and send only the slowest requests and related information. In debug mode it will send all requests to the profiler server. 

It is also possible to disable sending profiling data to the server and dump everything to the console by passing `stdout` flag at initialization `require('nodetime').profile({stdout: true})`


## Run-time Overhead</h3>

Nodetime is based on probes hooked into API calls and callbacks using wrappers. It measures time, adds variables and creates objects, which naturally causes overhead. Although, the probes are mostly attached around calls involving network communication and are triggered only during server requests, which makes the overhead insignificant. However, it is recommended to measure overhead for specific cases.



## License

Copyright (c) 2012 Dmitri Melikyan

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
