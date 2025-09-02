/**
 * Authentication retry utility for handling token expiration and network issues
 */

export class AuthRetryManager {
  constructor(maxRetries = 3, baseDelay = 1000) {
    this.maxRetries = maxRetries;
    this.baseDelay = baseDelay;
  }

  /**
   * Retry a function with exponential backoff
   * @param {Function} fn - Function to retry
   * @param {Object} context - Context for logging
   * @returns {Promise} - Result of the function or throws error
   */
  async retry(fn, context = {}) {
    let lastError;
    
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        // Don't retry on certain errors
        if (this.shouldNotRetry(error)) {
          console.error(`Non-retryable error in ${context.operation}:`, error);
          throw error;
        }
        
        // If this was the last attempt, throw the error
        if (attempt === this.maxRetries) {
          console.error(`Max retries (${this.maxRetries}) exceeded for ${context.operation}:`, error);
          throw error;
        }
        
        // Calculate delay with exponential backoff
        const delay = this.baseDelay * Math.pow(2, attempt);
        console.warn(`Attempt ${attempt + 1} failed for ${context.operation}, retrying in ${delay}ms:`, error.message);
        
        await this.sleep(delay);
      }
    }
    
    throw lastError;
  }

  /**
   * Check if error should not be retried
   * @param {Error} error - Error to check
   * @returns {boolean} - True if should not retry
   */
  shouldNotRetry(error) {
    // Don't retry authentication errors (user needs to re-authenticate)
    if (error.code === 'auth/invalid-user-token' || 
        error.code === 'auth/user-token-expired' ||
        error.code === 'auth/user-disabled') {
      return true;
    }
    
    // Don't retry 4xx errors (except 401 which might be temporary)
    if (error.status >= 400 && error.status < 500 && error.status !== 401) {
      return true;
    }
    
    // Don't retry WebSocket close codes that indicate permanent failure
    if (error.code === 1003 || error.code === 1007 || error.code === 1008) {
      return true;
    }
    
    return false;
  }

  /**
   * Sleep for specified milliseconds
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise} - Promise that resolves after delay
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retry Firebase token refresh
   * @param {Object} user - Firebase user object
   * @returns {Promise<string>} - Fresh token
   */
  async retryTokenRefresh(user) {
    return this.retry(
      async () => {
        if (!user) {
          throw new Error('User not authenticated');
        }
        return await user.getIdToken(true); // Force refresh
      },
      { operation: 'token_refresh' }
    );
  }

  /**
   * Retry WebSocket connection with authentication
   * @param {Function} connectFn - Function that creates WebSocket connection
   * @param {Object} authData - Authentication data
   * @returns {Promise<WebSocket>} - Connected WebSocket
   */
  async retryWebSocketConnection(connectFn, authData) {
    return this.retry(
      async () => {
        const ws = await connectFn();
        
        // Wait for connection to open
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('WebSocket connection timeout'));
          }, 10000);
          
          ws.onopen = () => {
            clearTimeout(timeout);
            resolve();
          };
          
          ws.onerror = (error) => {
            clearTimeout(timeout);
            reject(error);
          };
        });
        
        // Send authentication
        ws.send(JSON.stringify(authData));
        
        // Wait for auth confirmation
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('WebSocket authentication timeout'));
          }, 5000);
          
          const handleMessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              if (data.type === 'auth_success') {
                clearTimeout(timeout);
                ws.removeEventListener('message', handleMessage);
                resolve();
              } else if (data.type === 'auth_failed') {
                clearTimeout(timeout);
                ws.removeEventListener('message', handleMessage);
                reject(new Error(data.message || 'Authentication failed'));
              }
            } catch (e) {
              // Ignore parsing errors for other messages
            }
          };
          
          ws.addEventListener('message', handleMessage);
        });
        
        return ws;
      },
      { operation: 'websocket_connection' }
    );
  }
}

// Export singleton instance
export const authRetryManager = new AuthRetryManager();

// Export utility functions
export const retryWithAuth = (fn, context) => authRetryManager.retry(fn, context);
export const retryTokenRefresh = (user) => authRetryManager.retryTokenRefresh(user);
export const retryWebSocketConnection = (connectFn, authData) => 
  authRetryManager.retryWebSocketConnection(connectFn, authData);
