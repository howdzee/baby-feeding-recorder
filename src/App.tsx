import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import AddRecord from './pages/AddRecord'
import History from './pages/History'
import Stats from './pages/Stats'

export default function App() {
  return (
    <div className="min-h-screen bg-warm-50 text-ink-900">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/add" element={<AddRecord />} />
        <Route path="/history" element={<History />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
