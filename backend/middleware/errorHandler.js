// middleware/errorHandler.js
const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  logger.error('Request error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  let statusCode = err.statusCode || 500;
  let message = 'An unexpected error occurred';
  let userMessage = 'We encountered a difficulty creating your meditation session. Please try again.';

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    userMessage = 'Please check your request and try again.';
  }

  if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Unauthorized';
    userMessage = 'Authentication required.';
  }

  const isProduction = process.env.NODE_ENV === 'production';

  res.status(statusCode).json({
    success: false,
    error: message,
    message: userMessage,
    ...(isProduction ? {} : { 
      details: err.message,
      stack: err.stack 
    })
  });
}

module.exports = { errorHandler };