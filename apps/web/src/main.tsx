import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { ensureKitStyles } from '@driverhub/ui'
import './index.css'
import { App } from './App'
import { installMockIfNeeded, setupWebApp } from './lib/telegram'

// Kit animations + tokens, Telegram SDK niceties, browser dev shim.
ensureKitStyles()
setupWebApp()
installMockIfNeeded()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
)