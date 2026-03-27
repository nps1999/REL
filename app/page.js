'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import CategoriesNav from '@/components/CategoriesNav'
import {
  Search, ShoppingCart, Heart, Package, Star, ChevronLeft, ChevronRight,
  Plus, Minus, X, Menu, Sparkles, Zap, Award, Gift, MessageCircle,
  Youtube, Music2, Send, ExternalLink, ChevronDown, ChevronUp, User,
  LogOut, Settings, Shield, TrendingUp, Clock, Check
} from 'lucide-react'

const LOGO_URL = 'https://customer-assets.emergentagent.com/job_5bfed863-cc5b-467d-9502-6446bf9a8d11/artifacts/80xsas6y_Asset%205.png'
const BASE_URL = ''

// ============ TOAST NOTIFICATION ============
function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000)
  
  return () => clearTimeout(t)
  }, [onClose])
  
  const colors = {
    success: 'border-green-500/30 text-green-400',
    error: 'border-red-500/30 text-red-400',
    info: 'border-purple-500/30 text-purple-400',
  }
  
  return (
    <div className={`toast-notification ${colors[type]}`}>
      {type === 'success' && <Check size={18} className="text-green-400 flex-shrink-0" />}
      {type === 'error' && <X size={18} className="text-red-400 flex-shrink-0" />}
      {type === 'info' && <Sparkles size={18} className="text-purple-400 flex-shrink-0" />}
      <span className="font-medium text-sm">{message}</span>
    </div>
  )
}

// ============ STAR RATING ============
function StarRating({ rating, size = 16 }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={size} className={i <= rating ? 'star-filled fill-yellow-400' : 'star-empty'} />
      ))}
    </div>
  )
}

