import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '$frontend/index.css'
import '$frontend/i18n/config'
import App from '$frontend/App.tsx'

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>
)
