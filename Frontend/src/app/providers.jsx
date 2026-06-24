import { BrowserRouter, HashRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import { StrictMode } from 'react'
import { Provider as ReduxProvider } from 'react-redux'
import { store } from './store'
import { ThemeProvider } from 'next-themes'
import { AuthProvider } from '@core/context/AuthContext'
import { SettingsProvider } from '@core/context/SettingsContext'
import { ToastProvider } from '@shared/components/ui/Toast'
import { getCurrentAppPath, isNativeLikeShell } from '@core/navigation/appLocation'

export function AppProviders({ children }) {
  const isHashRouter = isNativeLikeShell()

  if (isHashRouter && typeof window !== 'undefined') {
    const currentHash = String(window.location.hash || '')
    const currentPath = getCurrentAppPath()

    if (!currentHash.startsWith('#/') && currentPath && currentPath !== '/') {
      window.history.replaceState(null, '', `#${currentPath}${window.location.search}`)
    }
  }

  const Router = isHashRouter ? HashRouter : BrowserRouter

  return (
    <StrictMode>
      <ThemeProvider 
        attribute="class" 
        defaultTheme="light" 
        storageKey="appTheme"
        enableSystem={false}
      >
        <AuthProvider>
          <SettingsProvider>
            <ToastProvider>
              <ReduxProvider store={store}>
                <Router>
                  {children}
                  <Toaster position="top-center" richColors offset="80px" />
                </Router>
              </ReduxProvider>
            </ToastProvider>
          </SettingsProvider>
        </AuthProvider>
      </ThemeProvider>
    </StrictMode>
  )
}