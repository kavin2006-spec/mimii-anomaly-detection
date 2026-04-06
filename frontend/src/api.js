import axios from 'axios'

const api = axios.create({ baseURL: 'http://localhost:8000' })

export const getSummary = (machineType = 'fan', machineId = 'id_00', noiseLevel = '6dB') =>
  api.get(`/analytics/summary?machine_type=${machineType}&machine_id=${machineId}&noise_level=${encodeURIComponent(noiseLevel)}`)

export const getModelComparison = (noiseLevel = '6dB', machineType = 'fan', machineId = 'id_00') =>
  api.get(`/analytics/model-comparison?noise_level=${encodeURIComponent(noiseLevel)}&machine_type=${machineType}&machine_id=${machineId}`)

export const getScoreDistribution = (model = 'autoencoder', noiseLevel = '6dB', machineType = 'fan', machineId = 'id_00') =>
  api.get(`/analytics/score-distribution?model_name=${model}&noise_level=${encodeURIComponent(noiseLevel)}&machine_type=${machineType}&machine_id=${machineId}`)

export const getMachines = () => api.get('/machines/')

export const predictFile = (file, machineType = 'fan', noiseLevel = '6dB') => {
  const form = new FormData()
  form.append('file', file)
  return api.post(
    `/predictions/predict?machine_type=${machineType}&noise_level=${encodeURIComponent(noiseLevel)}`,
    form
  )
}

export const getNoiseComparison = (machineType = 'fan', machineId = 'id_00') =>
  api.get(`/analytics/noise-comparison?machine_type=${machineType}&machine_id=${machineId}`)