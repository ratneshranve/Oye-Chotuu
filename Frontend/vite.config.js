import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const foodSrc = path.resolve(__dirname, './src/modules/Food')
const servicesApi = path.resolve(__dirname, './src/services/api')
const sharedSrc = path.resolve(__dirname, './src/shared')
const coreSrc = path.resolve(__dirname, './src/core')

const createFirebaseWebConfig = (env) => ({
  VITE_FIREBASE_API_KEY: env.VITE_FIREBASE_API_KEY || '',
  VITE_FIREBASE_AUTH_DOMAIN: env.VITE_FIREBASE_AUTH_DOMAIN || '',
  VITE_FIREBASE_PROJECT_ID: env.VITE_FIREBASE_PROJECT_ID || '',
  VITE_FIREBASE_STORAGE_BUCKET: env.VITE_FIREBASE_STORAGE_BUCKET || '',
  VITE_FIREBASE_MESSAGING_SENDER_ID: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  VITE_FIREBASE_APP_ID: env.VITE_FIREBASE_APP_ID || '',
  VITE_FIREBASE_MEASUREMENT_ID: env.VITE_FIREBASE_MEASUREMENT_ID || '',
})

const firebaseWebConfigPlugin = (env) => {
  const source = `${JSON.stringify(createFirebaseWebConfig(env), null, 2)}\n`

  return {
    name: 'firebase-web-config',
    configureServer(server) {
      server.middlewares.use('/firebase-web-config.json', (_req, res) => {
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.setHeader('Cache-Control', 'no-store')
        res.end(source)
      })
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'firebase-web-config.json',
        source,
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '')

  return {
    plugins: [react(), tailwindcss(), firebaseWebConfigPlugin(env)],
    resolve: {
    // Triggering dev server refresh to clear module cache
    alias: {
      // More specific first so @food/api/* resolves to services (no backend)
      '@food/api/axios': path.resolve(servicesApi, 'axios.js'),
      '@food/api/config': path.resolve(servicesApi, 'config.js'),
      '@food/api': servicesApi,
      '@food': foodSrc,
      '@shared': sharedSrc,
      '@core': coreSrc,
      '@quickCommerce': path.resolve(__dirname, './src/modules/quickCommerce'),
      '@delivery': path.resolve(__dirname, './src/modules/DeliveryV2'),
      'lottie-web': path.resolve(__dirname, './node_modules/lottie-web/build/player/lottie_light.js'),

      '@common': path.resolve(__dirname, './src/modules/common'),
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom', 'react-router-dom'],
  },
    optimizeDeps: {
    include: [
      '@emotion/react',
      '@emotion/styled',
      '@mui/material',
      '@mui/x-date-pickers',
    ],
  },
    server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      // Backend API (default 5000)
      '/api/v1': {
        target: env.VITE_BACKEND_PROXY_TARGET || 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
    build: {
      chunkSizeWarningLimit: 1000,
    },
  }
})
