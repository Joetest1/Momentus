// server.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const sessionRoutes = require('./routes/sessionRoutes');
const adminRoutes = require('./routes/adminRoutes');
const adminDashboardRoutes = require('./routes/adminDashboardRoutes');
const { errorHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-hashes'"],
      scriptSrcAttr: ["'self'", "'unsafe-inline'", "'unsafe-hashes'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"]
    }
  }
}));
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));

const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || (process.env.NODE_ENV === 'development' ? '10000' : '100'), 10);
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || String(15 * 60 * 1000), 10);

const limiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX,
  message: 'Too many requests, please try again later.'
});

// During local development, disable the global API rate limiter to avoid blocking tests.
if (process.env.NODE_ENV === 'development' || process.env.DISABLE_RATE_LIMIT === 'true') {
  logger.info('API rate limiter disabled for development/testing');
} else {
  app.use('/api/', limiter);
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    deployment: 'v2-static-paths-fix' // Added to verify deployment
  });
});

// Serve static files first - use absolute paths
const publicPath = path.join(__dirname, 'public');
const audioPath = path.join(__dirname, 'audio');
logger.info('Static file paths configured', { publicPath, audioPath });
app.use(express.static(publicPath));
app.use('/audio', express.static(audioPath));  // Serve audio files

// Serve the main user interface at root (this will be handled by static middleware now)
// app.get('/', (req, res) => {
//   res.sendFile(path.join(__dirname, 'public', 'index.html'));
// });

app.use('/api/sessions', sessionRoutes);
app.use('/admin', adminRoutes);
app.use('/api/admin', adminDashboardRoutes);

// 404 handler - must be AFTER static middleware so static files can be served
app.use((req, res) => {
  // Only return JSON 404 for API routes, otherwise send a generic message
  if (req.path.startsWith('/api/') || req.path.startsWith('/admin/')) {
    res.status(404).json({ 
      error: 'Route not found',
      message: 'The requested endpoint does not exist.'
    });
  } else {
    res.status(404).send('404 - Page not found');
  }
});

app.use(errorHandler);

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

app.listen(PORT, () => {
  logger.info(`Momentus backend running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;