import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css' // Aquí solo se importa como estilo global, no se muestra

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)