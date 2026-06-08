import React, { useState, useEffect } from 'react'
import AppRoutes from './routes'
import SplashScreen from '@/components/ui/SplashScreen'

function App() {
  const [showSplash, setShowSplash] = useState(false)

  useEffect(() => {
    const hasSeen = sessionStorage.getItem('hasSeenSplash')
    const pathname = window.location.pathname || '/'
    
    // Determine if the route belongs to the user panel (exclude admin, seller, restaurant, and delivery)
    const isUserRoute = 
      !pathname.startsWith('/admin') && 
      !pathname.startsWith('/seller') && 
      !pathname.startsWith('/food/restaurant') && 
      !pathname.startsWith('/food/delivery')

    if (!hasSeen && isUserRoute) {
      setShowSplash(true)
    }
  }, [])

  const handleSplashComplete = () => {
    sessionStorage.setItem('hasSeenSplash', 'true')
    setShowSplash(false)
  }

  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />
  }

  return <AppRoutes />
}

export default App
