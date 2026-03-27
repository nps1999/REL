'use client'
import { useState, useEffect } from 'react'
import {
  Package, Check, X, Clock, Eye, ChevronDown, MessageCircle,
  Download, Gift, Truck, AlertCircle, Edit, Search
} from 'lucide-react'

export default function AdminOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [deliverFiles, setDeliverFiles] = useState([])
  const [giftData, setGiftData] = useState({ name: '', fileUrl: '' })
  const [delivering, setDelivering] = useState(false)
  const [toast, setToast] = useState(null)
  const [filter, setFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  
  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }
  
  useEffect(() => {
    fetch('/api/orders').then(r => r.json()).then(data => setOrders(Array.isArray(data) ? data : [])).finally(() => setLoading(false))
  }, [])
  
  const openOrder = (order) => {
    setSelectedOrder(order)
    setDeliverFiles(order.items?.map(item => ({ productId: item.id, productTitle: item.title, fileUrl: item.selectedOption?.fileUrl || item.fileUrl || '' })) || [])
    setGiftData({ name: '', fileUrl: '' })
  }
  
  const handleDeliver = async () => {
    if (!selectedOrder) return
    setDelivering(true)
    try {
      const res = await fetch(`/api/orders/${selectedOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'deliver',
          files: deliverFiles,
          gift: giftData.name ? giftData : null,
        }),
      })
      if (res.ok) {
        showToast('تم التسليم بنجاح 🎉')
        setOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, deliveryStatus: 'delivered' } : o))
        setSelectedOrder(null)
      }
    } catch (e) { showToast('خطأ', 'error') }
    setDelivering(false)
  }
  
  const handleCancel = async (order) => {
    if (!confirm('هل أنت متأكد من إلغاء الطلب؟')) return
    await fetch(`/api/orders/${order.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancel' }),
    })
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, paymentStatus: 'cancelled' } : o))
    showToast('تم الإلغاء')
  }
  
  const handleMarkPaid = async (order) => {
    const res = await fetch(`/api/orders/${order.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentStatus: 'paid' }),
    })
    if (res.ok) {
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, paymentStatus: 'paid' } : o))
      showToast('تم تغيير حالة الدفع')
    }
  }
  
  const openWhatsApp = (order) => {
    const phone = order.customerWhatsapp?.replace(/[^0-9]/g, '')
    if (phone) window.open(`https://wa.me/${phone}`, '_blank')
  }
  
  const filteredOrders = orders.filter(o => {
    // Filter by payment/delivery status
    if (filter === 'paid') return o.paymentStatus === 'paid'
    if (filter === 'pending_delivery') return o.paymentStatus === 'paid' && o.deliveryStatus === 'pending'
    if (filter === 'delivered') return o.deliveryStatus === 'delivered'
    if (filter === 'failed') return o.paymentStatus === 'failed'
    return true
  }).filter(o => {
    // Search filter
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      o.id?.toLowerCase().includes(query) ||
      o.customerName?.toLowerCase().includes(query) ||
      o.customerEmail?.toLowerCase().includes(query) ||
      o.customerWhatsapp?.toLowerCase().includes(query) ||
      o.items?.some(item => item.title?.toLowerCase().includes(query))
    )
  })
  
  const stats = {
    total: orders.filter(o => o.paymentStatus === 'paid').length,
    totalAmount: orders.filter(o => o.paymentStatus === 'paid').reduce((s, o) => s + (o.totalAmount || 0), 0),
    pending: orders.filter(o => o.paymentStatus === 'paid' && o.deliveryStatus === 'pending').length,
    delivered: orders.filter(o => o.deliveryStatus === 'delivered').length,
  }
  
  if (loading) return <div className="flex items-center justify-center h-64"><div className="spinner" /></div>
  
  return (
    <div className="space-y-6">
      {toast && <div className={`toast-notification ${toast.type === 'error' ? 'border-red-500/30' : ''}`}><span className="text-sm">{toast.msg}</span></div>}
      
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'إجمالي الطلبات', value: stats.total, color: 'text-purple-400' },
          { label: 'إجمالي الدخل', value: `$${stats.totalAmount.toFixed(2)}`, color: 'text-green-400' },
          { label: 'بانتظار التسليم', value: stats.pending, color: 'text-yellow-400' },
          { label: 'مسلّمة', value: stats.delivered, color: 'text-blue-400' },
        ].map(s => (
          <div key={s.label} className="glass-card p-4 text-center">
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-gray-400 text-xs mt-1">{s.label}</p>
          </div>
        ))}
      </div>
      
      {/* Filter & Search */}
      <div className="space-y-3">
        {/* Search Box */}
        <div className="relative">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input
            type="text"
            placeholder="بحث برقم الطلب، اسم العميل، البريد، الواتساب، أو اسم المنتج..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 pr-12 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
            >
              <X size={16} />
            </button>
          )}
        </div>
        
        {/* Filter Buttons */}
        <div className="flex gap-2 flex-wrap">
          {[
            { key: 'all', label: 'الكل' },
            { key: 'paid', label: 'مدفوعة' },
            { key: 'pending_delivery', label: 'بانتظار التسليم' },
            { key: 'delivered', label: 'مسلّمة' },
            { key: 'failed', label: 'فاشلة' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                filter === f.key ? 'bg-purple-500/30 border border-purple-500/50 text-purple-300' : 'bg-white/5 border border-white/10 text-gray-400'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Orders */}
      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-16 text-gray-400">لا توجد طلبات</div>
        ) : (
          filteredOrders.map(order => (
            <div
              key={order.id}
              className={`glass-card p-4 transition-all ${
                order.paymentStatus === 'paid' && order.deliveryStatus === 'pending' 
                  ? 'border-yellow-500/20 bg-yellow-500/3' 
                  : ''
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-white font-bold text-sm">طلب #{order.id?.slice(-8)?.toUpperCase()}</p>
                  <p className="text-gray-400 text-xs mt-0.5">{order.customerName} | {order.customerEmail}</p>
                  <p className="text-gray-500 text-xs">{new Date(order.createdAt).toLocaleDateString('ar-SA')}</p>
                </div>
                <div className="text-left">
                  <p className="text-green-400 font-bold">${order.totalAmount?.toFixed(2)}</p>
                  <div className="flex gap-1 mt-1 flex-wrap justify-end">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${
                      order.paymentStatus === 'paid' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                      order.paymentStatus === 'failed' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                      order.paymentStatus === 'cancelled' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                      'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                    }`}>
                      {order.paymentStatus === 'paid' ? 'مدفوع' : order.paymentStatus === 'failed' ? 'فاشل' : order.paymentStatus === 'cancelled' ? 'ملغى' : 'معلق'}
                    </span>
                    {order.paymentStatus === 'paid' && (
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${
                        order.deliveryStatus === 'delivered' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-orange-500/10 border-orange-500/20 text-orange-400'
                      }`}>
                        {order.deliveryStatus === 'delivered' ? 'مسلّم' : 'بانتظار'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => openOrder(order)}
                  className="px-3 py-1.5 rounded-xl bg-purple-500/20 text-purple-400 text-xs font-medium hover:bg-purple-500/30 transition-colors flex items-center gap-1"
                >
                  <Eye size={12} />تفاصيل
                </button>
                
                {order.customerWhatsapp && (
                  <button
                    onClick={() => openWhatsApp(order)}
                    className="px-3 py-1.5 rounded-xl bg-green-500/20 text-green-400 text-xs font-medium flex items-center gap-1"
                  >
                    📱 واتساب
                  </button>
                )}
                
                {order.paymentStatus === 'paid' && order.deliveryStatus === 'pending' && (
                  <button
                    onClick={() => openOrder(order)}
                    className="px-3 py-1.5 rounded-xl bg-blue-500/20 text-blue-400 text-xs font-medium flex items-center gap-1"
                  >
                    <Truck size={12} />تسليم الطلب
                  </button>
                )}
                
                {(order.paymentStatus === 'failed' || order.paymentStatus === 'pending') && (
                  <button
                    onClick={() => handleMarkPaid(order)}
                    className="px-3 py-1.5 rounded-xl bg-green-500/20 text-green-400 text-xs font-medium flex items-center gap-1"
                  >
                    <Check size={12} />تحديد كمدفوع
                  </button>
                )}
                
                {order.paymentStatus !== 'cancelled' && (
                  <button
                    onClick={() => handleCancel(order)}
                    className="px-3 py-1.5 rounded-xl bg-red-500/20 text-red-400 text-xs font-medium"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 overflow-y-auto py-8 px-4">
          <div className="max-w-xl mx-auto glass-strong rounded-3xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-black text-white">تفاصيل الطلب #{selectedOrder.id?.slice(-8)?.toUpperCase()}</h2>
              <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            
            <div className="space-y-4">
              {/* Customer info */}
              <div className="glass p-4 rounded-2xl space-y-2">
                <p className="text-white font-medium">{selectedOrder.customerName}</p>
                <p className="text-gray-400 text-sm">{selectedOrder.customerEmail}</p>
                <p className="text-gray-400 text-sm">{selectedOrder.customerWhatsapp}</p>
                {selectedOrder.customerCountry && <p className="text-gray-400 text-sm">📍 {selectedOrder.customerCountry}</p>}
                {selectedOrder.notes && <p className="text-gray-300 text-sm mt-2">ملاحظات: {selectedOrder.notes}</p>}
                
                {/* Order Financial Details */}
                <div className="border-t border-white/10 pt-2 mt-2 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">المجموع الفرعي:</span>
                    <span className="text-white">${selectedOrder.subtotal?.toFixed(2) || '0.00'}</span>
                  </div>
                  
                  {selectedOrder.discountCode && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">كود الخصم ({selectedOrder.discountCode}):</span>
                      <span className="text-red-400">-${selectedOrder.discountAmount?.toFixed(2) || '0.00'}</span>
                    </div>
                  )}
                  
                  {selectedOrder.loyaltyPointsUsed > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">نقاط الولاء ({selectedOrder.loyaltyPointsUsed} نقطة):</span>
                      <span className="text-red-400">-${selectedOrder.loyaltyDiscount?.toFixed(2) || '0.00'}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between text-base font-bold border-t border-white/10 pt-1">
                    <span className="text-white">الإجمالي:</span>
                    <span className="text-green-400">${selectedOrder.totalAmount?.toFixed(2) || '0.00'}</span>
                  </div>
                </div>
                
                {selectedOrder.earnedPoints > 0 && <p className="text-yellow-400 text-sm mt-1">🏆 نقاط مكتسبة: {selectedOrder.earnedPoints}</p>}
              </div>
              
              {/* Items */}
              <div className="space-y-2">
                {selectedOrder.items?.map((item, i) => (
                  <div key={i} className="glass rounded-xl overflow-hidden">
                    <div className="flex items-center gap-3 p-3">
                      {item.image && <img src={item.image} alt="" className="w-10 h-10 rounded-lg object-cover" />}
                      <div className="flex-1">
                        <p className="text-white text-sm font-medium">{item.title}</p>
                        <p className="text-gray-400 text-xs">الكمية: {item.quantity || 1}</p>
                      </div>
                      <span className="text-green-400 font-bold text-sm">${item.price?.toFixed(2)}</span>
                    </div>
                    
                    {/* Customizations */}
                    {item.customization && Object.keys(item.customization).filter(k => item.customization[k] && k !== 'logoFile').length > 0 && (
                      <div className="px-3 pb-3 border-t border-white/5 pt-2 space-y-1">
                        <p className="text-purple-400 text-xs font-medium mb-1">التخصيصات:</p>
                        
                        {item.customization.logoUrl && (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-gray-400">الشعار:</span>
                            <a href={item.customization.logoUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline" dir="ltr">
                              {item.customization.logoFileName || 'عرض الشعار'}
                            </a>
                          </div>
                        )}
                        
                        {item.customization.primaryColor && (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-gray-400">اللون الأساسي:</span>
                            <div className="flex items-center gap-1">
                              <div className="w-4 h-4 rounded border border-white/20" style={{ backgroundColor: item.customization.primaryColor }} />
                              <span className="text-white/70" dir="ltr">{item.customization.primaryColor}</span>
                            </div>
                          </div>
                        )}
                        
                        {item.customization.secondaryColor && (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-gray-400">اللون الثانوي:</span>
                            <div className="flex items-center gap-1">
                              <div className="w-4 h-4 rounded border border-white/20" style={{ backgroundColor: item.customization.secondaryColor }} />
                              <span className="text-white/70" dir="ltr">{item.customization.secondaryColor}</span>
                            </div>
                          </div>
                        )}
                        
                        {item.customization.notes && (
                          <div className="text-xs">
                            <span className="text-gray-400">ملاحظات:</span>
                            <p className="text-white/70 mt-0.5">{item.customization.notes}</p>
                          </div>
                        )}
                        
                        {item.customization.selectedOption && (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-gray-400">النمط المحدد:</span>
                            <span className="text-purple-300">{item.customization.selectedOption.name}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Deliver Files */}
              {selectedOrder.paymentStatus === 'paid' && selectedOrder.deliveryStatus === 'pending' && (
                <div className="space-y-3">
                  <h3 className="text-white font-bold">روابط التسليم</h3>
                  {deliverFiles.map((file, i) => (
                    <div key={i}>
                      <label className="text-gray-400 text-xs mb-1 block">{file.productTitle}</label>
                      <input
                        type="url"
                        value={file.fileUrl}
                        onChange={e => setDeliverFiles(prev => prev.map((f, fi) => fi === i ? { ...f, fileUrl: e.target.value } : f))}
                        className="glass-input text-sm"
                        placeholder="رابط الملف (Drive)"
                        dir="ltr"
                      />
                    </div>
                  ))}
                  
                  {/* Gift */}
                  <div className="border-t border-white/10 pt-3">
                    <p className="text-gray-400 text-xs mb-2">هدية مع الطلب (اختياري) 🎁</p>
                    <input type="text" value={giftData.name} onChange={e => setGiftData(prev => ({ ...prev, name: e.target.value }))} className="glass-input text-sm mb-2" placeholder="اسم الهدية" />
                    {giftData.name && (
                      <input type="url" value={giftData.fileUrl} onChange={e => setGiftData(prev => ({ ...prev, fileUrl: e.target.value }))} className="glass-input text-sm" placeholder="رابط ملف الهدية" dir="ltr" />
                    )}
                  </div>
                  
                  <button onClick={handleDeliver} disabled={delivering} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
                    <Truck size={16} />{delivering ? 'جاري التسليم...' : 'تسليم الطلب'}
                  </button>
                </div>
              )}
              
              {selectedOrder.deliveryStatus === 'delivered' && (
                <div className="flex items-center gap-2 text-green-400 glass p-3 rounded-xl">
                  <Check size={18} />
                  <span className="text-sm font-medium">تم تسليم هذا الطلب</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
