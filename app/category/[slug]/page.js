'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import CategoriesNav from '@/components/CategoriesNav'
import {
  Search, ShoppingCart, Heart, Package, Star, User, Sparkles, Zap,
  Check, X, Plus, Minus, Award, Shield, LogOut, ChevronLeft, Bell
} from 'lucide-react'

const LOGO_URL = 'https://customer-assets.emergentagent.com/job_5bfed863-cc5b-467d-9502-6446bf9a8d11/artifacts/80xsas6y_Asset%205.png'

function Toast({ message, type = 'success', onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t) }, [onClose])

  return (
    <div className={`toast-notification ${type === 'error' ? 'border-red-500/30 text-red-400' : type === 'info' ? 'border-purple-500/30 text-purple-400' : 'border-green-500/30 text-green-400'}`}>
      {type === 'success' && <Check size={18} className="text-green-400 flex-shrink-0" />}
      {type === 'error' && <X size={18} className="text-red-400 flex-shrink-0" />}
      {type === 'info' && <Sparkles size={18} className="text-purple-400 flex-shrink-0" />}
      <span className="font-medium text-sm">{message}</span>
    </div>
  )
}

function ProductCard({ product, onAddToCart, onToggleWishlist, wishlistIds = [] }) {
  const [hovering, setHovering] = useState(false)
  const isInWishlist = wishlistIds.includes(product.id)
  const discountPrice = product.discount ? product.price * (1 - product.discount / 100) : null

  return (
    <div className="product-card group cursor-pointer" onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)} data-testid={`product-card-${product.slug || product.id}`}>
      <Link href={`/products/${product.slug || product._id}`}>
        <div className="relative aspect-square overflow-hidden rounded-t-xl bg-[#0d0d1a]">
          {product.image ? <img src={product.image} alt={product.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" /> : <div className="w-full h-full flex items-center justify-center"><Sparkles size={40} className="text-purple-500/40" /></div>}
          {product.discount > 0 && <div className="absolute top-2 sm:top-3 right-2 sm:right-3 bg-gradient-to-r from-red-500 to-pink-500 text-white text-[10px] sm:text-xs font-bold px-2 py-0.5 sm:py-1 rounded-full">-{product.discount}%</div>}
          {product.featured && <div className="absolute top-2 sm:top-3 left-2 sm:left-3 bg-gradient-to-r from-violet-600 to-purple-500 text-white text-[10px] sm:text-xs font-bold px-2 py-0.5 sm:py-1 rounded-full flex items-center gap-0.5 sm:gap-1"><Zap size={8} /> مميز</div>}
        </div>
      </Link>
      <div className="p-2.5 sm:p-4">
        <Link href={`/products/${product.slug || product._id}`}>
          <h3 className="font-semibold text-white text-xs sm:text-sm mb-1.5 sm:mb-2 line-clamp-2 hover:text-purple-300 transition-colors">{product.title}</h3>
        </Link>
        <div className="flex items-center justify-between gap-1">
          <div>
            {discountPrice ? (
              <div className="flex flex-col">
                <span className="text-green-400 font-bold text-sm sm:text-lg">${discountPrice.toFixed(2)}</span>
                <span className="text-gray-500 text-[10px] sm:text-xs line-through">${product.price?.toFixed(2)}</span>
              </div>
            ) : (
              <span className="text-green-400 font-bold text-sm sm:text-lg">{product.price === 0 ? 'مجاني' : `$${product.price?.toFixed(2) || '0.00'}`}</span>
            )}
          </div>
          <div className={`flex gap-1.5 sm:gap-2 transition-all duration-300 ${hovering ? 'opacity-100 translate-y-0' : 'sm:opacity-0 sm:translate-y-2 opacity-100'}`}>
            <button onClick={(e) => { e.preventDefault(); onToggleWishlist(product) }}
              className={`p-1.5 sm:p-2 rounded-full transition-all ${isInWishlist ? 'bg-pink-500/20 text-pink-400 border border-pink-500/40' : 'bg-white/5 text-gray-400 border border-white/10'}`}>
              <Heart size={13} className={isInWishlist ? 'fill-current' : ''} />
            </button>
            <button onClick={(e) => { e.preventDefault(); onAddToCart(product) }}
              className="px-2 sm:px-3 py-1.5 rounded-full bg-gradient-to-r from-violet-600 to-purple-500 text-white text-[10px] sm:text-xs font-bold hover:shadow-lg transition-all flex items-center gap-0.5">
              <Plus size={10} /> سلة
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Header({ cart, wishlistCount, session, onCartOpen, settings }) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [accountOpen, setAccountOpen] = useState(false)
  const [deliveredAlertCount, setDeliveredAlertCount] = useState(0)

  useEffect(() => {
    if (!session?.user) {
      setDeliveredAlertCount(0)
      return
    }

    fetch('/api/orders/unseen-delivered-count')
      .then(r => r.json())
      .then(data => setDeliveredAlertCount(data?.count || 0))
      .catch(() => setDeliveredAlertCount(0))
  }, [session?.user])

  const [searchOpen, setSearchOpen] = useState(false)
  const loyaltyPoints = session?.user?.loyaltyPoints || 0
  const logo = settings?.logo || LOGO_URL

  const handleSearch = (e) => { e.preventDefault(); if (searchQuery.trim()) { router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`); setSearchOpen(false) } }

  return (
    <header className="glass-header sticky top-0 z-50" data-testid="category-header">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center gap-2 sm:gap-4">
        <Link href="/" className="flex-shrink-0"><img src={logo} alt="PRESTIGE DESIGNS" className="h-9 sm:h-12 w-auto object-contain" /></Link>
        <form onSubmit={handleSearch} className="hidden md:block flex-1 max-w-md mx-auto">
          <div className="relative"><input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="ابحث عن تصميم..." className="glass-input pl-10 pr-4 py-2.5 text-sm rounded-full w-full" /><button type="submit" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><Search size={16} /></button></div>
        </form>
        <div className="flex-1 md:hidden" />
        <div className="flex items-center gap-1 sm:gap-2">
          <button onClick={() => setSearchOpen(!searchOpen)} className="md:hidden header-icon-btn !w-8 !h-8 sm:!w-9 sm:!h-9"><Search size={16} /></button>
          <Link href="/wishlist"><div className="header-icon-btn !w-8 !h-8 sm:!w-9 sm:!h-9"><Heart size={16} />{wishlistCount > 0 && <span className="header-badge !text-[8px] !min-w-[14px] !h-[14px]">{wishlistCount}</span>}</div></Link>
          <button onClick={onCartOpen}><div className="header-icon-btn !w-8 !h-8 sm:!w-9 sm:!h-9"><ShoppingCart size={16} />{cart.length > 0 && <span className="header-badge !text-[8px] !min-w-[14px] !h-[14px]">{cart.reduce((s, i) => s + i.quantity, 0)}</span>}</div></button>
          <Link href="/orders" className="hidden sm:block"><div className="header-icon-btn !w-8 !h-8 sm:!w-9 sm:!h-9 relative"><Package size={16} />{deliveredAlertCount > 0 && <span className="absolute -top-1 -left-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">{deliveredAlertCount > 9 ? '9+' : deliveredAlertCount}</span>}</div></Link>
          {session?.user && <Link href="/loyalty" className="hidden sm:block"><div className="header-icon-btn !w-8 !h-8 sm:!w-9 sm:!h-9"><Award size={16} /></div></Link>}
          <div className="relative">
            <button onClick={() => setAccountOpen(!accountOpen)}><div className="header-icon-btn !w-8 !h-8 sm:!w-9 sm:!h-9">{session?.user?.image ? <img src={session.user.image} alt="" className="w-6 h-6 sm:w-7 sm:h-7 rounded-full" /> : <User size={16} />}</div></button>
            {accountOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setAccountOpen(false)} />
                <div className="absolute left-0 top-10 sm:top-12 w-48 sm:w-52 glass border border-purple-500/20 rounded-2xl overflow-hidden z-50 shadow-2xl">
                  {session?.user ? (
                    <>
                      <div className="p-3 sm:p-4 border-b border-white/10"><p className="text-white font-semibold text-xs sm:text-sm truncate">{session.user.name}</p><p className="text-gray-400 text-xs truncate">{session.user.email}</p></div>
                      <div className="p-1.5 sm:p-2">
                        <Link href="/orders" onClick={() => setAccountOpen(false)}><div className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 text-gray-300 text-xs sm:text-sm transition-colors cursor-pointer"><Package size={14} />طلباتي</div></Link>
                        {session.user.role === 'admin' && <Link href="/admin" onClick={() => setAccountOpen(false)}><div className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-purple-500/10 text-purple-400 text-xs sm:text-sm transition-colors cursor-pointer"><Shield size={14} />لوحة التحكم</div></Link>}
                        <Link href="/api/auth/signout" onClick={() => setAccountOpen(false)}><div className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-500/10 text-gray-300 hover:text-red-400 text-xs sm:text-sm transition-colors cursor-pointer"><LogOut size={14} />تسجيل الخروج</div></Link>
                      </div>
                    </>
                  ) : (
                    <div className="p-3 sm:p-4"><p className="text-gray-400 text-sm mb-3 text-center">أهلاً بك!</p><Link href="/auth/signin"><button className="btn-primary w-full py-2 text-sm text-center">تسجيل الدخول</button></Link></div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      {searchOpen && (
        <div className="md:hidden px-3 pb-3 border-t border-white/5">
          <form onSubmit={handleSearch} className="relative mt-2"><input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="ابحث عن تصميم..." className="glass-input pl-10 pr-4 py-2.5 text-sm rounded-full w-full" autoFocus /><button type="submit" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><Search size={16} /></button></form>
        </div>
      )}
    </header>
  )
}

function CartSidebar({ cart, onClose, onRemove, onQuantityChange }) {
  const router = useRouter()
  const total = cart.reduce((s, i) => s + (i.price * i.quantity), 0)
  return (
    <>
      <div className="cart-overlay" onClick={onClose} />
      <div className="cart-panel">
        <div className="flex items-center justify-between mb-6">
          <button onClick={onClose} className="text-gray-400 hover:text-white p-2 rounded-full"><X size={20} /></button>
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2"><ShoppingCart size={20} className="text-purple-400" />سلة التسوق ({cart.length})</h2>
        </div>
        {cart.length === 0 ? <div className="flex flex-col items-center justify-center h-64 text-center"><ShoppingCart size={48} className="text-gray-600 mb-4" /><p className="text-gray-400">السلة فارغة</p></div> : (
          <>
            <div className="space-y-4 flex-1 overflow-y-auto mb-6">
              {cart.map(item => (
                <div key={`${item.id}-${item.optionId || ''}`} className="glass p-3 flex gap-3">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden bg-[#0d0d1a] flex-shrink-0">{item.image ? <img src={item.image} alt={item.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Sparkles size={20} className="text-purple-500/40" /></div>}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs sm:text-sm font-medium line-clamp-2 mb-1">{item.title}</p>
                    <div className="flex items-center justify-between"><span className="text-green-400 font-bold text-sm">${(item.price * item.quantity).toFixed(2)}</span>
                      <div className="flex items-center gap-2"><button onClick={() => onQuantityChange(item, item.quantity - 1)} className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center"><Minus size={10} /></button><span className="text-white text-sm w-5 text-center">{item.quantity}</span><button onClick={() => onQuantityChange(item, item.quantity + 1)} className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center"><Plus size={10} /></button></div>
                    </div>
                  </div>
                  <button onClick={() => onRemove(item)} className="text-gray-600 hover:text-red-400 flex-shrink-0"><X size={14} /></button>
                </div>
              ))}
            </div>
            <div className="border-t border-white/10 pt-4 space-y-3">
              <div className="flex justify-between text-white font-bold text-lg"><span className="gradient-text">${total.toFixed(2)}</span><span>الإجمالي</span></div>
              <button onClick={() => { onClose(); router.push('/checkout') }} className="btn-primary w-full py-3 text-center flex items-center justify-center gap-2"><ShoppingCart size={18} />إتمام الدفع</button>
            </div>
          </>
        )}
      </div>
    </>
  )
}

function Footer({ settings }) {
  const year = new Date().getFullYear()
  const logo = settings?.logo || LOGO_URL
  return (
    <footer className="border-t border-white/5 py-8 sm:py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-4"><img src={logo} alt="PRESTIGE DESIGNS" className="h-10 sm:h-12 w-auto object-contain" /><h2 className="text-lg sm:text-xl font-bold" style={{ background: 'linear-gradient(135deg, #9333ea 0%, #c026d3 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>PRESTIGE DESIGNS</h2></div>
            <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">وجهة صناع المحتوى الأولى، نمزج السحر بالفن ليرتقي لذوقك الرفيع.</p>
          </div>
          <div>
            <h3 className="text-white font-bold mb-3 sm:mb-4 text-sm">روابط سريعة</h3>
            <div className="space-y-2">{[['/', 'الرئيسية'],['/products', 'جميع المنتجات'],['/orders', 'طلباتي'],['/loyalty', 'نقاط الولاء'],['/wishlist', 'المفضلة']].map(([href, label]) => <Link key={href} href={href} className="block text-gray-400 hover:text-purple-300 text-xs sm:text-sm transition-colors">{label}</Link>)}</div>
          </div>
          <div>
            <h3 className="text-white font-bold mb-3 sm:mb-4 text-sm">طرق الدفع الآمنة</h3>
            <div className="flex gap-3 flex-wrap mb-4"><div className="glass px-3 py-2 rounded-lg"><img src="https://www.paypalobjects.com/webstatic/icon/pp258.png" alt="PayPal" className="h-5 sm:h-6 w-auto" /></div><div className="glass px-3 py-2 rounded-lg"><img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-5 sm:h-6 w-auto" /></div></div>
            <div className="flex items-center gap-2 glass px-3 py-2 rounded-lg w-fit"><Check size={14} className="text-green-400" /><span className="text-green-400 text-xs sm:text-sm font-medium">هذا المتجر موثوق</span></div>
          </div>
        </div>
        <div className="border-t border-white/5 pt-4 sm:pt-6"><p className="text-gray-500 text-xs sm:text-sm text-center">&copy; {year} PRESTIGE DESIGNS. جميع الحقوق محفوظة.</p></div>
      </div>
    </footer>
  )
}

export default function CategoryPage() {
  const { data: session } = useSession()
  const params = useParams()
  const router = useRouter()
  const [category, setCategory] = useState(null)
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(true)
  const [cart, setCart] = useState([])
  const [wishlistIds, setWishlistIds] = useState([])
  const [cartOpen, setCartOpen] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = useCallback((msg, type = 'success') => { setToast({ msg, type, id: Date.now() }) }, [])

  useEffect(() => { const s = localStorage.getItem('prestige_cart'); if (s) { try { setCart(JSON.parse(s)) } catch {} } }, [])
  useEffect(() => { localStorage.setItem('prestige_cart', JSON.stringify(cart)) }, [cart])

  useEffect(() => { fetchData() }, [params.slug])
  useEffect(() => {
    if (session?.user) { fetch('/api/wishlist').then(r => r.json()).then(data => setWishlistIds((data.wishlist || []).map(p => p.id))).catch(() => {}) }
  }, [session])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [catRes, settingsRes] = await Promise.all([fetch('/api/categories').then(r => r.json()), fetch('/api/settings').then(r => r.json())])
      const allCategories = Array.isArray(catRes) ? catRes : catRes.categories || []
      setCategories(allCategories)
      setSettings(settingsRes || {})
      const currentCat = allCategories.find(c => c.slug === params.slug || c.id === params.slug || c._id === params.slug)
      setCategory(currentCat)
      if (currentCat) {
        const prodRes = await fetch(`/api/products?category=${currentCat.id}`)
        const prodData = await prodRes.json()
        setProducts(prodData.products || [])
      } else { setProducts([]) }
    } catch (error) { console.error('Error:', error) } finally { setLoading(false) }
  }

  const addToCart = (product) => {
    const price = product.discount ? product.price * (1 - product.discount / 100) : product.price
    setCart(prev => {
      const existing = prev.find(i => i.id === (product._id || product.id))
      if (existing) { showToast('تم تحديث الكمية', 'info'); return prev.map(i => i.id === (product._id || product.id) ? { ...i, quantity: i.quantity + 1 } : i) }
      showToast('تمت الإضافة للسلة!'); return [...prev, { id: product._id || product.id, slug: product.slug, title: product.title, price, image: product.image, quantity: 1, fileUrl: product.fileUrl }]
    })
  }

  const toggleWishlist = async (product) => {
    if (!session?.user) { router.push('/auth/signin'); return }
    try {
      const res = await fetch('/api/wishlist/toggle', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: product.id }) })
      const data = await res.json()
      if (data.added) { setWishlistIds(prev => [...prev, product.id]); showToast('تمت الإضافة للمفضلة') }
      else { setWishlistIds(prev => prev.filter(id => id !== product.id)); showToast('تمت الإزالة', 'info') }
    } catch { showToast('خطأ ما', 'error') }
  }

  const removeFromCart = (item) => setCart(prev => prev.filter(i => `${i.id}-${i.optionId || ''}` !== `${item.id}-${item.optionId || ''}`))
  const updateQuantity = (item, qty) => { if (qty <= 0) { removeFromCart(item); return } setCart(prev => prev.map(i => `${i.id}-${i.optionId || ''}` === `${item.id}-${item.optionId || ''}` ? { ...i, quantity: qty } : i)) }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#050508]"><div className="text-center"><div className="spinner mx-auto mb-4" /><p className="text-purple-400 font-medium">جاري التحميل...</p></div></div>

  return (
    <div className="min-h-screen bg-grid" data-testid="category-page">
      {toast && <Toast key={toast.id} message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <Header cart={cart} wishlistCount={wishlistIds.length} session={session} onCartOpen={() => setCartOpen(true)} settings={settings} />
      <CategoriesNav categories={categories} currentCategoryId={category?.id || category?._id} />
      {cartOpen && <CartSidebar cart={cart} onClose={() => setCartOpen(false)} onRemove={removeFromCart} onQuantityChange={updateQuantity} />}

      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="flex items-center gap-1.5 sm:gap-2 mb-4 sm:mb-6 text-xs sm:text-sm">
          <Link href="/" className="text-gray-400 hover:text-purple-400 transition-colors whitespace-nowrap">الرئيسية</Link>
          <ChevronLeft size={12} className="text-gray-600 flex-shrink-0" />
          <span className="text-purple-300 font-medium truncate">{category?.name || 'القسم'}</span>
        </div>

        <div className="mb-6 sm:mb-8" data-testid="category-title">
          <h1 className="text-2xl sm:text-3xl font-black text-white mb-1.5 sm:mb-2">{category?.name || 'المنتجات'}</h1>
          <p className="text-gray-400 text-xs sm:text-base">تصفح جميع المنتجات في هذا القسم ({products.length} منتج)</p>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-16 sm:py-20" data-testid="no-products"><Sparkles size={50} className="text-purple-500/30 mx-auto mb-4" /><p className="text-gray-400 text-base sm:text-lg">لا توجد منتجات في هذا القسم حالياً</p><Link href="/" className="text-purple-400 hover:text-purple-300 text-sm mt-4 inline-block">العودة للرئيسية</Link></div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4" data-testid="products-grid">
            {products.map(product => <ProductCard key={product._id || product.id} product={product} onAddToCart={addToCart} onToggleWishlist={toggleWishlist} wishlistIds={wishlistIds} />)}
          </div>
        )}
      </main>
      <Footer settings={settings} />
    </div>
  )
}
