const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, errors } = format;

const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} ${level}: ${stack || message}`;
});

const logger = createLogger({
  level: 'info', // minimum level to log
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),  // log error stack traces
    logFormat
  ),
  transports: [
    new transports.File({ filename: 'logs/error.log', level: 'error' }), // errors only
    new transports.File({ filename: 'logs/combined.log' })               // all logs
  ]
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new transports.Console({
      format: format.simple()
    }));
  }

module.exports = logger;
