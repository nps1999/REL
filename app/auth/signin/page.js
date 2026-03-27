'use client'
import { signIn } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { Sparkles, Zap } from 'lucide-react'
import Link from 'next/link'

const LOGO_URL = 'https://customer-assets.emergentagent.com/job_5bfed863-cc5b-467d-9502-6446bf9a8d11/artifacts/80xsas6y_Asset%205.png'

export default function SignInPage() {
  const [loading, setLoading] = useState(null)
  const [callbackUrl, setCallbackUrl] = useState('/')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const nextCallback = new URLSearchParams(window.location.search).get('callbackUrl') || '/'
    setCallbackUrl(nextCallback)
  }, [])

  const handleSignIn = async (provider) => {
    setLoading(provider)
    await signIn(provider, { callbackUrl })
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-grid">
      {/* Background glow */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      
      <div className="glass-strong rounded-3xl p-8 w-full max-w-md relative overflow-hidden">
        {/* Decorative glow */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-purple-500/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-pink-500/10 rounded-full blur-2xl" />
        
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="logo-container">
              <img src={LOGO_URL} alt="RELOAD STORE" className="h-20 w-20 object-contain" />
            </div>
          </div>
          <h1 className="text-2xl font-black gradient-text">RELOAD STORE</h1>
          <p className="text-purple-300 text-sm mt-1">RELOAD STORE</p>
          <p className="text-gray-400 text-sm mt-3">RELOAD STORE</p>
        </div>
        
        {/* Sign In Options */}
        <div className="space-y-4">
          <h2 className="text-center text-white font-semibold mb-6">تسجيل الدخول</h2>
          
          {/* Google */}
          <button
            onClick={() => handleSignIn('google')}
            disabled={loading === 'google'}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-6 rounded-2xl glass border border-white/10 hover:border-purple-400/40 hover:bg-purple-500/5 transition-all group"
          >
            {loading === 'google' ? (
              <div className="spinner w-5 h-5" style={{width: 20, height: 20}} />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            <span className="text-white font-medium">متابعة مع Google</span>
          </button>
          
          {/* Discord */}
          <button
            onClick={() => handleSignIn('discord')}
            disabled={loading === 'discord'}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-6 rounded-2xl bg-[#5865F2]/20 border border-[#5865F2]/30 hover:bg-[#5865F2]/30 transition-all group"
          >
            {loading === 'discord' ? (
              <div className="spinner w-5 h-5" style={{width: 20, height: 20}} />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#5865F2">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.001.022.01.04.027.055a19.9 19.9 0 0 0 5.993 3.03.077.077 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
              </svg>
            )}
            <span className="text-white font-medium">متابعة مع Discord</span>
          </button>
        </div>
        
        {/* Info */}
        <div className="mt-8 text-center">
          <p className="text-gray-500 text-xs leading-relaxed">
            بتسجيلك، أنت توافق على شروط الاستخدام وسياسة الخصوصية
          </p>
        </div>
        
        <div className="mt-4 text-center">
          <Link href="/" className="text-purple-400 hover:text-purple-300 text-sm transition-colors">
            العودة للمتجر
          </Link>
        </div>
      </div>
    </div>
  )
}
