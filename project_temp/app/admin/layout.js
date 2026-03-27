'use client'
import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'
import {
  LayoutDashboard, Package, Tag, ShoppingBag, Users,
  Star, Settings, Percent, ArrowRight, Shield, Menu, X
} from 'lucide-react'
import { useState } from 'react'

const LOGO_URL = 'https://customer-assets.emergentagent.com/job_5bfed863-cc5b-467d-9502-6446bf9a8d11/artifacts/80xsas6y_Asset%205.png'

const navItems = [
  { href: '/admin', label: 'لوحة التحكم', icon: LayoutDashboard },
  { href: '/admin/products', label: 'المنتجات', icon: Package },
  { href: '/admin/categories', label: 'التصنيفات', icon: Tag },
  { href: '/admin/orders', label: 'الطلبات', icon: ShoppingBag },
  { href: '/admin/users', label: 'المستخدمون', icon: Users },
  { href: '/admin/reviews', label: 'التقييمات', icon: Star },
  { href: '/admin/discounts', label: 'أكواد الخصم', icon: Percent },
  { href: '/admin/settings', label: 'الإعدادات', icon: Settings },
]

export default function AdminLayout({ children }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }
    if (status === 'authenticated' && session?.user?.role !== 'admin') {
      router.push('/')
    }
  }, [status, session, router])
  
  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center"><div className="spinner" /></div>
  }
  
  if (session?.user?.role !== 'admin') return null
  
  return (
    <div className="min-h-screen flex bg-[#050508]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      
      {/* Sidebar */}
      <aside className={`fixed top-0 right-0 h-full w-64 z-50 flex flex-col transition-transform duration-300 ${
        sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
      }`} style={{ background: 'rgba(5, 5, 12, 0.95)', backdropFilter: 'blur(30px)', borderLeft: '1px solid rgba(139, 92, 246, 0.15)' }}>
        
        {/* Logo */}
        <div className="p-5 border-b border-purple-500/10">
          <div className="flex items-center gap-3">
            <img src={LOGO_URL} alt="PRESTIGE" className="h-10 w-10 object-contain" />
            <div>
              <div className="text-sm font-black gradient-text">PRESTIGE</div>
              <div className="text-xs text-gray-500">لوحة التحكم</div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="mr-auto text-gray-500 lg:hidden">
              <X size={18} />
            </button>
          </div>
        </div>
        
        {/* Admin info */}
        <div className="p-4 border-b border-purple-500/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full overflow-hidden border border-purple-500/30">
              {session?.user?.image ? (
                <img src={session.user.image} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-violet-600 to-pink-500 flex items-center justify-center">
                  <Shield size={16} className="text-white" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-medium truncate">{session?.user?.name}</p>
              <p className="text-purple-400 text-xs">مدير النظام</p>
            </div>
          </div>
        </div>
        
        {/* Nav */}
        <nav className="flex-1 p-3 overflow-y-auto">
          <div className="space-y-1">
            {navItems.map(item => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}>
                  <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-gradient-to-r from-violet-600/30 to-purple-500/20 border border-purple-500/30 text-purple-300'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}>
                    <Icon size={18} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </nav>
        
        {/* Back to store */}
        <div className="p-4 border-t border-purple-500/10">
          <Link href="/">
            <div className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors cursor-pointer">
              <ArrowRight size={16} />
              العودة للمتجر
            </div>
          </Link>
        </div>
      </aside>
      
      {/* Main Content */}
      <div className="flex-1 lg:mr-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <div className="glass-header h-14 flex items-center px-4 gap-4 sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-400 hover:text-white"
          >
            <Menu size={20} />
          </button>
          <h1 className="text-white font-bold text-sm">
            {navItems.find(n => n.href === pathname)?.label || 'لوحة التحكم'}
          </h1>
        </div>
        
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
