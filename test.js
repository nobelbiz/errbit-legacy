const { Airbrake, AirbrakeTransport } = require('./index');
const winston = require('winston');

const log = new (winston.Logger)({transports: [
  new (winston.transports.Console)({
    handleExceptions               : true,
    humanReadableUnhandledException: true,
    colorize                       : false,
    prettyPrint                    : true,
    level                          : 'info',
    timestamp                      : true
  }),
  new AirbrakeTransport({
     host : process.env.ERRBIT_HOST,
     key  : process.env.ERRBIT_KEY,
     level: 'info'
  })
]});

log.info('test', 'fdaf');
