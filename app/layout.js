import './globals.css'
import { SessionProvider } from './session-provider'
import DynamicFavicon from '@/components/DynamicFavicon'

export const metadata = {
  title: 'RELOAD STORE',
  description: 'RELOAD STORE',
  icons: {
    icon: 'https://customer-assets.emergentagent.com/job_5bfed863-cc5b-467d-9502-6446bf9a8d11/artifacts/80xsas6y_Asset%205.png',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl" className="dark">
      <head>
        <script dangerouslySetInnerHTML={{__html:'window.addEventListener("error",function(e){if(e.error instanceof DOMException&&e.error.name==="DataCloneError"&&e.message&&e.message.includes("PerformanceServerTiming")){e.stopImmediatePropagation();e.preventDefault()}},true);'}} />
      </head>
      <body className="bg-[#0B0F14] text-[#F9FAFB]">
        <DynamicFavicon />
        <SessionProvider>
          {/* Background orbs */}
          <div className="bg-orbs" aria-hidden="true">
            <div className="orb orb-1" />
            <div className="orb orb-2" />
            <div className="orb orb-3" />
          </div>
          <div className="relative z-10">
            {children}
          </div>
        </SessionProvider>
      </body>
    </html>
  )
}
