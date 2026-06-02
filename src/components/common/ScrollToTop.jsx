import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export default function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    // Reset any browser zoom accumulated from pinch-gestures or overflowing
    // elements on the previous page — re-setting the viewport meta tag
    // forces Chrome and Safari to return to initial-scale=1.
    const viewport = document.querySelector('meta[name="viewport"]')
    if (viewport) {
      viewport.setAttribute('content', 'width=device-width, initial-scale=1.0')
    }
  }, [pathname])
  return null
}
