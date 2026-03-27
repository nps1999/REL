'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Package, Check, X, Clock, Download, ChevronDown,
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

export default function OrdersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }
    if (status === 'authenticated') {
      fetch('/api/orders')
        .then(r => r.json())
        .then(data => setOrders(Array.isArray(data) ? data : []))
        .finally(() => setLoading(false))
    }
  }, [status, router])
  
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
                    {order.items?.map((item, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#0d0d1a] overflow-hidden flex-shrink-0">
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
                        
                        {/* Review Button for Delivered Orders */}
                        {order.deliveryStatus === 'delivered' && order.paymentStatus === 'paid' && (
                          <Link
                            href={`/products/${item.slug || item.id}?review=true`}
                            className="px-3 py-1.5 rounded-lg bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 transition-colors text-xs flex items-center gap-1 whitespace-nowrap"
                          >
                            <Star size={12} />
                            تقييم
                          </Link>
                        )}
                      </div>
                    ))}
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
                      {/* Download files if delivered */}
                      {order.deliveryStatus === 'delivered' && order.deliveredFiles?.length > 0 && (
                        <div className="space-y-1">
                          {order.deliveredFiles.map((file, i) => (
                            file.fileUrl && (
                              <a
                                key={i}
                                href={file.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-purple-400 hover:text-purple-300 text-xs bg-purple-500/10 px-2 py-1 rounded-lg transition-colors"
                              >
                                <Download size={12} />
                                {file.productTitle || 'تحميل'}
                              </a>
                            )
                          ))}
                        </div>
                      )}
                      
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
    </div>
  )
}
