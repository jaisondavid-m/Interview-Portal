import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Automatically send & receive HTTP cookies for JWT authentication
  timeout: 10000,
});

// Response interceptor
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message || 'Something went wrong';
    const code = error.response?.data?.code;

    // Dispatch global session invalidation event if session expired / terminated / overridden
    if (status === 401) {
      // Don't trigger session invalidated redirect during login attempt itself
      const requestUrl = error.config?.url || '';
      if (!requestUrl.includes('/auth/login') && !requestUrl.includes('/auth/me')) {
        window.dispatchEvent(
          new CustomEvent('sessionInvalidated', {
            detail: {
              message: message || 'Your session has ended. Please log in again.',
              code: code || 'UNAUTHORIZED',
            },
          })
        );
      }
    }

    return Promise.reject(new Error(message));
  }
);

export default api;
