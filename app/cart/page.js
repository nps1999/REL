'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ShoppingCart, Plus, Minus, X, ArrowRight, Trash2, Sparkles } from 'lucide-react'

const LOGO_URL = 'https://customer-assets.emergentagent.com/job_5bfed863-cc5b-467d-9502-6446bf9a8d11/artifacts/80xsas6y_Asset%205.png'

export default function CartPage() {
  const router = useRouter()
  const { status } = useSession()
  const [cart, setCart] = useState([])
  
  useEffect(() => {
    const savedCart = JSON.parse(localStorage.getItem('prestige_cart') || '[]')
    setCart(savedCart)
  }, [])
  
  const updateCart = (newCart) => {
    setCart(newCart)
    localStorage.setItem('prestige_cart', JSON.stringify(newCart))
  }
  
  const removeItem = (item) => {
    updateCart(cart.filter(i => `${i.id}-${i.optionId || ''}` !== `${item.id}-${item.optionId || ''}`))
  }
  
  const updateQty = (item, qty) => {
    if (qty <= 0) { removeItem(item); return }
    updateCart(cart.map(i => `${i.id}-${i.optionId || ''}` === `${item.id}-${item.optionId || ''}` ? { ...i, quantity: qty } : i))
  }
  
  const subtotal = cart.reduce((s, i) => s + (i.price * i.quantity), 0)
  
  return (
    <div className="min-h-screen bg-grid">
      <header className="glass-header sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-4">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm"><ArrowRight size={18} /></button>
          <Link href="/"><img src={LOGO_URL} alt="" className="h-8 w-8 object-contain" /></Link>
          <h1 className="text-white font-bold flex items-center gap-2 mr-auto">
            <ShoppingCart size={18} className="text-purple-400" />
            سلة التسوق ({cart.reduce((s, i) => s + i.quantity, 0)} منتج)
          </h1>
        </div>
      </header>
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        {cart.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingCart size={60} className="text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg mb-6">السلة فارغة</p>
            <Link href="/products">
              <button className="btn-primary px-8 py-3">تصفح المنتجات</button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {cart.map(item => (
                <div key={`${item.id}-${item.optionId || ''}`} className="glass-card p-4 flex gap-4">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-[#111827] flex-shrink-0">
                    {item.image ? <img src={item.image} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Sparkles size={24} className="text-purple-500/30" /></div>}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium mb-1">{item.title}</p>
                    {item.selectedOptionName && <p className="text-purple-300 text-xs mb-1">{item.selectedOptionName}</p>}
                    <p className="text-green-400 font-bold">${(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <button onClick={() => removeItem(item)} className="text-gray-500 hover:text-red-400 transition-colors">
                      <X size={16} />
                    </button>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQty(item, item.quantity - 1)} className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 text-sm">
                        <Minus size={12} />
                      </button>
                      <span className="text-white font-bold text-sm w-6 text-center">{item.quantity}</span>
                      <button onClick={() => updateQty(item, item.quantity + 1)} className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 text-sm">
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Summary */}
            <div className="glass-card p-6 h-fit sticky top-20">
              <h2 className="text-white font-bold mb-4">ملخص الطلب</h2>
              <div className="space-y-3 border-b border-white/10 pb-4 mb-4">
                {cart.map(item => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-gray-400 truncate flex-1 ml-2">{item.title} x{item.quantity}</span>
                    <span className="text-white">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-lg font-black mb-6">
                <span className="gradient-text">${subtotal.toFixed(2)}</span>
                <span className="text-white">الإجمالي</span>
              </div>
              <button
                onClick={() => router.push(status === 'authenticated' ? '/checkout' : '/auth/signin?callbackUrl=/checkout')}
                className="btn-primary w-full py-4 flex items-center justify-center gap-2"
              >
                <ShoppingCart size={18} />
                إتمام الدفع
              </button>
              <Link href="/products">
                <button className="w-full py-3 mt-3 text-center text-gray-400 hover:text-white text-sm transition-colors">
                  مواصلة التسوق
                </button>
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
