import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  validateStatus: function (status) {
    // Treat 400 as a valid response to prevent console errors
    // We'll handle validation errors manually in the response interceptor
    return status >= 200 && status < 500;
  },
});

// Add request interceptor to include auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to unwrap the backend's {statusCode, success, data} wrapper
apiClient.interceptors.response.use(
  (response) => {
    // Handle 400 errors manually (since we configured validateStatus to treat them as valid)
    if (response.status === 400) {
      // Create a plain object error structure (not Error instance) to avoid console logging
      return Promise.reject({
        response,
        message: response.data?.message || 'Bad Request',
        isAxiosError: true,
        config: response.config,
      });
    }
    
    // If response has the data wrapper, unwrap it
    if (response.data && typeof response.data === 'object' && 'data' in response.data) {
      response.data = response.data.data;
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);
