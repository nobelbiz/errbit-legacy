'use strict';

const AirbrakeNotice = require("airbrake-notice");
const notice         = AirbrakeNotice('2.3');
const http           = require('http');
const os             = require('os');

module.exports = class Airbrake {

  constructor({ host, port, key }) {
    this.host = host;
    this.key  = key;
    this.port = port || 80;
  }

  createXml(message) {
    let error = this.makeSureIsError(message);
    error     = this.fixBacktrace(error);
    let xml   = notice.create({
      apiKey: this.key,
      notifier: {
        name   : process.mainModule.filename,
        version: process.version,
      },
      error: {
        class    : error.stack.shift(),
        message  : error.message,
        backtrace: error.stack
      },
      request: {
        url      : os.hostname(),
        component: process.title,
        action   : process.argv[1],
        cgiData  : {
          argv        : JSON.stringify(process.argv),
          server_name : os.hostname(),
          free_memory : os.freemem(),
          memory_usage: JSON.stringify(process.memoryUsage()),
          load_avg    : os.loadavg(),
          up_time     : os.uptime(),
          versions    : JSON.stringify(process.versions),
        }
      },
      serverEnvironment: {
        name       : process.env.NODE_ENV || 'development',
        projectRoot: process.cwd(),
        appVersion : process.version
      }
    });
    return xml;
  }

  fixBacktrace(error) {
    let stack = error.stack.split('\n').map((entry, index) => {
      if (index === 0) {
        return entry.trim();
      } else {
        entry = entry.trim().replace(/^at\s/, '').replace(/[<>]/g, '').split(' ');
        let method = entry[1] ? entry[0] : '';
        let file   = entry[1] ? entry[1].slice(1, -1).split(':') : entry[0].split(':');
        return {
          method: method,
          file  : file[0],
          number: file[1]
        };
      }
    });
    return Object.assign(error, { stack: stack });
  }

  makeSureIsError(message) {
    if (message.message && message.stack) {
      return message;
    }
    let obj = {};
    try {
      throw new Error(message.message || message);
    } catch (err) {
      obj.message = message.message || err.message;
      obj.stack   = err.stack;
      return obj;
    }
  }

  sendMessage(message) {
    return new Promise((resolve, reject) => {
      let req = http.request({
        hostname: this.host,
        port    : this.port,
        path    : '/notifier_api/v2/notices',
        method  : 'POST',
        headers : {
          'Accept'        : 'text/xml, application/xml',
          'Content-Type'  : 'text/xml',
          'Content-Length': message.length
        }
      }, res => res.statusCode == 200 ? resolve() : reject(`${res.statusMessage}: ${res.statusMessage}`));
      req.write(message);
      req.end();
    });
  }

  notify(message) {
    return this.sendMessage(this.createXml(message));
  }

};
