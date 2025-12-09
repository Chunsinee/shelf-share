import axios from 'axios';

const instance = axios.create({
  baseURL: `${import.meta.env.VITE_API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json'
  }
});

instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    console.log("🔑 Request:", config.method.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

instance.interceptors.response.use(
  (response) => {
    console.log("✅ Response:", response.config.url, response.status);
    return response;
  },
  (error) => {
    console.error("❌ Error:", error.response?.status, error.response?.data);

    if ((error.response?.status === 401 || error.response?.status === 403) && !error.config.url.includes('/login')) {
      
      localStorage.removeItem('token')
      
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error); 
  }
);

export default instance;