import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { Dependencies } from './pages/Dependencies'
import { Metrics } from './pages/Metrics'
import { Incidents } from './pages/Incidents'
import { Recommendations } from './pages/Recommendations'
import { Settings } from './pages/Settings'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dependencies" element={<Dependencies />} />
        <Route path="/metrics" element={<Metrics />} />
        <Route path="/incidents" element={<Incidents />} />
        <Route path="/recommendations" element={<Recommendations />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Layout>
  )
}

export default App