// ============ PRODUCT CARD ============
function ProductCard({ product, onAddToCart, onToggleWishlist, wishlistIds = [] }) {
  const [hovering, setHovering] = useState(false)
  const isInWishlist = wishlistIds.includes(product.id)
  
  const discountPrice = product.discount 
    ? product.price * (1 - product.discount / 100)
    : null
  
  return (
    <div
      className="product-card group cursor-pointer"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <Link href={`/products/${product.slug || product._id}`}>
        {/* Product Image */}
        <div className="relative aspect-square overflow-hidden rounded-t-xl bg-[#0d0d1a]">
          {product.image ? (
            <img
              src={product.image}
              alt={product.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Sparkles size={40} className="text-purple-500/40" />
            </div>
          )}
          
          {/* Discount badge */}
          {product.discount && (
            <div className="absolute top-3 right-3 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
              -{product.discount}%
            </div>
          )}
          
          {/* Featured badge */}
          {product.featured && (
            <div className="absolute top-3 left-3 bg-gradient-to-r from-violet-600 to-purple-500 text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
              <Zap size={10} /> مميز
            </div>
          )}
        </div>
      </Link>
      
      {/* Product Info */}
      <div className="p-4">
        <Link href={`/products/${product.slug || product._id}`}>
          <h3 className="font-semibold text-white text-sm mb-2 line-clamp-2 hover:text-purple-300 transition-colors">
            {product.title}
          </h3>
        </Link>
        
        {/* Price & Buttons row */}
        <div className="flex items-center justify-between gap-2">
          <div>
            {discountPrice ? (
              <div className="flex flex-col">
                <span className="text-green-400 font-bold text-lg">${discountPrice.toFixed(2)}</span>
                <span className="text-gray-500 text-xs line-through">${product.price?.toFixed(2)}</span>
              </div>
            ) : (
              <span className="text-green-400 font-bold text-lg">${product.price?.toFixed(2) || '0.00'}</span>
            )}
          </div>
          
          <div className={`flex gap-2 transition-all duration-300 ${hovering ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
            <button
              onClick={(e) => { e.preventDefault(); onToggleWishlist(product) }}
              className={`p-2 rounded-full transition-all duration-200 ${
                isInWishlist 
                  ? 'bg-pink-500/20 text-pink-400 border border-pink-500/40' 
                  : 'bg-white/5 text-gray-400 border border-white/10 hover:border-pink-400/40'
              }`}
            >
              <Heart size={15} className={isInWishlist ? 'fill-current' : ''} />
            </button>
            <button
              onClick={(e) => { e.preventDefault(); onAddToCart(product) }}
              className="px-3 py-2 rounded-full bg-gradient-to-r from-violet-600 to-purple-500 text-white text-xs font-bold hover:shadow-lg hover:shadow-purple-500/30 transition-all flex items-center gap-1"
            >
              <Plus size={12} /> سلة
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============ HERO SLIDER ============
function HeroSlider({ slides = [] }) {
  const [current, setCurrent] = useState(0)
  const timerRef = useRef(null)
  
  // لا توجد slides افتراضية - إذا لم يكن هناك slides، لا نعرض السلايدر
  if (!slides || slides.length === 0) return null
  
  const allSlides = slides
  
  const nextSlide = useCallback(() => {
    setCurrent(c => (c + 1) % allSlides.length)
  }, [allSlides.length])
  
  const prevSlide = () => {
    setCurrent(c => (c - 1 + allSlides.length) % allSlides.length)
  }
  
  useEffect(() => {
    timerRef.current = setInterval(nextSlide, 5000)
    return () => clearInterval(timerRef.current)
  }, [nextSlide])
  
  if (allSlides.length === 0) return null
  
  return (
    <div className="slider-container w-full relative group">
      {/* Slides */}
      {allSlides.map((slide, i) => (
        <div
          key={slide.id || i}
          className={`absolute inset-0 transition-all duration-700 ease-in-out ${
            i === current ? 'opacity-100 z-10' : 'opacity-0 z-0'
          }`}
        >
          <img
            src={slide.image}
            alt={slide.title}
            className="w-full h-full object-cover"
          />
        </div>
      ))}
      
      {/* Static placeholder when images load */}
      <div className="w-full aspect-[19/7] bg-gradient-to-br from-[#0d0d1a] to-[#1a0a2e]" />
      
      {/* Controls */}
      {allSlides.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full glass flex items-center justify-center text-white hover:bg-purple-500/20 transition-all opacity-0 group-hover:opacity-100"
          >
            <ChevronRight size={20} />
          </button>
          <button
            onClick={nextSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full glass flex items-center justify-center text-white hover:bg-purple-500/20 transition-all opacity-0 group-hover:opacity-100"
          >
            <ChevronLeft size={20} />
          </button>
          
          {/* Dots */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {allSlides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`transition-all duration-300 rounded-full ${
                  i === current 
                    ? 'w-8 h-2 bg-purple-400' 
                    : 'w-2 h-2 bg-white/30 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ============ REVIEWS CAROUSEL ============
function ReviewsCarousel({ reviews = [] }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const intervalRef = useRef(null)
  
  // لا توجد تقييمات افتراضية
  const allReviews = reviews || []
  
  // إذا لم توجد تقييمات، لا نعرض شيء
  if (allReviews.length === 0) return null
  
  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % allReviews.length)
  }
  
  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + allReviews.length) % allReviews.length)
  }
  
  useEffect(() => {
    // Auto advance every 3 seconds
    intervalRef.current = setInterval(() => {
      nextSlide()
    }, 3000)
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [allReviews.length])
  
  // Get 3 reviews to display (current, next, next+1)
  const getVisibleReviews = () => {
    const result = []
    for (let i = 0; i < 3; i++) {
      const index = (currentIndex + i) % allReviews.length
      result.push(allReviews[index])
    }
    return result
  }
  
  const visibleReviews = getVisibleReviews()
  
  return (
    <div className="relative group">
      <div className="overflow-hidden">
        <div 
          className="flex gap-6 transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(0)` }}
        >
          {visibleReviews.map((review, i) => (
            <div key={`${review.id}-${currentIndex}-${i}`} className="review-card flex-shrink-0 w-[calc(33.333%-16px)]">
              {/* Stars */}
              <StarRating rating={review.rating} />
              
              {/* Text */}
              <p className="text-gray-300 text-sm mt-3 mb-4 leading-relaxed line-clamp-3">
                "{review.text}"
              </p>
              
              {/* User */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-pink-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden">
                  {review.userImage ? (
                    <img src={review.userImage} alt={review.userName} className="w-full h-full object-cover" />
                  ) : (
                    review.userName?.charAt(0)
                  )}
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{review.userName}</p>
                  <p className="text-gray-500 text-xs">عميل موثق ✓</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Navigation Arrows */}
      <div className="flex justify-center gap-4 mt-6">
        <button
          onClick={() => {
            prevSlide()
            // Reset interval on manual navigation
            if (intervalRef.current) clearInterval(intervalRef.current)
            intervalRef.current = setInterval(nextSlide, 3000)
          }}
          className="w-10 h-10 rounded-full glass flex items-center justify-center text-white hover:bg-purple-500/20 transition-all opacity-60 group-hover:opacity-100"
          aria-label="Previous"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          onClick={() => {
            nextSlide()
            // Reset interval on manual navigation
            if (intervalRef.current) clearInterval(intervalRef.current)
            intervalRef.current = setInterval(nextSlide, 3000)
          }}
          className="w-10 h-10 rounded-full glass flex items-center justify-center text-white hover:bg-purple-500/20 transition-all opacity-60 group-hover:opacity-100"
          aria-label="Next"
        >
          <ChevronRight size={18} />
        </button>
      </div>
      
      {/* Dots Indicator */}
      <div className="flex justify-center gap-2 mt-4">
        {allReviews.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              setCurrentIndex(index)
              if (intervalRef.current) clearInterval(intervalRef.current)
              intervalRef.current = setInterval(nextSlide, 3000)
            }}
            className={`w-2 h-2 rounded-full transition-all ${
              index === currentIndex 
                ? 'bg-purple-500 w-6' 
                : 'bg-white/20 hover:bg-white/40'
            }`}
            aria-label={`Go to review ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
}

// ============ CART SIDEBAR ============
function CartSidebar({ cart, onClose, onRemove, onQuantityChange }) {
  const router = useRouter()
  const total = cart.reduce((s, i) => s + (i.price * i.quantity), 0)
  
  return (
    <>
      <div className="cart-overlay" onClick={onClose} />
      <div className="cart-panel">
        <div className="flex items-center justify-between mb-6">
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full">
            <X size={20} />
          </button>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ShoppingCart size={20} className="text-purple-400" />
            سلة التسوق ({cart.length})
          </h2>
        </div>
        
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <ShoppingCart size={48} className="text-gray-600 mb-4" />
            <p className="text-gray-400">السلة فارغة</p>
            <button onClick={onClose} className="mt-4 text-purple-400 hover:text-purple-300 text-sm">
              تصفح المنتجات
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-4 flex-1 overflow-y-auto mb-6">
              {cart.map(item => (
                <div key={`${item.id}-${item.optionId || ''}`} className="glass p-3 flex gap-3">
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-[#0d0d1a] flex-shrink-0">
                    {item.image ? (
                      <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Sparkles size={20} className="text-purple-500/40" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium line-clamp-2 mb-1">{item.title}</p>
                    {item.selectedOptionName && (
                      <p className="text-purple-300 text-xs mb-1">خيار: {item.selectedOptionName}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-green-400 font-bold">${(item.price * item.quantity).toFixed(2)}</span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => onQuantityChange(item, item.quantity - 1)} className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 text-xs">
                          <Minus size={10} />
                        </button>
                        <span className="text-white text-sm w-5 text-center">{item.quantity}</span>
                        <button onClick={() => onQuantityChange(item, item.quantity + 1)} className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 text-xs">
                          <Plus size={10} />
                        </button>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => onRemove(item)} className="text-gray-600 hover:text-red-400 transition-colors flex-shrink-0">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
            
            <div className="border-t border-white/10 pt-4 space-y-3">
              <div className="flex justify-between text-white font-bold text-lg">
                <span className="gradient-text">${total.toFixed(2)}</span>
                <span>الإجمالي</span>
              </div>
              <button
                onClick={() => { onClose(); router.push('/checkout') }}
                className="btn-primary w-full py-3 text-center flex items-center justify-center gap-2"
              >
                <ShoppingCart size={18} />
                إتمام الدفع
              </button>
              <button onClick={onClose} className="w-full py-2.5 text-center text-gray-400 hover:text-white text-sm transition-colors">
                مواصلة التسوق
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
}

// ============ HEADER ============
function Header({ cart, wishlistCount, session, onCartOpen, settings }) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
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

  const [loyaltyPoints, setLoyaltyPoints] = useState(0)
  
  useEffect(() => {
    if (session?.user) {
      setLoyaltyPoints(session.user.loyaltyPoints || 0)
    }
  }, [session])
  
  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`)
    }
  }
  
  const logo = settings?.logo || LOGO_URL
  
  return (
    <header className="glass-header sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
        {/* Logo - Right */}
        <Link href="/" className="logo-container flex items-center gap-2 flex-shrink-0">
          <img src={logo} alt="PRESTIGE DESIGNS" className="h-12 w-auto object-contain" />
        </Link>
        
        {/* Search - Center */}
        <form onSubmit={handleSearch} className="flex-1 max-w-md mx-auto">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="ابحث عن تصميم..."
              className="glass-input pl-10 pr-4 py-2.5 text-sm rounded-full"
            />
            <button type="submit" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-purple-400 transition-colors">
              <Search size={16} />
            </button>
          </div>
        </form>
        
        {/* Action Icons - Left */}
        <div className="flex items-center gap-2">
          {/* Wishlist */}
          <Link href="/wishlist">
            <div className="header-icon-btn">
              <Heart size={18} />
              {wishlistCount > 0 && (
                <span className="header-badge">{wishlistCount}</span>
              )}
            </div>
          </Link>
          
          {/* Cart */}
          <button onClick={onCartOpen}>
            <div className="header-icon-btn">
              <ShoppingCart size={18} />
              {cart.length > 0 && (
                <span className="header-badge">{cart.reduce((s, i) => s + i.quantity, 0)}</span>
              )}
            </div>
          </button>
          
          {/* Orders */}
          <Link href="/orders">
            <div className="header-icon-btn relative">
              <Package size={18} />
              {deliveredAlertCount > 0 && <span className="absolute -top-1 -left-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">{deliveredAlertCount > 9 ? '9+' : deliveredAlertCount}</span>}
            </div>
          </Link>
          
          {/* Loyalty Points */}
          {session?.user && (
            <Link href="/loyalty">
              <div className="header-icon-btn" title={`${loyaltyPoints} نقطة ولاء`}>
                <Award size={18} />
                {loyaltyPoints > 0 && (
                  <span className="header-badge text-[9px]">{loyaltyPoints > 99 ? '99+' : loyaltyPoints}</span>
                )}
              </div>
            </Link>
          )}
          
          {/* Account */}
          <div className="relative">
            <button onClick={() => setAccountOpen(!accountOpen)}>
              <div className="header-icon-btn">
                {session?.user?.image ? (
                  <img src={session.user.image} alt="" className="w-7 h-7 rounded-full" />
                ) : (
                  <User size={18} />
                )}
              </div>
            </button>
            
            {accountOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setAccountOpen(false)} />
                <div className="absolute left-0 top-12 w-52 glass border border-purple-500/20 rounded-2xl overflow-hidden z-50 shadow-2xl">
                  {session?.user ? (
                    <>
                      <div className="p-4 border-b border-white/10">
                        <p className="text-white font-semibold text-sm truncate">{session.user.name}</p>
                        <p className="text-gray-400 text-xs truncate">{session.user.email}</p>
                        {loyaltyPoints > 0 && (
                          <p className="text-purple-400 text-xs mt-1">🏆 {loyaltyPoints} نقطة</p>
                        )}
                      </div>
                      <div className="p-2">
                        <Link href="/orders" onClick={() => setAccountOpen(false)}>
                          <div className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 text-gray-300 hover:text-white text-sm transition-colors cursor-pointer">
                            <Package size={14} />
                            طلباتي
                          </div>
                        </Link>
                        <Link href="/loyalty" onClick={() => setAccountOpen(false)}>
                          <div className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 text-gray-300 hover:text-white text-sm transition-colors cursor-pointer">
                            <Award size={14} />
                            نقاط الولاء
                          </div>
                        </Link>
                        {session.user.role === 'admin' && (
                          <Link href="/admin" onClick={() => setAccountOpen(false)}>
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-purple-500/10 text-purple-400 hover:text-purple-300 text-sm transition-colors cursor-pointer">
                              <Shield size={14} />
                              لوحة التحكم
                            </div>
                          </Link>
                        )}
                        <Link href="/api/auth/signout" onClick={() => setAccountOpen(false)}>
                          <div className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-500/10 text-gray-300 hover:text-red-400 text-sm transition-colors cursor-pointer">
                            <LogOut size={14} />
                            تسجيل الخروج
                          </div>
                        </Link>
                      </div>
                    </>
                  ) : (
                    <div className="p-4">
                      <p className="text-gray-400 text-sm mb-3 text-center">أهلاً بك!</p>
                      <Link href="/auth/signin" onClick={() => setAccountOpen(false)}>
                        <button className="btn-primary w-full py-2 text-sm text-center">
                          تسجيل الدخول
                        </button>
                      </Link>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}


// ============ HOLIDAY DECORATION ============
function HolidayDecoration({ type }) {
  const elements = {
    ramadan: ['🪔', '⭐', '🌙', '✨', '🪔', '⭐'],
    eid_fitr: ['⭐', '🍬', '🌟', '🎉', '🍭', '✨'],
    eid_adha: ['⭐', '🐑', '🌟', '✨', '🐑', '⭐'],
  }
  
  const symbols = elements[type] || []
  if (symbols.length === 0) return null
  
  return (
    <div className="holiday-decoration">
      {[...Array(20)].map((_, i) => {
        const symbol = symbols[i % symbols.length]
        const left = Math.random() * 100
        const duration = 8 + Math.random() * 12
        const delay = Math.random() * 8
        const size = 16 + Math.random() * 16
        
        return (
          <span
            key={i}
            className="float-element"
            style={{
              left: `${left}%`,
              animationDuration: `${duration}s`,
              animationDelay: `${delay}s`,
              fontSize: `${size}px`,
            }}
          >
            {symbol}
          </span>
        )
      })}
    </div>
  )
}

// ============ FEATURED CUSTOMERS ============
function FeaturedCustomers({ customers = [] }) {
  if (customers.length === 0) return null
  
  return (
    <section className="py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="section-title mx-auto">⭐ عملاؤنا المميزون</h2>
          <p className="text-gray-400 mt-4 text-sm">صناع المحتوى الذين يثقون بنا</p>
        </div>
        
        <div className="flex flex-wrap justify-center gap-8">
          {customers.map((customer, i) => (
            <a
              key={i}
              href={customer.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col items-center gap-3 cursor-pointer"
            >
              <div className="relative">
                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-transparent group-hover:border-purple-400 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-purple-500/30">
                  {customer.image ? (
                    <img src={customer.image} alt={customer.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-violet-600 to-pink-500 flex items-center justify-center text-white font-bold text-xl">
                      {customer.name?.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-br from-violet-600 to-pink-500 rounded-full flex items-center justify-center">
                  <Zap size={10} className="text-white" />
                </div>
              </div>
              <p className="text-white text-sm font-medium group-hover:text-purple-300 transition-colors">
                {customer.name}
              </p>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}

// ============ SOCIAL LINKS ============
function SocialLinks({ links = {} }) {
  // Social Media Config with real icons
  const getSocialIcon = (key) => {
    const iconClass = "w-5 h-5"
    switch(key) {
      case 'discord':
        return (
          <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
          </svg>
        )
      case 'whatsapp':
        return (
          <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        )
      case 'youtube':
        return (
          <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
          </svg>
        )
      case 'tiktok':
        return (
          <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
          </svg>
        )
      case 'telegram':
        return (
          <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12a12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472c-.18 1.898-.962 6.502-1.36 8.627c-.168.9-.499 1.201-.82 1.23c-.696.065-1.225-.46-1.9-.902c-1.056-.693-1.653-1.124-2.678-1.8c-1.185-.78-.417-1.21.258-1.91c.177-.184 3.247-2.977 3.307-3.23c.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345c-.48.33-.913.49-1.302.48c-.428-.008-1.252-.241-1.865-.44c-.752-.245-1.349-.374-1.297-.789c.027-.216.325-.437.893-.663c3.498-1.524 5.83-2.529 6.998-3.014c3.332-1.386 4.025-1.627 4.476-1.635z"/>
          </svg>
        )
      default:
        return <span className="text-xl">{key}</span>
    }
  }
  
  const socialConfig = [
    { key: 'facebook', label: 'Facebook', prefix: 'https://facebook.com/' },
    { key: 'twitter', label: 'Twitter', prefix: 'https://twitter.com/' },
    { key: 'instagram', label: 'Instagram', prefix: 'https://instagram.com/' },
    { key: 'discord', label: 'Discord', prefix: 'https://discord.gg/' },
    { key: 'whatsapp', label: 'WhatsApp', prefix: 'https://wa.me/' },
    { key: 'telegram', label: 'Telegram', prefix: 'https://t.me/' },
    { key: 'youtube', label: 'YouTube', prefix: 'https://youtube.com/' },
    { key: 'tiktok', label: 'TikTok', prefix: 'https://tiktok.com/@' },
  ]
  
  const activeLinks = socialConfig.filter(s => links[s.key])
  if (activeLinks.length === 0) return null
  
  return (
    <section className="py-16 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="section-title mx-auto mb-10 flex items-center justify-center gap-2">
          <span className="text-3xl">📞</span>
          <span>تواصل معنا</span>
        </h2>
        <div className="flex flex-wrap justify-center gap-4">
          {activeLinks.map(social => (
            <a
              key={social.key}
              href={links[social.key]?.startsWith('http') ? links[social.key] : `${social.prefix}${links[social.key]}`}
              target="_blank"
              rel="noopener noreferrer"
              className="social-btn bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500"
            >
              {getSocialIcon(social.key)}
              {social.label}
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}

// ============ FAQ SECTION ============
function FAQSection({ faqs = [] }) {
  const [openIndex, setOpenIndex] = useState(null)
  
  if (faqs.length === 0) return null
  
  return (
    <section className="py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="section-title mx-auto flex items-center justify-center gap-2">
            <span className="text-3xl text-purple-400">❓</span>
            <span>الأسئلة الشائعة</span>
          </h2>
        </div>
        
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="faq-item">
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between p-4 text-right"
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                  openIndex === i ? 'bg-purple-500 rotate-180' : 'bg-purple-500/20'
                }`}>
                  <ChevronDown size={14} className="text-white" />
                </div>
                <span className="text-white font-semibold text-sm flex-1 text-right mr-3">{faq.question}</span>
              </button>
              
              {openIndex === i && (
                <div className="px-4 pb-4">
                  <p className="text-gray-300 text-sm leading-relaxed border-t border-white/10 pt-3">
                    {faq.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ============ FOOTER ============
function Footer({ settings }) {
  const year = new Date().getFullYear()
  const logo = settings?.logo || LOGO_URL
  
  return (
    <footer className="border-t border-white/5 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Main footer content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img src={logo} alt="PRESTIGE DESIGNS" className="h-12 w-auto object-contain" />
              <div>
                <h2 className="text-xl font-bold" style={{ background: 'linear-gradient(135deg, #9333ea 0%, #c026d3 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  PRESTIGE DESIGNS
                </h2>
              </div>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              وجهة صناع المحتوى الأولى، نمزج السحر بالفن ليرتقي لذوقك الرفيع.
            </p>
          </div>
          
          {/* Quick Links */}
          <div>
            <h3 className="text-white font-bold mb-4 text-sm">روابط سريعة</h3>
            <div className="space-y-2">
              {[
                ['/', 'الرئيسية'],
                ['/products', 'جميع المنتجات'],
                ['/orders', 'طلباتي'],
                ['/loyalty', 'نقاط الولاء'],
                ['/wishlist', 'المفضلة'],
              ].map(([href, label]) => (
                <Link key={href} href={href} className="block text-gray-400 hover:text-purple-300 text-sm transition-colors">
                  {label}
                </Link>
              ))}
            </div>
          </div>
          
          {/* Security */}
          <div>
            <h3 className="text-white font-bold mb-4 text-sm">طرق الدفع الآمنة</h3>
            <div className="flex gap-3 flex-wrap mb-4">
              <div className="glass px-3 py-2 rounded-lg flex items-center gap-2">
                <img src="https://www.paypalobjects.com/webstatic/icon/pp258.png" alt="PayPal" className="h-6 w-auto" />
              </div>
              <div className="glass px-3 py-2 rounded-lg flex items-center justify-center bg-white/10">
                <svg className="h-6 w-auto text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
              </div>
              <div className="glass px-3 py-2 rounded-lg flex items-center gap-2">
                <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-6 w-auto" />
              </div>
            </div>
            <div className="flex items-center gap-2 glass px-3 py-2 rounded-lg w-fit">
              <Check size={14} className="text-green-400" />
              <span className="text-green-400 text-sm font-medium">هذا المتجر موثوق</span>
            </div>
          </div>
        </div>
        
        {/* Bottom */}
        <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-sm">
            © {year} PRESTIGE DESIGNS. جميع الحقوق محفوظة.
          </p>
          <p className="text-gray-600 text-xs">
            صُنع بـ 💜 لصناع المحتوى العرب
          </p>
        </div>
      </div>
    </footer>
  )
}

// ============ MAIN PAGE ============
export default function HomePage() {
  const { data: session } = useSession()
  const router = useRouter()
  
  // State
  const [settings, setSettings] = useState({})
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [reviews, setReviews] = useState([])
  const [cart, setCart] = useState([])
  const [wishlistIds, setWishlistIds] = useState([])
  const [activeCategory, setActiveCategory] = useState('')
  const [cartOpen, setCartOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [showAllProducts, setShowAllProducts] = useState(false)
  
  const showToast = (message, type = 'success') => {
    setToast({ message, type, id: Date.now() })
  }
  
  // Load cart from localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem('prestige_cart')
    if (savedCart) {
      try { setCart(JSON.parse(savedCart)) } catch (e) {}
    }
  }, [])
  
  // Save cart to localStorage
  useEffect(() => {
    localStorage.setItem('prestige_cart', JSON.stringify(cart))
  }, [cart])
  
  // Load data
  useEffect(() => {
    Promise.all([
      fetch('/api/settings').then(r => r.json()),
      fetch('/api/categories').then(r => r.json()),
      fetch('/api/products?limit=100').then(r => r.json()),
      fetch('/api/reviews?limit=20').then(r => r.json()),
    ]).then(([settingsData, catsData, productsData, reviewsData]) => {
      setSettings(settingsData || {})
      setCategories(Array.isArray(catsData) ? catsData : [])
      setProducts(productsData?.products || [])
      setReviews(Array.isArray(reviewsData) ? reviewsData.filter(r => r.status === 'approved') : [])
    }).catch(console.error).finally(() => setLoading(false))
  }, [])
  
  // Load wishlist
  useEffect(() => {
    if (session?.user) {
      fetch('/api/wishlist')
        .then(r => r.json())
        .then(data => setWishlistIds((data.wishlist || []).map(p => p.id)))
        .catch(console.error)
    }
  }, [session])
  
  // Filter products by category
  const filteredProducts = activeCategory === 'trending'
    ? [...products].sort((a, b) => (b.orderCount || 0) - (a.orderCount || 0))
    : activeCategory
      ? products.filter(p => p.categories?.includes(activeCategory))
      : products
  
  const displayedProducts = showAllProducts ? filteredProducts : filteredProducts.slice(0, 8)
  
  // Cart functions
  const addToCart = (product, selectedOption = null) => {
    const price = product.discount 
      ? product.price * (1 - product.discount / 100) 
      : product.price
    
    const cartItem = {
      id: product._id || product.id,
      slug: product.slug,
      title: product.title,
      price,
      originalPrice: product.price,
      image: product.image,
      quantity: 1,
      fileUrl: product.fileUrl,
      optionId: selectedOption?.id || null,
      selectedOptionName: selectedOption?.name || null,
      selectedOption,
      customizations: {},
    }
    
    setCart(prev => {
      const key = `${cartItem.id}-${selectedOption?.id || ''}`
      const existing = prev.find(i => `${i.id}-${i.optionId || ''}` === key)
      if (existing) {
        showToast('تم تحديث الكمية في السلة', 'info')
        return prev.map(i => `${i.id}-${i.optionId || ''}` === key ? { ...i, quantity: i.quantity + 1 } : i)
      }
      showToast('تمت الإضافة للسلة! 🛒', 'success')
      return [...prev, cartItem]
    })
  }
  
  const removeFromCart = (item) => {
    setCart(prev => prev.filter(i => `${i.id}-${i.optionId || ''}` !== `${item.id}-${item.optionId || ''}`))
    showToast('تم الحذف من السلة', 'info')
  }
  
  const updateQuantity = (item, qty) => {
    if (qty <= 0) {
      removeFromCart(item)
      return
    }
    setCart(prev => prev.map(i => 
      `${i.id}-${i.optionId || ''}` === `${item.id}-${item.optionId || ''}` 
        ? { ...i, quantity: qty } 
        : i
    ))
  }
  
  const toggleWishlist = async (product) => {
    if (!session?.user) {
      showToast('يجب تسجيل الدخول أولاً', 'error')
      router.push('/auth/signin')
      return
    }
    
    try {
      const res = await fetch('/api/wishlist/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id }),
      })
      const data = await res.json()
      
      if (data.added) {
        setWishlistIds(prev => [...prev, product.id])
        showToast('تمت الإضافة للمفضلة ❤️', 'success')
      } else {
        setWishlistIds(prev => prev.filter(id => id !== product.id))
        showToast('تمت الإزالة من المفضلة', 'info')
      }
    } catch (e) {
      showToast('حدث خطأ ما', 'error')
    }
  }
  
  // Holiday decoration
  const activeHoliday = settings?.festivities?.ramadan ? 'ramadan' 
    : settings?.festivities?.eid_fitr ? 'eid_fitr'
    : settings?.festivities?.eid_adha ? 'eid_adha'
    : null
  
  // Trending products for homepage
  const trendingProducts = [...products]
    .sort((a, b) => (b.orderCount || 0) - (a.orderCount || 0) || new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, showAllProducts ? products.length : 8)
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4" />
          <p className="text-purple-400 font-medium">جاري التحميل...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-grid">
      {/* Holiday decorations */}
      {activeHoliday && <HolidayDecoration type={activeHoliday} />}
      
      {/* Header */}
      <Header
        cart={cart}
        wishlistCount={wishlistIds.length}
        session={session}
        onCartOpen={() => setCartOpen(true)}
        settings={settings}
      />
      
      {/* Categories Nav */}
      <CategoriesNav
        categories={categories}
        currentCategoryId={null}
      />
      
      {/* Cart Sidebar */}
      {cartOpen && (
        <CartSidebar
          cart={cart}
          onClose={() => setCartOpen(false)}
          onRemove={removeFromCart}
          onQuantityChange={updateQuantity}
        />
      )}
      
      {/* Toast */}
      {toast && (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      
      <main>
        {/* Hero Slider */}
        <section className="px-4 py-6 max-w-7xl mx-auto">
          <HeroSlider slides={settings?.slider || []} />
        </section>
        
        {/* Featured Customers */}
        {settings?.featuredCustomers?.length > 0 && (
          <FeaturedCustomers customers={settings.featuredCustomers} />
        )}
        
        {/* Products Section */}
        <section className="py-12 px-4 max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <TrendingUp size={24} className="text-purple-400" />
              <h2 className="section-title">
                {activeCategory === 'trending' || !activeCategory ? '🔥 المنتجات الرائجة' : 
                 categories.find(c => c.slug === activeCategory || c.id === activeCategory)?.name || 'المنتجات'}
              </h2>
            </div>
            <Link href="/products" className="text-purple-400 hover:text-purple-300 text-sm flex items-center gap-1 transition-colors">
              عرض الكل <ChevronLeft size={14} />
            </Link>
          </div>
          
          {displayedProducts.length === 0 ? (
            <div className="text-center py-20">
              <Sparkles size={48} className="text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">لا توجد منتجات في هذا القسم حالياً</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {displayedProducts.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={addToCart}
                    onToggleWishlist={toggleWishlist}
                    wishlistIds={wishlistIds}
                  />
                ))}
              </div>
              
              {filteredProducts.length > 8 && (
                <div className="text-center mt-8">
                  <button
                    onClick={() => setShowAllProducts(!showAllProducts)}
                    className="btn-primary px-8 py-3 text-sm"
                  >
                    {showAllProducts ? 'عرض أقل' : `عرض المزيد (${filteredProducts.length - 8} منتج)`}
                  </button>
                </div>
              )}
            </>
          )}
        </section>
        
        {/* Reviews Section */}
        <section className="py-12 px-4 bg-gradient-to-b from-transparent via-purple-950/5 to-transparent">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="section-title mx-auto">💬 ماذا يقول عملاؤنا</h2>
              <p className="text-gray-400 mt-4 text-sm">آراء حقيقية من عملائنا الكرام</p>
            </div>
            <ReviewsCarousel reviews={reviews} />
          </div>
        </section>
        
        {/* Social Links */}
        {settings?.socialLinks && Object.keys(settings.socialLinks).some(k => settings.socialLinks[k]) && (
          <SocialLinks links={settings.socialLinks} />
        )}
        
        {/* FAQ */}
        {settings?.faq?.length > 0 && <FAQSection faqs={settings.faq} />}
      </main>
      
      {/* Footer */}
      <Footer settings={settings} />
    </div>
  )
}
