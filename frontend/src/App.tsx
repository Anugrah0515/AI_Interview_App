import { BrowserRouter, Route, Routes } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import InterviewSetup from './pages/InterviewSetup'
import InterviewRoom from './pages/InterviewRoom'
import ResultsDashboard from './pages/ResultDashboard'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/setup" element={<InterviewSetup />} />
        <Route
          path="/interview/:interviewId"
          element={<InterviewRoom />}
        />
        <Route path="/results/:interviewId" element={<ResultsDashboard />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
