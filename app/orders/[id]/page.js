'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Package, Check, Clock, Download, ArrowRight, X, Sparkles, Gift, Copy } from 'lucide-react'

const LOGO_URL = 'https://customer-assets.emergentagent.com/job_5bfed863-cc5b-467d-9502-6446bf9a8d11/artifacts/80xsas6y_Asset%205.png'

export default function OrderDetailPage({ params }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [copiedCode, setCopiedCode] = useState('')
  
  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/auth/signin'); return }
    if (status === 'authenticated' || status === 'loading') {
      fetch(`/api/orders/${params.id}`)
        .then(r => r.json())
        .then(d => {
          if (d.error) router.push('/orders')
          else setOrder(d)
        })
        .finally(() => setLoading(false))
    }
  }, [status, params.id, router])
  
  if (loading || !order) return <div className="min-h-screen flex items-center justify-center"><div className="spinner" /></div>
  
  const isPaid = order.paymentStatus === 'paid'
  const isDelivered = order.deliveryStatus === 'delivered'

  const copyCode = async (code) => {
    if (!code) return
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(''), 1800)
    } catch {
      alert('تعذر نسخ الكود')
    }
  }
  
  return (
    <div className="min-h-screen bg-grid">
      <header className="glass-header sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/orders" className="flex items-center gap-2 text-gray-400 hover:text-white text-sm"><ArrowRight size={18} />طلباتي</Link>
          <h1 className="text-white font-bold mr-auto flex items-center gap-2">
            <Package size={18} className="text-purple-400" />
            تفاصيل الطلب
          </h1>
        </div>
      </header>
      
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Status banner */}
        <div className={`rounded-2xl p-5 text-center ${
          isDelivered ? 'bg-green-500/10 border border-green-500/20' :
          isPaid ? 'bg-yellow-500/10 border border-yellow-500/20' :
          order.paymentStatus === 'failed' ? 'bg-red-500/10 border border-red-500/20' :
          'bg-gray-500/10 border border-gray-500/20'
        }`}>
          <div className="flex items-center justify-center gap-2">
            {isDelivered ? <Check size={24} className="text-green-400" /> : isPaid ? <Clock size={24} className="text-yellow-400" /> : <X size={24} className="text-red-400" />}
            <p className={`font-bold text-lg ${
              isDelivered ? 'text-green-400' : isPaid ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {isDelivered ? 'تم تسليم طلبك 🎉' : isPaid ? 'بانتظار التسليم' : order.paymentStatus === 'failed' ? 'فشلت عملية الدفع' : 'بانتظار الدفع'}
            </p>
          </div>
          <p className="text-gray-400 text-sm mt-1">رقم الطلب: #{order.id?.slice(-8)?.toUpperCase()}</p>
        </div>
        
        {/* Order items */}
        <div className="glass-card p-6">
          <h2 className="text-white font-bold mb-4">المنتجات المطلوبة</h2>
          <div className="space-y-4">
            {order.items?.map((item, i) => {
              const fileToDeliver = isDelivered ? order.deliveredFiles?.find(f => f.productId === item.id) : null
              const deliveredCodes = isPaid
                ? (Array.isArray(order.deliveredCodes) ? order.deliveredCodes : []).filter(c => c.productId === item.id)
                : []
              const outOfStockPending = isPaid && order.deliveryStatus === 'pending'
                && (Array.isArray(order.stockPendingItems) ? order.stockPendingItems : []).some(p => p.productId === item.id)
              return (
                <div key={i} className="flex items-center gap-3 border-b border-white/5 pb-4 last:border-0">
                  <div className="w-14 h-14 rounded-xl bg-[#111827] overflow-hidden flex-shrink-0">
                    {item.image ? <img src={item.image} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Sparkles size={16} className="text-purple-500/40" /></div>}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">{item.title}</p>
                    {item.selectedOption?.name && <p className="text-purple-300 text-xs">{item.selectedOption.name}</p>}
                    <p className="text-green-400 font-bold">${item.price?.toFixed(2)}</p>
                  </div>
                  {fileToDeliver?.fileUrl && (
                    <a href={fileToDeliver.fileUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-2 rounded-xl bg-purple-500/20 text-purple-400 text-xs flex items-center gap-1 hover:bg-purple-500/30 transition-colors">
                      <Download size={12} />تحميل
                    </a>
                  )}
                  {deliveredCodes.length > 0 && (
                    <div className="flex flex-col gap-1 min-w-[220px]">
                      {deliveredCodes.map((codeItem, codeIndex) => (
                        <div key={`${codeItem.codeId || codeItem.code}-${codeIndex}`} className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-2 py-1.5">
                          <span className="text-emerald-300 text-xs font-mono truncate">{codeItem.code}</span>
                          <button onClick={() => copyCode(codeItem.code)} className="text-emerald-300 hover:text-emerald-100" title="نسخ الكود">
                            <Copy size={12} />
                          </button>
                        </div>
                      ))}
                      {copiedCode && deliveredCodes.some(c => c.code === copiedCode) && (
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
              )
            })}
          </div>
        </div>
        
        {/* Gift */}
        {order.gift && (
          <div className="glass-card p-5 border-yellow-500/20 bg-yellow-500/5">
            <h2 className="text-yellow-400 font-bold mb-3 flex items-center gap-2">
              <Gift size={18} />هدية من المتجر! 🎁
            </h2>
            <p className="text-white">{order.gift.name}</p>
            {order.gift.fileUrl && (
              <a href={order.gift.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 text-yellow-400 text-sm hover:text-yellow-300">
                <Download size={14} />تحميل الهدية
              </a>
            )}
          </div>
        )}
        
        {/* Price breakdown */}
        <div className="glass-card p-6">
          <h2 className="text-white font-bold mb-4">تفاصيل الدفع</h2>
          <div className="space-y-2">
            <div className="flex justify-between text-sm"><span className="text-gray-400">المجموع الفرعي</span><span className="text-white">${order.subtotal?.toFixed(2)}</span></div>
            {order.discountAmount > 0 && <div className="flex justify-between text-sm"><span className="text-gray-400">خصم الكود</span><span className="text-green-400">-${order.discountAmount?.toFixed(2)}</span></div>}
            {order.loyaltyDiscount > 0 && <div className="flex justify-between text-sm"><span className="text-gray-400">نقاط الولاء</span><span className="text-yellow-400">-${order.loyaltyDiscount?.toFixed(2)}</span></div>}
            <div className="flex justify-between text-lg font-black pt-2 border-t border-white/10">
              <span className="gradient-text">${order.totalAmount?.toFixed(2)}</span>
              <span className="text-white">الإجمالي</span>
            </div>
          </div>
        </div>
        
        {/* Earned points */}
        {order.earnedPoints > 0 && (
          <div className="glass p-4 rounded-2xl flex items-center gap-3">
            <span className="text-2xl">🏆</span>
            <p className="text-white text-sm">حصلت على <span className="text-yellow-400 font-bold">{order.earnedPoints} نقطة ولاء</span> من هذا الطلب</p>
          </div>
        )}
        
        <Link href="/orders">
          <button className="w-full py-3 text-center text-gray-400 hover:text-white text-sm transition-colors">
            العودة لقائمة الطلبات
          </button>
        </Link>
      </main>
    </div>
  )
}
