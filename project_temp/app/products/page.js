'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Search, Heart, ShoppingCart, Plus, Filter, ArrowRight, X, Sparkles, Check } from 'lucide-react'

const LOGO_URL = 'https://customer-assets.emergentagent.com/job_5bfed863-cc5b-467d-9502-6446bf9a8d11/artifacts/80xsas6y_Asset%205.png'

function ProductsContent() {
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [activeCategory, setActiveCategory] = useState(searchParams.get('category') || '')
  const [wishlistIds, setWishlistIds] = useState([])
  const [toast, setToast] = useState(null)
  
  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }
  
  useEffect(() => {
    Promise.all([
      fetch('/api/products?limit=200').then(r => r.json()),
      fetch('/api/categories').then(r => r.json()),
      session?.user ? fetch('/api/wishlist').then(r => r.json()) : Promise.resolve({ wishlist: [] }),
    ]).then(([productsData, catsData, wishlistData]) => {
      setProducts(productsData?.products || [])
      setCategories(Array.isArray(catsData) ? catsData : [])
      setWishlistIds((wishlistData?.wishlist || []).map(p => p.id))
    }).finally(() => setLoading(false))
  }, [session])
  
  const addToCart = (product) => {
    const price = product.discount ? product.price * (1 - product.discount / 100) : product.price
    const existing = JSON.parse(localStorage.getItem('prestige_cart') || '[]')
    const exists = existing.find(i => i.id === product.id)
    if (exists) {
      localStorage.setItem('prestige_cart', JSON.stringify(existing.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)))
    } else {
      localStorage.setItem('prestige_cart', JSON.stringify([...existing, { id: product.id, title: product.title, price, image: product.image, quantity: 1, fileUrl: product.fileUrl }]))
    }
    showToast('تمت الإضافة للسلة! 🛒')
  }
  
  const toggleWishlist = async (product) => {
    if (!session?.user) { router.push('/auth/signin'); return }
    const res = await fetch('/api/wishlist/toggle', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: product.id }) })
    const data = await res.json()
    if (data.added) { setWishlistIds(prev => [...prev, product.id]); showToast('تمت الإضافة للمفضلة ❤️') }
    else { setWishlistIds(prev => prev.filter(id => id !== product.id)); showToast('تمت الإزالة', 'info') }
  }
  
  const filtered = products.filter(p => {
    const matchCat = !activeCategory || p.categories?.includes(activeCategory)
    const matchSearch = !search || p.title?.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })
  
  return (
    <div className="min-h-screen bg-grid">
      {toast && (
        <div className="toast-notification">
          {toast.type === 'success' ? <Check size={16} className="text-green-400" /> : <Sparkles size={16} className="text-purple-400" />}
          <span className="text-sm">{toast.msg}</span>
        </div>
      )}
      
      <header className="glass-header sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-4">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm"><ArrowRight size={18} /></button>
          <Link href="/"><img src={LOGO_URL} alt="" className="h-8 w-8 object-contain" /></Link>
          <form onSubmit={e => e.preventDefault()} className="flex-1 max-w-sm">
            <div className="relative">
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث عن تصميم..." className="glass-input text-sm pl-8 py-2 rounded-full" />
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              {search && <button type="button" onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"><X size={14} /></button>}
            </div>
          </form>
          <Link href="/cart">
            <div className="header-icon-btn"><ShoppingCart size={16} /></div>
          </Link>
        </div>
      </header>
      
      {/* Categories */}
      <div className="glass-header border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-2 py-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            <button onClick={() => setActiveCategory('')} className={`nav-item flex-shrink-0 ${!activeCategory ? 'active' : ''}`}>الكل</button>
            {categories.map(cat => (
              <button key={cat.id} onClick={() => setActiveCategory(activeCategory === cat.id ? '' : cat.id)} className={`nav-item flex-shrink-0 ${activeCategory === cat.id ? 'active' : ''}`}>{cat.name}</button>
            ))}
          </div>
        </div>
      </div>
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <p className="text-gray-400 text-sm">{filtered.length} منتج</p>
          {(search || activeCategory) && (
            <button onClick={() => { setSearch(''); setActiveCategory('') }} className="text-purple-400 text-xs flex items-center gap-1 hover:text-purple-300">
              <X size={12} />إلغاء الفلتر
            </button>
          )}
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Sparkles size={48} className="text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">لا توجد منتجات</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map(product => {
              const dp = product.discount ? product.price * (1 - product.discount / 100) : null
              const isInWishlist = wishlistIds.includes(product.id)
              return (
                <div key={product.id} className="product-card group">
                  <Link href={`/products/${product.slug || product.id}`}>
                    <div className="relative aspect-video overflow-hidden rounded-t-xl bg-[#0d0d1a]">
                      {product.image ? <img src={product.image} alt={product.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" /> : <div className="w-full h-full flex items-center justify-center"><Sparkles size={30} className="text-purple-500/30" /></div>}
                      {product.discount && <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">-{product.discount}%</div>}
                      {product.featured && <div className="absolute top-2 left-2 bg-gradient-to-r from-violet-600 to-purple-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">⭐</div>}
                    </div>
                  </Link>
                  <div className="p-3">
                    <Link href={`/products/${product.slug || product.id}`}>
                      <p className="text-white text-xs font-medium line-clamp-2 mb-2 hover:text-purple-300">{product.title}</p>
                    </Link>
                    <div className="flex items-center justify-between gap-1">
                      <div>{dp ? <div><span className="text-green-400 font-bold text-sm">${dp.toFixed(2)}</span><span className="text-gray-500 text-xs line-through mr-1">${product.price?.toFixed(2)}</span></div> : <span className="text-green-400 font-bold text-sm">${product.price?.toFixed(2)}</span>}</div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => toggleWishlist(product)} className={`p-1.5 rounded-full transition-all ${isInWishlist ? 'bg-pink-500/20 text-pink-400' : 'bg-white/5 text-gray-400'}`}><Heart size={13} className={isInWishlist ? 'fill-current' : ''} /></button>
                        <button onClick={() => addToCart(product)} className="p-1.5 rounded-full bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-all"><Plus size={13} /></button>
                      </div>
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

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="spinner" /></div>}>
      <ProductsContent />
    </Suspense>
  )
}
