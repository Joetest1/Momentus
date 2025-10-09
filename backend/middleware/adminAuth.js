// middleware/adminAuth.js
const logger = require('../utils/logger');

function adminAuth(req, res, next) {
  const allowedIPs = (process.env.ADMIN_ALLOWED_IPS || '127.0.0.1,::1')
    .split(',')
    .map(ip => ip.trim());

  const clientIP = req.ip || req.connection.remoteAddress;

  if (!allowedIPs.includes(clientIP)) {
    logger.warn('Unauthorized admin access attempt', { 
      ip: clientIP,
      path: req.path 
    });

    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: 'Access denied. Admin routes are IP-restricted.'
    });
  }

  next();
}

module.exports = { adminAuth };