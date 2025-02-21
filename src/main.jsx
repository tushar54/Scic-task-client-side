import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'


import { AuthProvider } from './Authentication/AuthProvider'
import { RouterProvider } from 'react-router-dom'
import { router } from './RootRoute/RootRoute'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient();
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router}>
        </RouterProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
