import React from 'react'
import { useNavigate } from 'react-router-dom'

export default function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="page-content page-enter" style={{ textAlign: 'center', paddingTop: 80 }}>
      <div style={{ fontSize: 80, marginBottom: 16 }}>⚽</div>
      <h1 className="fw-600" style={{ fontSize: 32, marginBottom: 8 }}>404 — Off Target!</h1>
      <p className="text-muted mb-24" style={{ fontSize: 16 }}>
        This page went wide. Let's get you back on the pitch.
      </p>
      <button className="btn btn-gold btn-lg" onClick={() => navigate('/')}>
        🏠 Back to Home
      </button>
    </div>
  )
}
