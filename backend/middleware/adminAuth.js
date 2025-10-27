// middleware/adminAuth.js
const logger = require('../utils/logger');

function adminAuth(req, res, next) {
  // Get credentials from environment
  const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme123';

  // Get the Authorization header
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    // No credentials provided - request them
    res.setHeader('WWW-Authenticate', 'Basic realm="Momentus Admin"');
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      message: 'Please provide admin credentials.'
    });
  }

  // Decode the Base64 credentials
  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
  const [username, password] = credentials.split(':');

  // Verify credentials
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    logger.info('Admin authentication successful', { 
      username,
      ip: req.ip,
      path: req.path 
    });
    return next();
  }

  // Invalid credentials
  logger.warn('Failed admin authentication attempt', { 
    username,
    ip: req.ip,
    path: req.path 
  });

  res.setHeader('WWW-Authenticate', 'Basic realm="Momentus Admin"');
  return res.status(401).json({
    success: false,
    error: 'Authentication failed',
    message: 'Invalid username or password.'
  });
}

module.exports = { adminAuth };