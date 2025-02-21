import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'


import { AuthProvider } from './Authentication/AuthProvider'
import { RouterProvider } from 'react-router-dom'
import { router } from './RootRoute/RootRoute'


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
   <RouterProvider router={router}>

   </RouterProvider>
    </AuthProvider>
  </StrictMode>,
)
