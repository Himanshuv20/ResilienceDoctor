import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error)
    return Promise.reject(error)
  }
)

// API endpoints
export const apiEndpoints = {
  // Overview
  overview: () => api.get('/overview'),

  // Dependencies
  dependencies: {
    list: () => api.get('/dependencies'),
    create: (data: any) => api.post('/dependencies', data),
    getById: (id: string) => api.get(`/dependencies/${id}`),
    criticalPath: () => api.get('/dependencies/analysis/critical-path'),
  },

  // Metrics
  metrics: {
    create: (data: any) => api.post('/metrics', data),
    getByService: (serviceId: string, params?: any) => 
      api.get(`/metrics/${serviceId}`, { params }),
    compliance: () => api.get('/metrics/compliance/summary'),
  },

  // Scores
  scores: {
    list: () => api.get('/scores'),
    compute: () => api.post('/scores/compute'),
    getByService: (serviceId: string) => api.get(`/scores/${serviceId}`),
  },

  // Incidents
  incidents: {
    create: (data: any) => api.post('/incidents', data),
    upload: (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      return api.post('/incidents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    },
    summary: (params?: any) => api.get('/incidents/summary', { params }),
    getByService: (serviceId: string, params?: any) => 
      api.get(`/incidents/${serviceId}`, { params }),
  },

  // Recommendations
  recommendations: {
    list: () => api.get('/recommendations'),
    generate: () => api.post('/recommendations/generate'),
    getByService: (serviceId: string) => api.get(`/recommendations/${serviceId}`),
    updateStatus: (id: string, status: string) => 
      api.patch(`/recommendations/${id}/status`, { status }),
  },

  // Configuration
  config: {
    list: () => api.get('/config'),
    get: (key: string) => api.get(`/config/${key}`),
    update: (key: string, data: any) => api.put(`/config/${key}`, data),
    reload: () => api.post('/config/reload'),
    defaults: () => api.post('/config/defaults'),
  },
}