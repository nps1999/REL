'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  Heart, ShoppingCart, ArrowRight, Star, Share2,
  Check, Sparkles, Package, X, Upload, Palette
} from 'lucide-react'

const LOGO_URL = 'https://customer-assets.emergentagent.com/job_5bfed863-cc5b-467d-9502-6446bf9a8d11/artifacts/80xsas6y_Asset%205.png'

function StarRating({ rating, size = 16 }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          size={size}
          className={i <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}
        />
      ))}
    </div>
  )
}

function InteractiveStarRating({ value, onChange }) {
  const [hovered, setHovered] = useState(0)

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(0)}
          className="transition-transform hover:scale-110"
        >
          <Star
            size={24}
            className={i <= (hovered || value) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}
          />
        </button>
      ))}
    </div>
  )
}

export default function ProductPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const params = useParams()
  const slug = params?.slug

  const [product, setProduct] = useState(null)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedOption, setSelectedOption] = useState(null)
  const [inWishlist, setInWishlist] = useState(false)
  const [addedToCart, setAddedToCart] = useState(false)
  const [customizations, setCustomizations] = useState({})
  const [toast, setToast] = useState(null)

  const [reviewText, setReviewText] = useState('')
  const [reviewRating, setReviewRating] = useState(5)
  const [submittingReview, setSubmittingReview] = useState(false)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type, id: Date.now() })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    if (!slug) return

    setLoading(true)

    fetch(`/api/products/${slug}`)
      .then(r => r.json())
      .then(productData => {
        if (!productData || productData.error) {
          router.push('/products')
          return
        }

        setProduct(productData)

        fetch(`/api/reviews?productId=${productData.id || productData._id}`)
          .then(r => r.json())
          .then(data => {
            if (Array.isArray(data)) {
              setReviews(data)
            } else {
              setReviews(data.reviews || [])
            }
          })
          .catch(() => setReviews([]))

        if (session?.user) {
          fetch('/api/wishlist')
            .then(r => r.json())
            .then(data => {
              const ids = (data.wishlist || []).map(p => p.id || p._id)
              setInWishlist(ids.includes(productData.id) || ids.includes(productData._id))
            })
            .catch(() => setInWishlist(false))
        }
      })
      .catch(error => {
        console.error('Error fetching product:', error)
        router.push('/products')
      })
      .finally(() => setLoading(false))
  }, [slug, session, router])

  const handleAddToCart = () => {
    if (!product) return

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
      fileUrl: selectedOption?.fileUrl || product.fileUrl,
      optionId: selectedOption?.id || null,
      selectedOptionName: selectedOption?.name || null,
      selectedOption,
      customizations,
    }

    const existing = JSON.parse(localStorage.getItem('prestige_cart') || '[]')
    const key = `${cartItem.id}-${selectedOption?.id || ''}`
    const existingItem = existing.find(i => `${i.id}-${i.optionId || ''}` === key)

    let newCart
    if (existingItem) {
      newCart = existing.map(i =>
        `${i.id}-${i.optionId || ''}` === key
          ? { ...i, quantity: i.quantity + 1 }
          : i
      )
    } else {
      newCart = [...existing, cartItem]
    }

    localStorage.setItem('prestige_cart', JSON.stringify(newCart))
    setAddedToCart(true)
    showToast('تمت الإضافة للسلة! 🛒')
    setTimeout(() => setAddedToCart(false), 2000)
  }

  const handleToggleWishlist = async () => {
    if (!session?.user) {
      router.push('/auth/signin')
      return
    }

    try {
      const res = await fetch('/api/wishlist/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id || product._id }),
      })
      const data = await res.json()
      setInWishlist(!!data.added)
      showToast(data.added ? 'تمت الإضافة للمفضلة ❤️' : 'تمت الإزالة من المفضلة', 'info')
    } catch (error) {
      showToast('حدث خطأ في المفضلة', 'error')
    }
  }

  const handleShare = () => {
    if (!product) return

    if (navigator.share) {
      navigator.share({
        title: product.title,
        url: window.location.href,
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      showToast('تم نسخ الرابط!', 'info')
    }
  }

  const handleSubmitReview = async () => {
    if (!session?.user) {
      router.push('/auth/signin')
      return
    }

    if (!reviewText.trim()) {
      showToast('اكتب التقييم أولاً', 'error')
      return
    }

    setSubmittingReview(true)

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id || product._id,
          rating: reviewRating,
          text: reviewText,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        showToast('شكراً! سيظهر تقييمك بعد المراجعة')
        setReviewText('')
        setReviewRating(5)
      } else {
        showToast(data.error || 'خطأ ما', 'error')
      }
    } catch (e) {
      showToast('حدث خطأ', 'error')
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

  if (!product) return null

  const discountPrice = product.discount
    ? product.price * (1 - product.discount / 100)
    : null

  return (
    <div className="min-h-screen bg-grid">
      {toast && (
        <div className={`toast-notification ${toast.type === 'error' ? 'border-red-500/30' : ''}`}>
          {toast.type === 'success' && <Check size={18} className="text-green-400" />}
          {toast.type === 'error' && <X size={18} className="text-red-400" />}
          {toast.type === 'info' && <Sparkles size={18} className="text-purple-400" />}
          <span className="text-sm font-medium">{toast.msg}</span>
        </div>
      )}

      <header className="glass-header sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
          >
            <ArrowRight size={18} />
            رجوع
          </button>

          <Link href="/" className="flex items-center gap-2 mr-auto">
            <img src={LOGO_URL} alt="PRESTIGE" className="h-8 w-8 object-contain" />
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          <div className="space-y-6">
            <div className="glass-card overflow-hidden rounded-2xl">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.title}
                  className="w-full aspect-video object-cover"
                />
              ) : (
                <div className="w-full aspect-video flex items-center justify-center bg-[#0d0d1a]">
                  <Sparkles size={60} className="text-purple-500/30" />
                </div>
              )}
            </div>

            <div className="glass-card p-6">
              <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                <Sparkles size={16} className="text-purple-400" />
                وصف المنتج
              </h3>
              <div
                className="text-gray-300 text-sm leading-relaxed prose-invert whitespace-pre-line"
                dangerouslySetInnerHTML={{ __html: product.description || 'لا يوجد وصف متاح' }}
              />
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-black text-white mb-3">{product.title}</h1>

              <div className="flex items-center gap-4 mb-4">
                {discountPrice ? (
                  <div className="flex items-center gap-3">
                    <span className="text-3xl font-black text-green-400">${discountPrice.toFixed(2)}</span>
                    <div>
                      <span className="text-gray-500 line-through text-lg">${product.price?.toFixed(2)}</span>
                      <span className="mr-2 text-xs font-bold bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
                        -{product.discount}%
                      </span>
                    </div>
                  </div>
                ) : (
                  <span className="text-3xl font-black text-green-400">
                    ${product.price?.toFixed(2) || '0.00'}
                  </span>
                )}
              </div>

              <div className="flex gap-4 text-sm text-gray-400">
                {product.orderCount > 0 && (
                  <span className="flex items-center gap-1">
                    <Package size={14} />
                    {product.orderCount} طلب
                  </span>
                )}

                {reviews.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Star size={14} className="text-yellow-400" />
                    {(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)} ({reviews.length} تقييم)
                  </span>
                )}
              </div>
            </div>

            {product.youtubeUrl && (
              <div className="glass-card overflow-hidden rounded-2xl">
                <div className="aspect-video">
                  <iframe
                    src={`https://www.youtube.com/embed/${extractYouTubeId(product.youtubeUrl)}`}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title="Product Video"
                  />
                </div>
              </div>
            )}

            {product.customizations && (
              <div className="glass-card p-5 space-y-4">
                <h3 className="text-white font-bold text-sm flex items-center gap-2">
                  <Palette size={16} className="text-purple-400" />
                  التخصيصات
                </h3>

                {product.customizations.options?.enabled && product.customizations.options?.items?.length > 0 && (
                  <div>
                    <label className="text-gray-400 text-xs mb-2 block">اختر الخيار</label>
                    <div className="grid grid-cols-2 gap-2">
                      {product.customizations.options.items.map(opt => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setSelectedOption(selectedOption?.id === opt.id ? null : opt)}
                          className={`p-2.5 rounded-xl text-sm transition-all border ${
                            selectedOption?.id === opt.id
                              ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                              : 'border-white/10 bg-white/5 text-gray-300 hover:border-purple-400/40'
                          }`}
                        >
                          {opt.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {product.customizations.logoUpload?.enabled && (
                  <div>
                    <label className="text-gray-400 text-xs mb-2 block flex items-center gap-1">
                      <Upload size={12} />
                      رفع الشعار
                    </label>
                    <input
                      type="url"
                      placeholder="رابط الشعار (Drive/Dropbox/...)"
                      className="glass-input text-sm"
                      value={customizations.logoUrl || ''}
                      onChange={e => setCustomizations(prev => ({ ...prev, logoUrl: e.target.value }))}
                    />
                  </div>
                )}

                {product.customizations.primaryColor?.enabled && (
                  <div>
                    <label className="text-gray-400 text-xs mb-2 block">اللون الأساسي</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
                        value={customizations.primaryColor || '#7c3aed'}
                        onChange={e => setCustomizations(prev => ({ ...prev, primaryColor: e.target.value }))}
                      />
                      <span className="text-gray-300 text-sm">{customizations.primaryColor || '#7c3aed'}</span>
                    </div>
                  </div>
                )}

                {product.customizations.secondaryColor?.enabled && (
                  <div>
                    <label className="text-gray-400 text-xs mb-2 block">اللون الثانوي</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
                        value={customizations.secondaryColor || '#ec4899'}
                        onChange={e => setCustomizations(prev => ({ ...prev, secondaryColor: e.target.value }))}
                      />
                      <span className="text-gray-300 text-sm">{customizations.secondaryColor || '#ec4899'}</span>
                    </div>
                  </div>
                )}

                {product.customizations.notes?.enabled && (
                  <div>
                    <label className="text-gray-400 text-xs mb-2 block">ملاحظات مهمة</label>
                    <textarea
                      placeholder="أدخل ملاحظاتك هنا..."
                      className="glass-input text-sm resize-none"
                      rows={3}
                      value={customizations.notes || ''}
                      onChange={e => setCustomizations(prev => ({ ...prev, notes: e.target.value }))}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={handleAddToCart}
                className={`btn-primary w-full py-4 flex items-center justify-center gap-3 text-lg ${
                  addedToCart ? 'opacity-80' : ''
                }`}
              >
                {addedToCart ? (
                  <>
                    <Check size={20} />
                    تمت الإضافة!
                  </>
                ) : (
                  <>
                    <ShoppingCart size={20} />
                    إضافة للسلة
                  </>
                )}
              </button>

              <div className="flex gap-3">
                <button
                  onClick={handleToggleWishlist}
                  className={`flex-1 py-3 rounded-2xl border transition-all flex items-center justify-center gap-2 text-sm font-medium ${
                    inWishlist
                      ? 'bg-pink-500/20 border-pink-500/40 text-pink-400'
                      : 'border-white/10 bg-white/5 text-gray-300 hover:border-pink-400/40'
                  }`}
                >
                  <Heart size={16} className={inWishlist ? 'fill-current' : ''} />
                  {inWishlist ? 'في المفضلة' : 'إضافة للمفضلة'}
                </button>

                <button
                  onClick={handleShare}
                  className="py-3 px-5 rounded-2xl border border-white/10 bg-white/5 text-gray-300 hover:border-purple-400/40 transition-all flex items-center gap-2 text-sm"
                >
                  <Share2 size={16} />
                  مشاركة
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Star size={20} className="text-yellow-400" />
            تقييمات العملاء ({reviews.length})
          </h2>

          {reviews.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">لا توجد تقييمات بعد. كن أول من يقيّم!</p>
          ) : (
            <div className="space-y-4 mb-8">
              {reviews.map(review => (
                <div key={review.id || review._id} className="border-b border-white/5 pb-4 last:border-0">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-pink-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden">
                      {review.userImage ? (
                        <img src={review.userImage} alt="" className="w-full h-full object-cover" />
                      ) : (
                        review.userName?.charAt(0) || 'ع'
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white font-medium text-sm">{review.userName || 'مستخدم'}</span>
                        <StarRating rating={review.rating} size={14} />
                      </div>
                      <p className="text-gray-300 text-sm leading-relaxed">{review.text}</p>
                      <p className="text-gray-600 text-xs mt-1">
                        {review.createdAt ? new Date(review.createdAt).toLocaleDateString('ar-SA') : ''}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {session?.user && (
            <div className="border-t border-white/10 pt-6">
              <h3 className="text-white font-semibold mb-4">أضف تقييمك</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-gray-400 text-xs mb-2 block">التقييم</label>
                  <InteractiveStarRating value={reviewRating} onChange={setReviewRating} />
                </div>
                <textarea
                  value={reviewText}
                  onChange={e => setReviewText(e.target.value)}
                  placeholder="شاركنا رأيك في المنتج..."
                  className="glass-input resize-none text-sm"
                  rows={3}
                />
                <button
                  onClick={handleSubmitReview}
                  disabled={submittingReview || !reviewText.trim()}
                  className="btn-primary px-6 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingReview ? 'جاري الإرسال...' : 'إرسال التقييم'}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function extractYouTubeId(url) {
  if (!url) return ''
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?#]+)/)
  return match ? match[1] : url
}