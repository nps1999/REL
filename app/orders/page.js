'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Package, Check, X, Clock, Download, Copy,
  ArrowRight, Sparkles, ShoppingCart, Star
} from 'lucide-react'

const LOGO_URL = 'https://customer-assets.emergentagent.com/job_5bfed863-cc5b-467d-9502-6446bf9a8d11/artifacts/80xsas6y_Asset%205.png'

const statusConfig = {
  paid: { label: 'مدفوع', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
  pending: { label: 'بانتظار الدفع', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
  failed: { label: 'فشل الدفع', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
  cancelled: { label: 'ملغى', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
}

const deliveryConfig = {
  pending: { label: 'بانتظار التسليم', color: 'text-yellow-400' },
  delivered: { label: 'تم التسليم', color: 'text-green-400' },
}


function getItemDeliveryFile(order, item) {
  if (!order || !item) return ''

  const deliveredFiles = Array.isArray(order?.deliveredFiles) ? order.deliveredFiles : []
  const delivered = deliveredFiles.find(file => (
    file?.productId === item?.id ||
    (file?.productTitle && file.productTitle === item?.title)
  ))

  // لو تم تسليم ملف يدويًا من الإدارة
  if (delivered?.fileUrl) return delivered.fileUrl

  return ''
}

function getItemDeliveredCodes(order, item) {
  if (!order || !item) return []
  const deliveredCodes = Array.isArray(order?.deliveredCodes) ? order.deliveredCodes : []
  return deliveredCodes.filter(code => (
    code?.productId === item?.id ||
    (code?.productTitle && code.productTitle === item?.title)
  ))
}

function isItemOutOfStockPending(order, item) {
  if (!order || !item) return false
  if (order.paymentStatus !== 'paid' || order.deliveryStatus !== 'pending') return false
  const pending = Array.isArray(order.stockPendingItems) ? order.stockPendingItems : []
  return pending.some(p => p?.productId === item?.id || p?.productTitle === item?.title)
}

function isItemDelivered(order, item) {
  if (!order || !item) return false
  if (getItemDeliveryFile(order, item)) return true
  return getItemDeliveredCodes(order, item).length > 0
}

export default function OrdersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [reviewedProductIds, setReviewedProductIds] = useState(new Set())
  const [reviewModal, setReviewModal] = useState({ open: false, orderId: null, productId: null, productTitle: '' })
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewText, setReviewText] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)
  const [copiedCode, setCopiedCode] = useState('')
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }
    if (status === 'authenticated') {
      Promise.all([
        fetch('/api/orders').then(r => r.json()),
        fetch('/api/reviews?mine=true').then(r => r.json()),
      ])
        .then(([ordersData, reviewsData]) => {
          const normalizedOrders = Array.isArray(ordersData) ? ordersData : []
          setOrders(normalizedOrders)
          const reviewed = Array.isArray(reviewsData)
            ? new Set(reviewsData.map(r => r.productId))
            : new Set()
          setReviewedProductIds(reviewed)

          if (normalizedOrders.some(o => o.paymentStatus === 'paid' && o.deliveryStatus === 'delivered' && o.deliverySeen !== true)) {
            fetch('/api/orders/mark-delivery-seen', { method: 'POST' }).catch(() => {})
          }
        })
        .finally(() => setLoading(false))
    }
  }, [status, router])
  

  const openReviewModal = (order, item) => {
    setReviewModal({
      open: true,
      orderId: order.id,
      productId: item.id,
      productTitle: item.title,
    })
    setReviewRating(5)
    setReviewText('')
  }

  const closeReviewModal = () => {
    setReviewModal({ open: false, orderId: null, productId: null, productTitle: '' })
    setReviewRating(5)
    setReviewText('')
  }

  const submitReview = async () => {
    if (!reviewText.trim()) return
    setSubmittingReview(true)
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: reviewModal.orderId,
          productId: reviewModal.productId,
          rating: reviewRating,
          text: reviewText,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'تعذر إرسال التقييم')
        return
      }

      setReviewedProductIds(prev => new Set([...prev, reviewModal.productId]))
      closeReviewModal()
      alert('تم إرسال تقييمك بنجاح ✅ سيتم مراجعته من الإدارة قبل النشر')
    } catch (error) {
      alert('حدث خطأ أثناء إرسال التقييم')
    } finally {
      setSubmittingReview(false)
    }
  }

  const handleCopyCode = async (code) => {
    if (!code) return
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(''), 1800)
    } catch {
      alert('تعذر نسخ الكود')
    }
  }

  if (status === 'loading' || loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="spinner" /></div>
  }
  
  return (
    <div className="min-h-screen bg-grid">
      <header className="glass-header sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white text-sm">
            <ArrowRight size={18} />الرئيسية
          </Link>
          <h1 className="text-white font-bold flex items-center gap-2 mr-auto">
            <Package size={18} className="text-purple-400" />
            طلباتي
          </h1>
        </div>
      </header>
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        {orders.length === 0 ? (
          <div className="text-center py-20">
            <Package size={60} className="text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg mb-6">لا توجد طلبات حتى الآن</p>
            <Link href="/products">
              <button className="btn-primary px-8 py-3 flex items-center gap-2 mx-auto">
                <ShoppingCart size={18} />
                تصفح المنتجات
              </button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map(order => {
              const payment = statusConfig[order.paymentStatus] || statusConfig.pending
              const delivery = deliveryConfig[order.deliveryStatus] || deliveryConfig.pending
              
              return (
                <div key={order.id} className="glass-card p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-white font-bold">رقم الطلب: #{order.id?.slice(-8)?.toUpperCase()}</p>
                      <p className="text-gray-400 text-xs mt-1">
                        {new Date(order.createdAt).toLocaleDateString('ar-SA', { dateStyle: 'long' })}
                      </p>
                    </div>
                    <div className="text-left text-right">
                      <p className="text-green-400 font-bold text-lg">${order.totalAmount?.toFixed(2)}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${payment.bg} ${payment.color}`}>
                        {payment.label}
                      </span>
                    </div>
                  </div>
                  
                  {/* Items */}
                  <div className="space-y-2 mb-4">
                    {order.items?.map((item, i) => {
                      const itemDelivered = isItemDelivered(order, item)
                      const itemDeliveryFile = getItemDeliveryFile(order, item)
                      const itemCodes = getItemDeliveredCodes(order, item)
                      const outOfStockPending = isItemOutOfStockPending(order, item)

                      return (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#111827] overflow-hidden flex-shrink-0">
                          {item.image ? (
                            <img src={item.image} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Sparkles size={14} className="text-purple-500/40" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-white text-sm font-medium">{item.title}</p>
                          {item.selectedOption?.name && (
                            <p className="text-purple-300 text-xs">{item.selectedOption.name}</p>
                          )}
                        </div>
                        <span className="text-gray-400 text-sm">${item.price?.toFixed(2)}</span>
                        
                        {order.paymentStatus === 'paid' && (
                          <span className={`px-2 py-1 rounded-lg text-[11px] whitespace-nowrap ${itemDelivered ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                            {itemDelivered ? 'تم التسليم' : 'بانتظار التسليم'}
                          </span>
                        )}

                        {/* Review Button for Delivered Items */}
                        {itemDelivered && order.paymentStatus === 'paid' && !reviewedProductIds.has(item.id) && (
                          <button
                            onClick={() => openReviewModal(order, item)}
                            className="px-3 py-1.5 rounded-lg bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 transition-colors text-xs flex items-center gap-1 whitespace-nowrap"
                          >
                            <Star size={12} />
                            تقييم
                          </button>
                        )}
                        {reviewedProductIds.has(item.id) && (
                          <span className="px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 text-xs whitespace-nowrap">
                            تم إرسال التقييم
                          </span>
                        )}

                        {itemDeliveryFile && (
                          <a
                            href={itemDeliveryFile}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-purple-400 hover:text-purple-300 text-xs bg-purple-500/10 px-2 py-1 rounded-lg transition-colors whitespace-nowrap"
                          >
                            <Download size={12} />
                            تحميل
                          </a>
                        )}
                        {order.paymentStatus === 'paid' && itemCodes.length > 0 && (
                          <div className="flex flex-col gap-1 min-w-[210px]">
                            {itemCodes.map((codeItem, idx) => (
                              <div key={`${codeItem.codeId || codeItem.code}-${idx}`} className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 rounded-lg">
                                <span className="text-emerald-300 text-xs font-mono truncate">{codeItem.code}</span>
                                <button
                                  onClick={() => handleCopyCode(codeItem.code)}
                                  className="text-emerald-300 hover:text-emerald-100"
                                  title="نسخ الكود"
                                >
                                  <Copy size={12} />
                                </button>
                              </div>
                            ))}
                            {copiedCode && itemCodes.some(c => c.code === copiedCode) && (
                              <p className="text-[10px] text-emerald-300">تم نسخ الكود ✅</p>
                            )}
                          </div>
                        )}
                        {outOfStockPending && (
                          <span className="px-2 py-1 rounded-lg text-[11px] bg-yellow-500/10 text-yellow-300 border border-yellow-500/20 whitespace-nowrap">
                            بانتظار التسليم بسبب نفاد المخزون
                          </span>
                        )}
                      </div>
                    )})}
                  </div>
                  
                  {/* Delivery status + Files */}
                  <div className="flex items-center justify-between border-t border-white/10 pt-4">
                    <div className="flex items-center gap-2">
                      {order.paymentStatus === 'paid' && (
                        <span className={`text-sm flex items-center gap-1 ${delivery.color}`}>
                          {order.deliveryStatus === 'delivered' ? <Check size={14} /> : <Clock size={14} />}
                          {delivery.label}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      {/* Gift */}
                      {order.gift?.fileUrl && (
                        <a
                          href={order.gift.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-yellow-400 text-xs bg-yellow-500/10 px-2 py-1 rounded-lg"
                        >
                          🎁 {order.gift.name}
                        </a>
                      )}
                      
                      {/* Earned Points */}
                      {order.earnedPoints > 0 && (
                        <span className="text-xs text-yellow-400 bg-yellow-500/10 px-2 py-1 rounded-full">
                          +{order.earnedPoints} نقطة
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {reviewModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="glass-card w-full max-w-md p-5 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold">تقييم المنتج</h3>
              <button onClick={closeReviewModal} className="text-gray-400 hover:text-white"><X size={18} /></button>
            </div>

            <p className="text-gray-300 text-sm mb-3">{reviewModal.productTitle}</p>

            <div className="mb-4">
              <p className="text-gray-400 text-xs mb-2">اختر عدد النجوم</p>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(num => (
                  <button key={num} onClick={() => setReviewRating(num)} className="p-1" type="button">
                    <Star size={20} className={num <= reviewRating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'} />
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <p className="text-gray-400 text-xs mb-2">رسالة التقييم</p>
              <textarea
                className="glass-input w-full min-h-[100px] text-sm"
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="اكتب رأيك في المنتج..."
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={submitReview}
                disabled={submittingReview || !reviewText.trim()}
                className="btn-primary flex-1 py-2 disabled:opacity-50"
              >
                {submittingReview ? 'جاري الإرسال...' : 'إرسال التقييم'}
              </button>
              <button onClick={closeReviewModal} className="px-4 py-2 rounded-xl bg-white/10 text-gray-300 hover:bg-white/20">إلغاء</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
