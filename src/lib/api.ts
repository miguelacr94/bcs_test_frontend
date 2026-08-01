import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to handle global backend wrappers and errors
api.interceptors.response.use(
  (response) => {
    // The NestJS API Gateway wraps all responses in { statusCode: number, data: any }
    // We unwrap it here so the rest of the frontend receives the expected raw data.
    if (response.data && response.data.statusCode && response.data.data !== undefined) {
      response.data = response.data.data;
    }
    return response;
  },
  (error) => {
    // You can handle global errors here
    return Promise.reject(error);
  }
);
