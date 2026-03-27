'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import CategoriesNav from '@/components/CategoriesNav'
import { ArrowRight, Search, ShoppingCart, Heart, Package, Star, User, Sparkles, Plus, Minus, Check, X } from 'lucide-react'

const LOGO_URL = 'https://customer-assets.emergentagent.com/job_5bfed863-cc5b-467d-9502-6446bf9a8d11/artifacts/80xsas6y_Asset%205.png'

export default function ProductPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const [product, setProduct] = useState(null)
  const [categories, setCategories] = useState([])
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [toast, setToast] = useState(null)
  const [customization, setCustomization] = useState({})
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [reviewForm, setReviewForm] = useState({ rating: 5, text: '' })
  const [submittingReview, setSubmittingReview] = useState(false)

  useEffect(() => {
    fetchData()
    // Check if coming from review link
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('review') === 'true' && session) {
      setShowReviewForm(true)
    }
  }, [params.slug, session])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      const catRes = await fetch('/api/categories')
      const catData = await catRes.json()
      setCategories(catData.categories || [])

      const prodRes = await fetch(`/api/products/${params.slug}`)
      const prodData = await prodRes.json()
      
      // Handle both formats: direct product or wrapped in product property
      const actualProduct = prodData.product || prodData
      
      if (actualProduct && !actualProduct.error) {
        setProduct(actualProduct)
        
        const reviewRes = await fetch(`/api/reviews?productId=${actualProduct.id || actualProduct._id}&approved=true`)
        const reviewData = await reviewRes.json()
        setReviews(reviewData.reviews || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddToCart = async () => {
    if (!product) return
    
    // Upload logo file if exists
    let uploadedLogoUrl = null
    if (customization.logoFile) {
      const formData = new FormData()
      formData.append('file', customization.logoFile)
      formData.append('folder', 'customizations/logos')
      
      try {
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })
        const uploadData = await uploadRes.json()
        if (uploadData.success) {
          uploadedLogoUrl = uploadData.url
        }
      } catch (error) {
        console.error('Error uploading logo:', error)
        setToast({ type: 'error', message: 'فشل رفع الشعار' })
        return
      }
    }
    
    const cartItem = {
      id: product.id || product._id,
      slug: product.slug || product.id,
      title: product.title,
      price: product.discount > 0 ? product.price * (1 - product.discount / 100) : product.price,
      image: product.image,
      quantity,
      customization: {
        ...customization,
        logoUrl: uploadedLogoUrl,
        logoFile: undefined, // Remove file object
        logoFileName: customization.logoFileName,
      }
    }
    
    const existingCart = JSON.parse(localStorage.getItem('prestige_cart') || '[]')
    const existingIndex = existingCart.findIndex(item => item.id === cartItem.id)
    
    if (existingIndex >= 0) {
      existingCart[existingIndex].quantity += quantity
      // Update customization if different
      existingCart[existingIndex].customization = cartItem.customization
    } else {
      existingCart.push(cartItem)
    }
    
    localStorage.setItem('prestige_cart', JSON.stringify(existingCart))
    setToast({ type: 'success', message: 'تمت الإضافة إلى السلة بنجاح!' })
    setTimeout(() => setToast(null), 3000)
  }

  const handleSubmitReview = async () => {
    if (!session) {
      setToast({ type: 'error', message: 'يجب تسجيل الدخول أولاً' })
      return
    }
    
    if (!reviewForm.text || reviewForm.rating < 1) {
      setToast({ type: 'error', message: 'يرجى إدخال التقييم والتعليق' })
      return
    }
    
    setSubmittingReview(true)
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          rating: reviewForm.rating,
          text: reviewForm.text,
        }),
      })
      
      if (res.ok) {
        setToast({ type: 'success', message: 'تم إرسال التقييم بنجاح! سيظهر بعد المراجعة ✅' })
        setShowReviewForm(false)
        setReviewForm({ rating: 5, text: '' })
      } else {
        const data = await res.json()
        setToast({ type: 'error', message: data.error || 'حدث خطأ' })
      }
    } catch (error) {
      setToast({ type: 'error', message: 'حدث خطأ في الإرسال' })
    } finally {
      setSubmittingReview(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050508]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-500"></div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050508]">
        <div className="text-center">
          <p className="text-white/60 text-lg mb-4">المنتج غير موجود</p>
          <button onClick={() => router.push('/')} className="glass-button px-6 py-2">
            العودة للرئيسية
          </button>
        </div>
      </div>
    )
  }

  const finalPrice = product.discount > 0
    ? product.price * (1 - product.discount / 100)
    : product.price

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
    : 0

  return (
    <div className="min-h-screen bg-[#050508]">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 glass-card px-6 py-3 rounded-xl flex items-center gap-3 border border-green-500/30">
          <Check size={18} className="text-green-400" />
          <span className="text-white font-medium">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <header className="glass-card border-b border-white/5 sticky top-0 z-40 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <img src={LOGO_URL} alt="Logo" className="h-12 w-auto" />
            </Link>

            <div className="flex-1 max-w-xl">
              <div className="relative">
                <input
                  type="text"
                  placeholder="ابحث عن التصاميم..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 pr-10 text-white placeholder-white/40 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all"
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40" size={20} />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/wishlist" className="glass-button p-2.5">
                <Heart size={20} />
              </Link>
              <Link href="/cart" className="glass-button p-2.5">
                <ShoppingCart size={20} />
              </Link>
              <Link href="/orders" className="glass-button p-2.5">
                <Package size={20} />
              </Link>
              <Link href="/account" className="glass-button p-2.5">
                <User size={20} />
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Categories Bar */}
      <CategoriesNav 
        categories={categories} 
        currentCategoryId={product?.categories?.[0]} 
      />

      {/* Product Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="glass-button px-6 py-2.5 flex items-center gap-2 hover:bg-purple-500/20 transition-all mb-6"
        >
          <ArrowRight size={20} />
          <span>رجوع</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Right Side - Product Image */}
          <div className="space-y-4">
            {/* Product Image */}
            <div className="glass-card p-4 rounded-2xl">
              <div className="aspect-square rounded-xl overflow-hidden bg-[#0d0d1a]">
                {product.image ? (
                  <img src={product.image} alt={product.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Sparkles size={60} className="text-purple-500/40" />
                  </div>
                )}
              </div>
            </div>

            {/* Description - Moved here under image */}
            <div className="glass-card p-4 rounded-xl">
              <h3 className="text-lg font-semibold text-white mb-3">الوصف</h3>
              <div 
                className="text-white/70 leading-relaxed whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: (product.description || 'لا يوجد وصف').replace(/\n/g, '<br/>') }}
              />
            </div>
          </div>

          {/* Left Side - YouTube Video & Product Details */}
          <div className="space-y-6">
            {/* YouTube Video - Moved to left side */}
            {product.youtubeUrl && (
              <div className="glass-card p-4 rounded-2xl">
                <div className="aspect-video rounded-xl overflow-hidden bg-black">
                  <iframe
                    src={product.youtubeUrl.replace('watch?v=', 'embed/')}
                    className="w-full h-full"
                    allowFullScreen
                    title="Product Video"
                  />
                </div>
              </div>
            )}

            {/* Title & Rating */}
            <div>
              <h1 className="text-3xl font-bold text-white mb-3">{product.title}</h1>
              
              {reviews.length > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Star
                        key={i}
                        size={18}
                        className={i <= Math.round(avgRating) ? 'fill-yellow-400 text-yellow-400' : 'text-white/20'}
                      />
                    ))}
                  </div>
                  <span className="text-white/60">({reviews.length} تقييم)</span>
                </div>
              )}

              {/* Price */}
              <div className="flex items-center gap-3 mb-6">
                {product.discount > 0 ? (
                  <>
                    <span className="text-3xl font-bold text-purple-400">${finalPrice.toFixed(2)}</span>
                    <span className="text-xl text-white/40 line-through">${product.price?.toFixed(2)}</span>
                    <span className="bg-gradient-to-r from-red-500 to-pink-500 text-white text-sm font-bold px-3 py-1 rounded-full">
                      وفّر {product.discount}%
                    </span>
                  </>
                ) : (
                  <span className="text-3xl font-bold text-purple-400">
                    {product.price === 0 ? 'مجاني' : `$${product.price?.toFixed(2)}`}
                  </span>
                )}
              </div>
            </div>

            {/* Customization Options */}
            {product.customizations && Object.keys(product.customizations).some(key => product.customizations[key]?.enabled) && (
              <div className="glass-card p-4 rounded-xl">
                <h3 className="text-lg font-semibold text-white mb-3">خيارات التخصيص</h3>
                <div className="space-y-3">
                  
                  {/* Logo Upload */}
                  {product.customizations.logoUpload?.enabled && (
                    <div>
                      <label className="text-white/80 text-sm mb-1 block">رفع الشعار</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            setCustomization({ ...customization, logoFile: file, logoFileName: file.name })
                          }
                        }}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white/70 text-sm file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-purple-500/20 file:text-purple-300 hover:file:bg-purple-500/30 cursor-pointer"
                      />
                      <p className="text-xs text-white/40 mt-1">يُفضل PNG بخلفية شفافة</p>
                    </div>
                  )}
                  
                  {/* Primary Color */}
                  {product.customizations.primaryColor?.enabled && (
                    <div>
                      <label className="text-white/80 text-sm mb-1 block">اللون الأساسي</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={customization.primaryColor || '#9333ea'}
                          onChange={(e) => setCustomization({ ...customization, primaryColor: e.target.value })}
                          className="w-16 h-10 rounded-lg cursor-pointer border-2 border-white/10"
                        />
                        <span className="text-white/60 text-sm">{customization.primaryColor || '#9333ea'}</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Secondary Color */}
                  {product.customizations.secondaryColor?.enabled && (
                    <div>
                      <label className="text-white/80 text-sm mb-1 block">اللون الثانوي</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={customization.secondaryColor || '#ec4899'}
                          onChange={(e) => setCustomization({ ...customization, secondaryColor: e.target.value })}
                          className="w-16 h-10 rounded-lg cursor-pointer border-2 border-white/10"
                        />
                        <span className="text-white/60 text-sm">{customization.secondaryColor || '#ec4899'}</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Notes */}
                  {product.customizations.notes?.enabled && (
                    <div>
                      <label className="text-white/80 text-sm mb-1 block">ملاحظات إضافية</label>
                      <textarea
                        placeholder="أضف أي ملاحظات أو طلبات خاصة..."
                        value={customization.notes || ''}
                        onChange={(e) => setCustomization({ ...customization, notes: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/30 resize-none focus:outline-none focus:border-purple-500/50"
                        rows={3}
                      />
                    </div>
                  )}
                  
                  {/* Options (Multiple Choice) */}
                  {product.customizations.options?.enabled && product.customizations.options.items?.length > 0 && (
                    <div>
                      <label className="text-white/80 text-sm mb-1 block">اختر نمطاً</label>
                      <select
                        value={customization.selectedOption || ''}
                        onChange={(e) => {
                          const selected = product.customizations.options.items.find(o => o.id === e.target.value)
                          setCustomization({ ...customization, selectedOption: selected })
                        }}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-purple-500/50"
                      >
                        <option value="">-- اختر --</option>
                        {product.customizations.options.items.map(option => (
                          <option key={option.id} value={option.id}>{option.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                </div>
              </div>
            )}

            {/* Quantity & Add to Cart */}
            <div className="glass-card p-4 rounded-xl">
              <div className="flex items-center gap-4 mb-4">
                <span className="text-white/80">الكمية:</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="glass-button p-2"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="text-white font-semibold w-12 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="glass-button p-2"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              <button
                onClick={handleAddToCart}
                className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <ShoppingCart size={20} />
                <span>إضافة إلى السلة</span>
              </button>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        {reviews.length > 0 && (
          <div className="glass-card p-8 rounded-2xl mb-6">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">تقييمات العملاء</h2>
                <div className="flex items-center gap-3">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Star
                        key={i}
                        size={20}
                        className={i <= Math.round(avgRating) ? 'fill-yellow-400 text-yellow-400' : 'text-white/20'}
                      />
                    ))}
                  </div>
                  <span className="text-white/60 text-lg">{avgRating.toFixed(1)} من 5</span>
                  <span className="text-white/40">({reviews.length} {reviews.length === 1 ? 'تقييم' : 'تقييمات'})</span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {reviews.map(review => (
                <div key={review._id} className="glass p-5 rounded-xl border border-white/5 hover:border-purple-500/30 transition-all">
                  <div className="flex items-start gap-4 mb-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-600 to-pink-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                      {review.userName?.charAt(0) || 'ع'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-white font-semibold">{review.userName || 'عميل'}</p>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map(i => (
                            <Star
                              key={i}
                              size={14}
                              className={i <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-white/20'}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-white/50 text-xs">عميل موثق ✓</p>
                    </div>
                  </div>
                  <p className="text-white/70 text-sm leading-relaxed">{review.text}</p>
                  {review.createdAt && (
                    <p className="text-white/40 text-xs mt-3">
                      {new Date(review.createdAt).toLocaleDateString('ar-SA', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Review Form Modal */}
        {showReviewForm && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md glass-strong rounded-3xl p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-black text-white">اترك تقييمك</h2>
                <button onClick={() => setShowReviewForm(false)} className="text-gray-400 hover:text-white">
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Rating Stars */}
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">التقييم *</label>
                  <div className="flex gap-2 justify-center">
                    {[1, 2, 3, 4, 5].map(i => (
                      <button
                        key={i}
                        onClick={() => setReviewForm(prev => ({ ...prev, rating: i }))}
                        className="transition-transform hover:scale-110"
                      >
                        <Star
                          size={32}
                          className={i <= reviewForm.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600 hover:text-yellow-400'}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Review Text */}
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">تعليقك *</label>
                  <textarea
                    value={reviewForm.text}
                    onChange={e => setReviewForm(prev => ({ ...prev, text: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 resize-none focus:outline-none focus:border-purple-500/50"
                    rows={4}
                    placeholder="شاركنا تجربتك مع هذا المنتج..."
                  />
                </div>
                
                {/* Submit Button */}
                <button
                  onClick={handleSubmitReview}
                  disabled={submittingReview}
                  className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50"
                >
                  {submittingReview ? 'جاري الإرسال...' : 'إرسال التقييم'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="glass-card border-t border-white/5 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-500 text-sm">© 2024 PRESTIGE DESIGNS - جميع الحقوق محفوظة</p>
          <p className="text-gray-600 text-xs mt-2">صُنع بـ 💜 لصناع المحتوى العرب</p>
        </div>
      </footer>
    </div>
  )
}
