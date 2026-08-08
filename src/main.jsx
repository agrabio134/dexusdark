import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import AdminPanel from './components/AdminPanel.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {window.location.pathname === '/auth/admin' ? <AdminPanel /> : <App />}
  </React.StrictMode>,
)
