import axios from 'axios'

const API_BASE_URL = 'http://localhost:3000/api'

// Configure axios defaults
axios.defaults.baseURL = API_BASE_URL

// Request interceptor to add token
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle errors
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const authAPI = {
  login: (credentials) => axios.post('/auth/login', credentials),
  register: (userData) => axios.post('/auth/register', userData),
  me: () => axios.get('/auth/me'),
  logout: () => axios.post('/auth/logout')
}

export const emergencyAPI = {
  createAlert: (alertData) => axios.post('/emergency/alert', alertData),
  getActiveAlerts: () => axios.get('/emergency/active-alerts'),
  acceptAlert: (alertId, volunteerId) => 
    axios.post(`/emergency/accept/${alertId}`, { volunteerId }),
  rejectAlert: (alertId, volunteerId) => 
    axios.post(`/emergency/reject/${alertId}`, { volunteerId }),
  uploadVideo: (formData) => 
    axios.post('/emergency/upload-video', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
}

export default axios