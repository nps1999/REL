'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import CategoriesNav from '@/components/CategoriesNav'
import {
  Heart, ShoppingCart, Star, Share2, Check, Sparkles, Package, X,
  Upload, Palette, Search, User, LogOut, Shield, Award, ArrowRight,
  Plus, Minus, Menu, ChevronLeft, Bell, Zap
} from 'lucide-react'

const LOGO_URL = 'https://customer-assets.emergentagent.com/job_5bfed863-cc5b-467d-9502-6446bf9a8d11/artifacts/80xsas6y_Asset%205.png'

function StarRating({ rating, size = 16 }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={size} className={i <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'} />
      ))}
    </div>
  )
}

function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose?.()
    }, 2500)
    return () => clearTimeout(timer)
  }, [onClose])

  const styles = {
    success: 'bg-green-500/20 border-green-500/40 text-green-300',
    error: 'bg-red-500/20 border-red-500/40 text-red-300',
    info: 'bg-blue-500/20 border-blue-500/40 text-blue-300',
  }

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] px-4">
      <div className={`glass border rounded-2xl px-4 py-3 shadow-2xl ${styles[type] || styles.success}`}>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">{message}</span>
          <button
            onClick={onClose}
            className="text-current/70 hover:text-current transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

function normalizeCartItems(rawCart) {
  if (!Array.isArray(rawCart)) return []
  return rawCart
    .filter(item => item && typeof item === 'object')
    .map(item => ({
      ...item,
      id: item.id || item._id,
      quantity: Number.isFinite(Number(item.quantity)) && Number(item.quantity) > 0 ? Number(item.quantity) : 1,
      optionId: item.optionId || null,
      selectedOptionName: typeof item.selectedOptionName === 'string' ? item.selectedOptionName : null,
      customizations: item.customizations && typeof item.customizations === 'object' ? {
        logoUrl: item.customizations.logoUrl || '',
        logoFileName: item.customizations.logoFileName || '',
        primaryColor: item.customizations.primaryColor || '',
        secondaryColor: item.customizations.secondaryColor || '',
        notes: item.customizations.notes || '',
      } : {},
    }))
    .filter(item => !!item.id)
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

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`)
      setSearchOpen(false)
    }
  }

  return (
    <header className="glass-header sticky top-0 z-50" data-testid="product-header">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center gap-2 sm:gap-4">
        <Link href="/" className="flex-shrink-0">
          <img src={logo} alt="PRESTIGE DESIGNS" className="h-9 sm:h-12 w-auto object-contain" />
        </Link>

        <form onSubmit={handleSearch} className="hidden md:block flex-1 max-w-md mx-auto">
          <div className="relative">
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="ابحث عن تصميم..." className="glass-input pl-10 pr-4 py-2.5 text-sm rounded-full w-full" />
            <button type="submit" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-purple-400 transition-colors"><Search size={16} /></button>
          </div>
        </form>

        <div className="flex-1 md:hidden" />

        <div className="flex items-center gap-1 sm:gap-2">
          <button onClick={() => setSearchOpen(!searchOpen)} className="md:hidden header-icon-btn !w-8 !h-8 sm:!w-9 sm:!h-9"><Search size={16} /></button>
          <Link href="/wishlist"><div className="header-icon-btn !w-8 !h-8 sm:!w-9 sm:!h-9" data-testid="wishlist-btn"><Heart size={16} />{wishlistCount > 0 && <span className="header-badge !text-[8px] !min-w-[14px] !h-[14px]">{wishlistCount}</span>}</div></Link>
          <button onClick={onCartOpen}><div className="header-icon-btn !w-8 !h-8 sm:!w-9 sm:!h-9" data-testid="cart-btn"><ShoppingCart size={16} />{Array.isArray(cart) && cart.length > 0 && <span className="header-badge !text-[8px] !min-w-[14px] !h-[14px]">{cart.reduce((s, i) => s + (Number(i?.quantity) || 0), 0)}</span>}</div></button>
          <Link href="/orders" className="hidden sm:block"><div className="header-icon-btn !w-8 !h-8 sm:!w-9 sm:!h-9 relative"><Package size={16} />{deliveredAlertCount > 0 && <span className="absolute -top-1 -left-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">{deliveredAlertCount > 9 ? '9+' : deliveredAlertCount}</span>}</div></Link>
          {session?.user && <Link href="/loyalty" className="hidden sm:block"><div className="header-icon-btn !w-8 !h-8 sm:!w-9 sm:!h-9" title={`${loyaltyPoints} نقطة`}><Award size={16} /></div></Link>}
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
                        <Link href="/orders" onClick={() => setAccountOpen(false)}><div className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 text-gray-300 hover:text-white text-xs sm:text-sm transition-colors cursor-pointer"><Package size={14} />طلباتي</div></Link>
                        <Link href="/loyalty" onClick={() => setAccountOpen(false)}><div className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 text-gray-300 hover:text-white text-xs sm:text-sm transition-colors cursor-pointer"><Award size={14} />نقاط الولاء</div></Link>
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
          <form onSubmit={handleSearch} className="relative mt-2">
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="ابحث عن تصميم..." className="glass-input pl-10 pr-4 py-2.5 text-sm rounded-full w-full" autoFocus />
            <button type="submit" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><Search size={16} /></button>
          </form>
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
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full"><X size={20} /></button>
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2"><ShoppingCart size={20} className="text-purple-400" />سلة التسوق ({cart.length})</h2>
        </div>
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center"><ShoppingCart size={48} className="text-gray-600 mb-4" /><p className="text-gray-400">السلة فارغة</p><button onClick={onClose} className="mt-4 text-purple-400 hover:text-purple-300 text-sm">تصفح المنتجات</button></div>
        ) : (
          <>
            <div className="space-y-4 flex-1 overflow-y-auto mb-6">
              {cart.map(item => (
                <div key={`${item.id}-${item.optionId || ''}`} className="glass p-3 flex gap-3">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden bg-[#0d0d1a] flex-shrink-0">
                    {item.image ? <img src={item.image} alt={item.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Sparkles size={20} className="text-purple-500/40" /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs sm:text-sm font-medium line-clamp-2 mb-1">{item.title}</p>
                    {item.selectedOptionName && <p className="text-purple-300 text-xs mb-1">خيار: {item.selectedOptionName}</p>}
                    <div className="flex items-center justify-between">
                      <span className="text-green-400 font-bold text-sm">${(item.price * item.quantity).toFixed(2)}</span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => onQuantityChange(item, item.quantity - 1)} className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"><Minus size={10} /></button>
                        <span className="text-white text-sm w-5 text-center">{item.quantity}</span>
                        <button onClick={() => onQuantityChange(item, item.quantity + 1)} className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"><Plus size={10} /></button>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => onRemove(item)} className="text-gray-600 hover:text-red-400 transition-colors flex-shrink-0"><X size={14} /></button>
                </div>
              ))}
            </div>
            <div className="border-t border-white/10 pt-4 space-y-3">
              <div className="flex justify-between text-white font-bold text-lg"><span className="gradient-text">${total.toFixed(2)}</span><span>الإجمالي</span></div>
              <button onClick={() => { onClose(); router.push('/checkout') }} className="btn-primary w-full py-3 text-center flex items-center justify-center gap-2"><ShoppingCart size={18} />إتمام الدفع</button>
              <button onClick={onClose} className="w-full py-2.5 text-center text-gray-400 hover:text-white text-sm transition-colors">مواصلة التسوق</button>
            </div>
          </>
        )}
      </div>
    </>
  )
}

function NotificationBanner({ onSubscribe }) {
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('prestige_notif_subscribed')
      if (saved) setSubscribed(true)
    }
  }, [])

  const handleSubscribe = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (data.success || res.ok) {
        setSubscribed(true)
        localStorage.setItem('prestige_notif_subscribed', 'true')
        localStorage.setItem('prestige_notif_email', email.trim())
        if (onSubscribe) onSubscribe('تم الاشتراك بنجاح! ستصلك إشعارات بالعروض والخصومات')
      }
    } catch {
      if (onSubscribe) onSubscribe('تم حفظ بريدك الإلكتروني بنجاح!')
      setSubscribed(true)
      localStorage.setItem('prestige_notif_subscribed', 'true')
    } finally {
      setSubmitting(false)
    }
  }

  if (subscribed) return null

  return (
    <div className="glass-card p-4 sm:p-6 relative overflow-hidden" data-testid="notification-banner">
      <div className="absolute inset-0 bg-gradient-to-l from-purple-600/10 via-transparent to-pink-600/10" />
      <div className="relative flex flex-col sm:flex-row items-center gap-4">
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
            <Bell size={22} className="text-white" />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm sm:text-base">لا تفوّت العروض!</h3>
            <p className="text-gray-400 text-xs">اشترك ليصلك إشعار بكل جديد وخصومات حصرية</p>
          </div>
        </div>
        <form onSubmit={handleSubscribe} className="flex-1 flex gap-2 w-full sm:w-auto">
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="بريدك الإلكتروني..." required
            className="glass-input flex-1 px-4 py-2.5 text-sm rounded-xl" data-testid="notif-email-input" />
          <button type="submit" disabled={submitting}
            className="btn-primary px-4 sm:px-6 py-2.5 text-sm font-bold flex items-center gap-2 flex-shrink-0 disabled:opacity-50" data-testid="notif-subscribe-btn">
            <Bell size={14} />{submitting ? '...' : 'اشترك'}
          </button>
        </form>
      </div>
    </div>
  )
}

function RelatedProducts({ currentProduct, onAddToCart }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentProduct) return
    const categoryId = currentProduct.categories?.[0]
    const fetchUrl = categoryId
      ? `/api/products?category=${categoryId}&limit=8`
      : `/api/products?limit=8`

    fetch(fetchUrl).then(r => r.json()).then(data => {
      const allProducts = data.products || []
      const related = allProducts.filter(p => (p.id || p._id) !== (currentProduct.id || currentProduct._id)).slice(0, 4)
      setProducts(related)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [currentProduct])

  if (loading || products.length === 0) return null

  return (
    <div className="mt-10" data-testid="related-products">
      <h2 className="text-xl sm:text-2xl font-black text-white mb-6 flex items-center gap-2">
        <Sparkles size={20} className="text-purple-400" />
        منتجات مشابهة
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {products.map(product => {
          const discountPrice = product.discount ? product.price * (1 - product.discount / 100) : null
          return (
            <div key={product._id || product.id} className="product-card group" data-testid={`related-${product.slug}`}>
              <Link href={`/products/${product.slug || product._id}`}>
                <div className="relative aspect-square overflow-hidden rounded-t-xl bg-[#0d0d1a]">
                  {product.image ? (
                    <img src={product.image} alt={product.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Sparkles size={30} className="text-purple-500/40" /></div>
                  )}
                  {product.discount > 0 && <div className="absolute top-2 right-2 bg-gradient-to-r from-red-500 to-pink-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">-{product.discount}%</div>}
                  {product.featured && <div className="absolute top-2 left-2 bg-gradient-to-r from-violet-600 to-purple-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5"><Zap size={8} />مميز</div>}
                </div>
              </Link>
              <div className="p-3">
                <Link href={`/products/${product.slug || product._id}`}>
                  <h3 className="font-semibold text-white text-xs sm:text-sm mb-2 line-clamp-2 hover:text-purple-300 transition-colors">{product.title}</h3>
                </Link>
                <div className="flex items-center justify-between">
                  {discountPrice ? (
                    <div><span className="text-green-400 font-bold text-sm sm:text-base">${discountPrice.toFixed(2)}</span><span className="text-gray-500 text-[10px] sm:text-xs line-through mr-1">${product.price?.toFixed(2)}</span></div>
                  ) : (
                    <span className="text-green-400 font-bold text-sm sm:text-base">{product.price === 0 ? 'مجاني' : `$${product.price?.toFixed(2)}`}</span>
                  )}
                  <button onClick={(e) => { e.preventDefault(); onAddToCart(product) }}
                    className="opacity-0 group-hover:opacity-100 px-2.5 py-1.5 rounded-full bg-gradient-to-r from-violet-600 to-purple-500 text-white text-[10px] font-bold hover:shadow-lg hover:shadow-purple-500/30 transition-all flex items-center gap-1">
                    <Plus size={10} /> سلة
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
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
            <div className="flex items-center gap-3 mb-4">
              <img src={logo} alt="PRESTIGE DESIGNS" className="h-10 sm:h-12 w-auto object-contain" />
              <h2 className="text-lg sm:text-xl font-bold" style={{ background: 'linear-gradient(135deg, #9333ea 0%, #c026d3 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>PRESTIGE DESIGNS</h2>
            </div>
            <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">وجهة صناع المحتوى الأولى، نمزج السحر بالفن ليرتقي لذوقك الرفيع.</p>
          </div>
          <div>
            <h3 className="text-white font-bold mb-3 sm:mb-4 text-sm">روابط سريعة</h3>
            <div className="space-y-2">
              {[['/', 'الرئيسية'],['/products', 'جميع المنتجات'],['/orders', 'طلباتي'],['/loyalty', 'نقاط الولاء'],['/wishlist', 'المفضلة']].map(([href, label]) => (
                <Link key={href} href={href} className="block text-gray-400 hover:text-purple-300 text-xs sm:text-sm transition-colors">{label}</Link>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-white font-bold mb-3 sm:mb-4 text-sm">طرق الدفع الآمنة</h3>
            <div className="flex gap-3 flex-wrap mb-4">
              <div className="glass px-3 py-2 rounded-lg"><img src="https://www.paypalobjects.com/webstatic/icon/pp258.png" alt="PayPal" className="h-5 sm:h-6 w-auto" /></div>
              <div className="glass px-3 py-2 rounded-lg"><img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-5 sm:h-6 w-auto" /></div>
            </div>
            <div className="flex items-center gap-2 glass px-3 py-2 rounded-lg w-fit"><Check size={14} className="text-green-400" /><span className="text-green-400 text-xs sm:text-sm font-medium">هذا المتجر موثوق</span></div>
          </div>
        </div>
        <div className="border-t border-white/5 pt-4 sm:pt-6">
          <p className="text-gray-500 text-xs sm:text-sm text-center">&copy; {year} PRESTIGE DESIGNS. جميع الحقوق محفوظة.</p>
        </div>
      </div>
    </footer>
  )
}

export default function ProductPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const params = useParams()
  const slug = params?.slug

  const [product, setProduct] = useState(null)
  const [reviews, setReviews] = useState([])
  const [categories, setCategories] = useState([])
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(true)
  const [selectedOption, setSelectedOption] = useState(null)
  const [inWishlist, setInWishlist] = useState(false)
  const [addedToCart, setAddedToCart] = useState(false)
  const [customizations, setCustomizations] = useState({})
  const [toast, setToast] = useState(null)
  const [cart, setCart] = useState([])
  const [wishlistIds, setWishlistIds] = useState([])
  const [cartOpen, setCartOpen] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [logoPreview, setLogoPreview] = useState(null)

  const showToast = useCallback((msg, type = 'success') => { setToast({ msg, type, id: Date.now() }) }, [])

  useEffect(() => {
    const savedCart = localStorage.getItem('prestige_cart')
    if (!savedCart) return
    try {
      setCart(normalizeCartItems(JSON.parse(savedCart)))
    } catch {
      setCart([])
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('prestige_cart', JSON.stringify(normalizeCartItems(cart)))
    } catch {
      showToast('تعذر حفظ السلة محليًا، حاول تحديث الصفحة', 'error')
    }
  }, [cart, showToast])

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    Promise.all([
      fetch(`/api/products/${slug}`).then(r => r.json()),
      fetch('/api/categories').then(r => r.json()),
      fetch('/api/settings').then(r => r.json()),
    ]).then(([productData, catsData, settingsData]) => {
      if (!productData || productData.error) {
        router.push('/products')
        return
      }
      setProduct(productData)
      setCategories(Array.isArray(catsData) ? catsData : [])
      setSettings(settingsData || {})
      fetch(`/api/reviews?productId=${productData.id || productData._id}`).then(r => r.json()).then(data => setReviews(Array.isArray(data) ? data : data.reviews || [])).catch(() => setReviews([]))
      if (session?.user) {
        fetch('/api/wishlist').then(r => r.json()).then(data => {
          const ids = (data.wishlist || []).map(p => p.id || p._id)
          setInWishlist(ids.includes(productData.id) || ids.includes(productData._id))
          setWishlistIds(ids)
        }).catch(() => {})
      }
    }).catch(() => router.push('/products')).finally(() => setLoading(false))
  }, [slug, session, router])

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
    if (!allowedTypes.includes(file.type)) { showToast('نوع الملف غير مدعوم. يرجى رفع صورة', 'error'); return }
    if (file.size > 10 * 1024 * 1024) { showToast('حجم الملف كبير جداً. الحد الأقصى 10MB', 'error'); return }
    const reader = new FileReader()
    reader.onload = (ev) => setLogoPreview(ev.target.result)
    reader.readAsDataURL(file)
    setUploadingLogo(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'logos')
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.success && data.url) { setCustomizations(prev => ({ ...prev, logoUrl: data.url, logoFileName: file.name })); showToast('تم رفع الشعار بنجاح!') }
      else { showToast(data.error || 'فشل رفع الشعار', 'error'); setLogoPreview(null) }
    } catch { showToast('حدث خطأ أثناء رفع الشعار', 'error'); setLogoPreview(null) }
    finally { setUploadingLogo(false) }
  }

  const handleAddToCart = () => {
    if (!product) return
    const price = product.discount ? product.price * (1 - product.discount / 100) : product.price
    const cartItem = {
      id: product._id || product.id,
      slug: product.slug,
      title: product.title,
      price,
      originalPrice: product.price,
      image: product.image,
      quantity: 1,
      fileUrl: selectedOption?.fileUrl || product.fileUrl,
      optionId: selectedOption?.id || null,
      selectedOptionName: selectedOption?.name || null,
      customizations: {
        logoUrl: customizations.logoUrl || '',
        logoFileName: customizations.logoFileName || '',
        primaryColor: customizations.primaryColor || '',
        secondaryColor: customizations.secondaryColor || '',
        notes: customizations.notes || '',
      },
    }
    setCart(prev => {
      const key = `${cartItem.id}-${selectedOption?.id || ''}`
      const existing = prev.find(i => `${i.id}-${i.optionId || ''}` === key)
      if (existing) {
        showToast('تم تحديث الكمية في السلة', 'info')
        return prev.map(i => `${i.id}-${i.optionId || ''}` === key ? { ...i, quantity: i.quantity + 1 } : i)
      }
      showToast('تمت الإضافة للسلة!', 'success')
      return [...prev, cartItem]
    })
    setAddedToCart(true)
    setTimeout(() => setAddedToCart(false), 2000)
  }

  const handleAddRelatedToCart = (relProduct) => {
    const price = relProduct.discount ? relProduct.price * (1 - relProduct.discount / 100) : relProduct.price
    setCart(prev => {
      const existing = prev.find(i => i.id === (relProduct._id || relProduct.id))
      if (existing) {
        showToast('تم تحديث الكمية', 'info')
        return prev.map(i => i.id === (relProduct._id || relProduct.id) ? { ...i, quantity: i.quantity + 1 } : i)
      }
      showToast('تمت الإضافة للسلة!')
      return [...prev, { id: relProduct._id || relProduct.id, slug: relProduct.slug, title: relProduct.title, price, image: relProduct.image, quantity: 1, fileUrl: relProduct.fileUrl }]
    })
  }

  const removeFromCart = (item) => setCart(prev => prev.filter(i => `${i.id}-${i.optionId || ''}` !== `${item.id}-${item.optionId || ''}`))
  const updateQuantity = (item, qty) => { if (qty <= 0) { removeFromCart(item); return } setCart(prev => prev.map(i => `${i.id}-${i.optionId || ''}` === `${item.id}-${item.optionId || ''}` ? { ...i, quantity: qty } : i)) }

  const handleToggleWishlist = async () => {
    if (!session?.user) { router.push('/auth/signin'); return }
    try {
      const res = await fetch('/api/wishlist/toggle', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: product.id || product._id }) })
      const data = await res.json()
      setInWishlist(!!data.added)
      showToast(data.added ? 'تمت الإضافة للمفضلة' : 'تمت الإزالة من المفضلة', 'info')
    } catch { showToast('حدث خطأ', 'error') }
  }

  const handleShare = () => {
    if (!product) return
    if (navigator.share) { navigator.share({ title: product.title, url: window.location.href }) }
    else { navigator.clipboard.writeText(window.location.href); showToast('تم نسخ الرابط!', 'info') }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#050508]"><div className="text-center"><div className="spinner mx-auto mb-4" /><p className="text-purple-400 font-medium">جاري التحميل...</p></div></div>
  if (!product) return null

  const discountPrice = product.discount ? product.price * (1 - product.discount / 100) : null
  const hasCustomizations = product.customizations && (product.customizations.logoUpload?.enabled || product.customizations.primaryColor?.enabled || product.customizations.secondaryColor?.enabled || product.customizations.notes?.enabled || (product.customizations.options?.enabled && product.customizations.options?.items?.length > 0))

  return (
    <div className="min-h-screen bg-grid" data-testid="product-page">
      {toast && <Toast key={toast.id} message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <Header cart={cart} wishlistCount={wishlistIds.length} session={session} onCartOpen={() => setCartOpen(true)} settings={settings} />
      <CategoriesNav categories={categories} currentCategoryId={null} />
      {cartOpen && <CartSidebar cart={cart} onClose={() => setCartOpen(false)} onRemove={removeFromCart} onQuantityChange={updateQuantity} />}

      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="flex items-center gap-1.5 sm:gap-2 mb-4 sm:mb-6 text-xs sm:text-sm overflow-x-auto">
          <Link href="/" className="text-gray-400 hover:text-purple-400 transition-colors whitespace-nowrap">الرئيسية</Link>
          <ChevronLeft size={12} className="text-gray-600 flex-shrink-0" />
          <Link href="/products" className="text-gray-400 hover:text-purple-400 transition-colors whitespace-nowrap">المنتجات</Link>
          <ChevronLeft size={12} className="text-gray-600 flex-shrink-0" />
          <span className="text-purple-300 font-medium truncate">{product.title}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8 mb-8 sm:mb-12" data-testid="product-layout">
          <div className="space-y-4 sm:space-y-6 order-1">
            <div className="glass-card overflow-hidden rounded-xl sm:rounded-2xl" data-testid="product-image-container">
              {product.image ? <img src={product.image} alt={product.title} className="w-full aspect-square object-cover" /> : <div className="w-full aspect-square flex items-center justify-center bg-[#0d0d1a]"><Sparkles size={60} className="text-purple-500/30" /></div>}
            </div>
            <div className="glass-card p-4 sm:p-6" data-testid="product-description">
              <h3 className="text-white font-bold mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-base"><Sparkles size={16} className="text-purple-400" />وصف المنتج</h3>
              <div className="text-gray-300 text-xs sm:text-sm leading-relaxed prose-invert whitespace-pre-line" dangerouslySetInnerHTML={{ __html: product.description || 'لا يوجد وصف متاح' }} />
            </div>
          </div>

          <div className="space-y-4 sm:space-y-6 order-2">
            <div data-testid="product-info">
              <h1 className="text-xl sm:text-3xl font-black text-white mb-3 sm:mb-4">{product.title}</h1>
              <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                {discountPrice ? (
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="text-2xl sm:text-3xl font-black text-green-400">${discountPrice.toFixed(2)}</span>
                    <div><span className="text-gray-500 line-through text-base sm:text-lg">${product.price?.toFixed(2)}</span><span className="mr-1 sm:mr-2 text-[10px] sm:text-xs font-bold bg-red-500/20 text-red-400 px-1.5 sm:px-2 py-0.5 rounded-full">-{product.discount}%</span></div>
                  </div>
                ) : <span className="text-2xl sm:text-3xl font-black text-green-400">${product.price?.toFixed(2) || '0.00'}</span>}
              </div>
              <div className="flex gap-3 sm:gap-4 text-xs sm:text-sm text-gray-400">
                {product.orderCount > 0 && <span className="flex items-center gap-1"><Package size={13} />{product.orderCount} طلب</span>}
                {reviews.length > 0 && <span className="flex items-center gap-1"><Star size={13} className="text-yellow-400" />{(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)} ({reviews.length})</span>}
              </div>
            </div>

            {product.youtubeUrl && (
              <div className="glass-card overflow-hidden rounded-xl sm:rounded-2xl" data-testid="product-youtube">
                <div className="aspect-video"><iframe src={`https://www.youtube.com/embed/${extractYouTubeId(product.youtubeUrl)}`} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title="Product Video" /></div>
              </div>
            )}

            {hasCustomizations && (
              <div className="glass-card p-4 sm:p-5 space-y-4" data-testid="product-customizations">
                <h3 className="text-white font-bold text-sm flex items-center gap-2"><Palette size={16} className="text-purple-400" />التخصيصات</h3>

                {product.customizations.options?.enabled && product.customizations.options?.items?.length > 0 && (
                  <div>
                    <label className="text-gray-400 text-xs mb-2 block">اختر الخيار</label>
                    <div className="grid grid-cols-2 gap-2">
                      {product.customizations.options.items.map(opt => (
                        <button key={opt.id} onClick={() => setSelectedOption(selectedOption?.id === opt.id ? null : opt)}
                          className={`p-2 sm:p-2.5 rounded-xl text-xs sm:text-sm transition-all border ${selectedOption?.id === opt.id ? 'border-purple-500 bg-purple-500/20 text-purple-300' : 'border-white/10 bg-white/5 text-gray-300 hover:border-purple-400/40'}`} data-testid={`option-${opt.id}`}>
                          {opt.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {product.customizations.logoUpload?.enabled && (
                  <div data-testid="logo-upload-section">
                    <label className="text-gray-400 text-xs mb-2 block flex items-center gap-1"><Upload size={12} />رفع الشعار</label>
                    <div className="space-y-3">
                      <label className={`flex items-center justify-center gap-2 p-3 sm:p-4 rounded-xl border-2 border-dashed cursor-pointer transition-all ${uploadingLogo ? 'border-purple-500/50 bg-purple-500/10' : 'border-white/15 hover:border-purple-500/40 hover:bg-white/5'}`}>
                        <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" disabled={uploadingLogo} data-testid="logo-file-input" />
                        {uploadingLogo ? <><div className="spinner w-5 h-5" /><span className="text-purple-300 text-xs sm:text-sm">جاري رفع الشعار...</span></> : <><Upload size={18} className="text-purple-400" /><span className="text-gray-300 text-xs sm:text-sm">اضغط لاختيار صورة الشعار</span></>}
                      </label>
                      {(logoPreview || customizations.logoUrl) && (
                        <div className="flex items-center gap-3 glass p-3 rounded-xl" data-testid="logo-preview">
                          <img src={logoPreview || customizations.logoUrl} alt="الشعار" className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover border border-purple-500/30" />
                          <div className="flex-1 min-w-0"><p className="text-green-400 text-xs flex items-center gap-1"><Check size={12} />تم رفع الشعار</p><p className="text-gray-500 text-[10px] sm:text-xs truncate">{customizations.logoFileName || 'شعار'}</p></div>
                          <button onClick={() => { setLogoPreview(null); setCustomizations(prev => ({ ...prev, logoUrl: '', logoFileName: '' })) }} className="text-gray-500 hover:text-red-400 transition-colors"><X size={14} /></button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {product.customizations.primaryColor?.enabled && (
                  <div><label className="text-gray-400 text-xs mb-2 block">اللون الأساسي</label><div className="flex items-center gap-3"><input type="color" className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg cursor-pointer bg-transparent border-0" value={customizations.primaryColor || '#7c3aed'} onChange={e => setCustomizations(prev => ({ ...prev, primaryColor: e.target.value }))} data-testid="primary-color-input" /><span className="text-gray-300 text-xs sm:text-sm">{customizations.primaryColor || '#7c3aed'}</span></div></div>
                )}
                {product.customizations.secondaryColor?.enabled && (
                  <div><label className="text-gray-400 text-xs mb-2 block">اللون الثانوي</label><div className="flex items-center gap-3"><input type="color" className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg cursor-pointer bg-transparent border-0" value={customizations.secondaryColor || '#ec4899'} onChange={e => setCustomizations(prev => ({ ...prev, secondaryColor: e.target.value }))} data-testid="secondary-color-input" /><span className="text-gray-300 text-xs sm:text-sm">{customizations.secondaryColor || '#ec4899'}</span></div></div>
                )}
                {product.customizations.notes?.enabled && (
                  <div><label className="text-gray-400 text-xs mb-2 block">ملاحظات مهمة</label><textarea placeholder="أدخل ملاحظاتك هنا..." className="glass-input text-xs sm:text-sm resize-none" rows={3} value={customizations.notes || ''} onChange={e => setCustomizations(prev => ({ ...prev, notes: e.target.value }))} data-testid="notes-input" /></div>
                )}
              </div>
            )}

            <div className="space-y-3" data-testid="product-actions">
              <button onClick={handleAddToCart} className={`btn-primary w-full py-3 sm:py-4 flex items-center justify-center gap-2 sm:gap-3 text-base sm:text-lg ${addedToCart ? 'opacity-80' : ''}`} data-testid="add-to-cart-btn">
                {addedToCart ? <><Check size={18} />تمت الإضافة!</> : <><ShoppingCart size={18} />إضافة للسلة</>}
              </button>
              <div className="flex gap-2 sm:gap-3">
                <button onClick={handleToggleWishlist} className={`flex-1 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl border transition-all flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium ${inWishlist ? 'bg-pink-500/20 border-pink-500/40 text-pink-400' : 'border-white/10 bg-white/5 text-gray-300 hover:border-pink-400/40'}`} data-testid="wishlist-toggle-btn">
                  <Heart size={14} className={inWishlist ? 'fill-current' : ''} />{inWishlist ? 'في المفضلة' : 'إضافة للمفضلة'}
                </button>
                <button onClick={handleShare} className="py-2.5 sm:py-3 px-3 sm:px-5 rounded-xl sm:rounded-2xl border border-white/10 bg-white/5 text-gray-300 hover:border-purple-400/40 transition-all flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm" data-testid="share-btn">
                  <Share2 size={14} />مشاركة
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8 sm:mb-10">
          <NotificationBanner onSubscribe={(msg) => showToast(msg, 'success')} />
        </div>

        <RelatedProducts currentProduct={product} onAddToCart={handleAddRelatedToCart} />

        <div className="glass-card p-4 sm:p-6 mt-8 sm:mt-10" data-testid="reviews-section">
          <h2 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6 flex items-center gap-2"><Star size={18} className="text-yellow-400" />تقييمات العملاء ({reviews.length})</h2>
          {reviews.length === 0 ? <p className="text-gray-400 text-xs sm:text-sm text-center py-6 sm:py-8">لا توجد تقييمات بعد. كن أول من يقيّم!</p> : (
            <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
              {reviews.map(review => (
                <div key={review.id || review._id} className="border-b border-white/5 pb-3 sm:pb-4 last:border-0">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-violet-600 to-pink-500 flex items-center justify-center text-white font-bold text-xs sm:text-sm flex-shrink-0 overflow-hidden">{review.userImage ? <img src={review.userImage} alt="" className="w-full h-full object-cover" /> : review.userName?.charAt(0) || 'ع'}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1"><span className="text-white font-medium text-xs sm:text-sm">{review.userName || 'مستخدم'}</span><StarRating rating={review.rating} size={12} /></div>
                      <p className="text-gray-300 text-xs sm:text-sm leading-relaxed">{review.text}</p>
                      <p className="text-gray-600 text-[10px] sm:text-xs mt-1">{review.createdAt ? new Date(review.createdAt).toLocaleDateString('ar-SA') : ''}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer settings={settings} />
    </div>
  )
}

function extractYouTubeId(url) {
  if (!url) return ''
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?#]+)/)
  return match ? match[1] : url
}