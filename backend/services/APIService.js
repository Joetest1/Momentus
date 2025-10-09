// services/APIService.js
const logger = require('../utils/logger');

class APIService {
  constructor() {
    this.queues = new Map();
    this.config = {
      maxConcurrent: 3,
      retryAttempts: 3,
      retryDelay: 1000,
      timeout: 30000
    };
    
    // ============================================================
    // API REQUEST DELAY CONFIGURATION
    // ============================================================
    // This delay ensures we don't overwhelm external APIs
    // and stay well within rate limits.
    // 
    // CURRENT SETTING: 1.1 seconds between requests
    // 
    // TO MODIFY: Change the value below (in milliseconds)
    // - 1100 = 1.1 seconds (current)
    // - 1000 = 1 second
    // - 2000 = 2 seconds
    // 
    // This can also be set via environment variable:
    // API_REQUEST_DELAY_MS=1100
    // ============================================================
    this.requestDelay = parseInt(process.env.API_REQUEST_DELAY_MS) || 1500;
    this.lastRequestTime = 0;
    // ============================================================
  }

  async queueRequest(queueName, requestFn, options = {}) {
    if (!this.queues.has(queueName)) {
      this.queues.set(queueName, {
        pending: [],
        active: 0,
        stats: { total: 0, success: 0, failed: 0 }
      });
    }

    const queue = this.queues.get(queueName);
    const config = { ...this.config, ...options };

    return new Promise((resolve, reject) => {
      const task = {
        requestFn,
        config,
        resolve,
        reject,
        attempts: 0,
        queuedAt: Date.now()
      };

      queue.pending.push(task);
      queue.stats.total++;
      
      this.processQueue(queueName);
    });
  }

  async processQueue(queueName) {
    const queue = this.queues.get(queueName);
    if (!queue) return;

    while (queue.active < this.config.maxConcurrent && queue.pending.length > 0) {
      const task = queue.pending.shift();
      queue.active++;

      this.executeTask(queueName, task)
        .then(result => {
          queue.active--;
          queue.stats.success++;
          task.resolve(result);
          this.processQueue(queueName);
        })
        .catch(error => {
          queue.active--;
          
          if (task.attempts < task.config.retryAttempts) {
            task.attempts++;
            logger.warn(`Retrying request in queue ${queueName}, attempt ${task.attempts}`, {
              error: error.message
            });
            
            setTimeout(() => {
              queue.pending.unshift(task);
              this.processQueue(queueName);
            }, task.config.retryDelay * task.attempts);
          } else {
            queue.stats.failed++;
            logger.error(`Request failed in queue ${queueName} after ${task.attempts} attempts`, {
              error: error.message
            });
            task.reject(error);
            this.processQueue(queueName);
          }
        });
    }
  }

  async executeTask(queueName, task) {
    const { requestFn, config } = task;
    
    // ============================================================
    // ENFORCE API REQUEST DELAY
    // ============================================================
    // Wait for the configured delay since the last request
    // to prevent overwhelming external APIs
    // ============================================================
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.requestDelay) {
      const waitTime = this.requestDelay - timeSinceLastRequest;
      logger.debug(`Delaying API request by ${waitTime}ms to respect rate limits`);
      await this.sleep(waitTime);
    }
    
    this.lastRequestTime = Date.now();
    // ============================================================
    
    return Promise.race([
      requestFn(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), config.timeout)
      )
    ]);
  }

  // ============================================================
  // HELPER: Sleep utility for delays
  // ============================================================
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  // ============================================================

  getQueueStats(queueName) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      return { error: 'Queue not found' };
    }

    return {
      queueName,
      pending: queue.pending.length,
      active: queue.active,
      stats: queue.stats,
      timestamp: new Date().toISOString()
    };
  }

  getAllStats() {
    const stats = {};
    for (const [name, queue] of this.queues.entries()) {
      stats[name] = {
        pending: queue.pending.length,
        active: queue.active,
        ...queue.stats
      };
    }
    return {
      queues: stats,
      requestDelay: this.requestDelay,
      timestamp: new Date().toISOString()
    };
  }

  clearQueue(queueName) {
    const queue = this.queues.get(queueName);
    if (!queue) return false;

    queue.pending = [];
    logger.info(`Cleared queue: ${queueName}`);
    return true;
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    logger.info('API Service configuration updated', { config: this.config });
  }
  
  // ============================================================
  // UPDATE REQUEST DELAY
  // ============================================================
  // Use this method to change the delay between API requests
  // at runtime without restarting the server
  // ============================================================
  updateRequestDelay(delayMs) {
    this.requestDelay = delayMs;
    logger.info(`API request delay updated to ${delayMs}ms`);
  }
  // ============================================================
}

const instance = new APIService();

module.exports = instance;