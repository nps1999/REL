'use client'
import { useEffect } from 'react'

export default function DynamicFavicon() {
  useEffect(() => {
    // Fetch settings to get logo
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.logo) {
          // Update favicon
          let link = document.querySelector("link[rel~='icon']")
          if (!link) {
            link = document.createElement('link')
            link.rel = 'icon'
            document.head.appendChild(link)
          }
          link.href = data.logo
          
          // Also update apple-touch-icon
          let appleLink = document.querySelector("link[rel~='apple-touch-icon']")
          if (!appleLink) {
            appleLink = document.createElement('link')
            appleLink.rel = 'apple-touch-icon'
            document.head.appendChild(appleLink)
          }
          appleLink.href = data.logo
        }
      })
      .catch(err => console.error('Failed to load favicon:', err))
  }, [])
  
  return null
}
