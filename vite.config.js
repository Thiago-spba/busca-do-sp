import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Busca DO-SP — E.E. Prof. Simão Mathias',
        short_name: 'Busca DO-SP',
        description: 'Plataforma de busca no Diário Oficial do Estado de São Paulo — E.E. Prof. Simão Mathias',
        theme_color: '#1e40af',
        background_color: '#f4f7f9',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/icon-512.jpg',
            sizes: '512x512',
            type: 'image/jpeg',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
})
