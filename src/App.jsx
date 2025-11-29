import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import FormBuilder from './pages/FormBuilder'
import FormViewer from './pages/FormViewer'
import FormResponses from './pages/FormResponses'
import './styles/main.css'
import './App.css'

function App() {
  return (
    <Router>
      <div className="app-wrapper">
        <nav className="navbar">
          <div className="container navbar-content">
            <div className="nav-brand">
              <Link to="/" className="nav-link" style={{ color: 'var(--primary)' }}>
                Form Builder
              </Link>
            </div>
            <div className="nav-links">
              <Link to="/" className="nav-link">Builder</Link>
              <span style={{ color: 'var(--border)' }}>|</span>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Routes: /form/:formId | /forms/:formId/responses
              </span>
            </div>
          </div>
        </nav>
        <div className="container">
          <Routes>
            <Route path="/" element={<FormBuilder />} />
            <Route path="/form/:formId" element={<FormViewer />} />
            <Route path="/forms/:formId/responses" element={<FormResponses />} />
          </Routes>
        </div>
      </div>
    </Router>
  )
}

export default App
