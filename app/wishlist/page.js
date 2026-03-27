'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Heart, ArrowRight, ShoppingCart, Plus, X, Sparkles } from 'lucide-react'

export default function WishlistPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [wishlist, setWishlist] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000) }
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }
    if (status === 'authenticated') {
      fetch('/api/wishlist')
        .then(r => r.json())
        .then(d => setWishlist(d.wishlist || []))
        .finally(() => setLoading(false))
    }
  }, [status, router])
  
  const removeFromWishlist = async (productId) => {
    await fetch('/api/wishlist/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId }),
    })
    setWishlist(prev => prev.filter(p => p.id !== productId))
    showToast('تمت الإزالة من المفضلة')
  }
  
  const addToCart = (product) => {
    const price = product.discount ? product.price * (1 - product.discount / 100) : product.price
    const existing = JSON.parse(localStorage.getItem('prestige_cart') || '[]')
    const exists = existing.find(i => i.id === product.id)
    if (exists) {
      localStorage.setItem('prestige_cart', JSON.stringify(existing.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)))
    } else {
      localStorage.setItem('prestige_cart', JSON.stringify([...existing, { id: product.id, title: product.title, price, image: product.image, quantity: 1, fulfillmentMode: product.fulfillmentMode || 'manual', fileUrl: product.fileUrl }]))
    }
    showToast('تمت الإضافة للسلة! 🛒')
  }
  
  if (status === 'loading' || loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="spinner" /></div>
  }
  
  return (
    <div className="min-h-screen bg-grid">
      {toast && (
        <div className="toast-notification">
          <Heart size={16} className="text-pink-400" />
          <span className="text-sm">{toast}</span>
        </div>
      )}
      
      <header className="glass-header sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-4">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm">
            <ArrowRight size={18} />رجوع
          </button>
          <h1 className="text-white font-bold flex items-center gap-2 mr-auto">
            <Heart size={18} className="text-pink-400" />
            المفضلة ({wishlist.length})
          </h1>
        </div>
      </header>
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        {wishlist.length === 0 ? (
          <div className="text-center py-20">
            <Heart size={60} className="text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-6">قائمة المفضلة فارغة</p>
            <Link href="/products">
              <button className="btn-primary px-8 py-3">تصفح المنتجات</button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {wishlist.map(product => {
              const discountPrice = product.discount ? product.price * (1 - product.discount / 100) : null
              return (
                <div key={product.id} className="glass-card group relative">
                  <button
                    onClick={() => removeFromWishlist(product.id)}
                    className="absolute top-3 left-3 z-10 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center text-gray-300 hover:text-red-400 hover:bg-red-500/20 transition-all"
                  >
                    <X size={12} />
                  </button>
                  
                  <Link href={`/products/${product.slug || product.id}`}>
                    <div className="aspect-video overflow-hidden rounded-t-xl bg-[#111827]">
                      {product.image ? (
                        <img src={product.image} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Sparkles size={30} className="text-purple-500/30" />
                        </div>
                      )}
                    </div>
                  </Link>
                  
                  <div className="p-3">
                    <Link href={`/products/${product.slug || product.id}`}>
                      <p className="text-white text-xs font-medium line-clamp-2 mb-2 hover:text-purple-300 transition-colors">{product.title}</p>
                    </Link>
                    <div className="flex items-center justify-between gap-1">
                      <div>
                        {discountPrice ? (
                          <div className="flex flex-col">
                            <span className="text-green-400 font-bold text-sm">${discountPrice.toFixed(2)}</span>
                            <span className="text-gray-500 text-xs line-through">${product.price?.toFixed(2)}</span>
                          </div>
                        ) : (
                          <span className="text-green-400 font-bold text-sm">${product.price?.toFixed(2)}</span>
                        )}
                      </div>
                      <button
                        onClick={() => addToCart(product)}
                        className="p-1.5 rounded-full bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
