import React, { useState, useEffect } from 'react'
import AppRoutes from './routes'
import SplashScreen from '@/components/ui/SplashScreen'
import { getCurrentAppPath } from '@core/navigation/appLocation'

function App() {
  const [showSplash, setShowSplash] = useState(false)

  useEffect(() => {
    const hasSeen = sessionStorage.getItem('hasSeenSplash')
    
    const effectivePath = getCurrentAppPath();
    
    // Determine if the route belongs to the user panel (exclude admin, seller, restaurant, and delivery)
    const isUserRoute = 
      !effectivePath.startsWith('/admin') && 
      !effectivePath.startsWith('/seller') && 
      !effectivePath.startsWith('/food/restaurant') && 
      !effectivePath.startsWith('/food/delivery')

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
