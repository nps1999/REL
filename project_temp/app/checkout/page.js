'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js'
import Link from 'next/link'
import {
  ArrowRight, ShoppingCart, CreditCard, Award, Tag,
  Check, X, AlertCircle, Package, Sparkles, ChevronDown
} from 'lucide-react'

const LOGO_URL = 'https://customer-assets.emergentagent.com/job_5bfed863-cc5b-467d-9502-6446bf9a8d11/artifacts/80xsas6y_Asset%205.png'

// Country codes data
const COUNTRY_CODES = [
  { code: '+966', flag: '🇸🇦', name: 'السعودية' },
  { code: '+971', flag: '🇦🇪', name: 'الإمارات' },
  { code: '+965', flag: '🇰🇼', name: 'الكويت' },
  { code: '+974', flag: '🇶🇦', name: 'قطر' },
  { code: '+973', flag: '🇧🇭', name: 'البحرين' },
  { code: '+968', flag: '🇴🇲', name: 'عُمان' },
  { code: '+962', flag: '🇯🇴', name: 'الأردن' },
  { code: '+961', flag: '🇱🇧', name: 'لبنان' },
  { code: '+20', flag: '🇪🇬', name: 'مصر' },
  { code: '+964', flag: '🇮🇶', name: 'العراق' },
  { code: '+963', flag: '🇸🇾', name: 'سوريا' },
  { code: '+212', flag: '🇲🇦', name: 'المغرب' },
  { code: '+213', flag: '🇩🇿', name: 'الجزائر' },
  { code: '+216', flag: '🇹🇳', name: 'تونس' },
  { code: '+218', flag: '🇱🇾', name: 'ليبيا' },
  { code: '+1', flag: '🇺🇸', name: 'أمريكا' },
  { code: '+44', flag: '🇬🇧', name: 'بريطانيا' },
  { code: '+49', flag: '🇩🇪', name: 'ألمانيا' },
  { code: '+33', flag: '🇫🇷', name: 'فرنسا' },
  { code: '+90', flag: '🇹🇷', name: 'تركيا' },
]

export default function CheckoutPage() {
  const { data: session } = useSession()
  const router = useRouter()
  
  const [cart, setCart] = useState([])
  const [loading, setLoading] = useState(true)
  const [orderId, setOrderId] = useState(null)
  const [paymentStep, setPaymentStep] = useState('form') // form | paypal | success | failed
  const [paymentError, setPaymentError] = useState(null)
  const [loyaltyInfo, setLoyaltyInfo] = useState(null)
  const [settings, setSettings] = useState({})
  
  // Form state
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: session?.user?.email || '',
    whatsapp: '',
    countryCode: '+966',
    notes: '',
  })
  const [countryDropdown, setCountryDropdown] = useState(false)
  
  // Discount
  const [discountCode, setDiscountCode] = useState('')
  const [discountData, setDiscountData] = useState(null)
  const [discountError, setDiscountError] = useState('')
  const [validatingDiscount, setValidatingDiscount] = useState(false)
  
  // Loyalty
  const [useLoyalty, setUseLoyalty] = useState(false)
  
  useEffect(() => {
    const savedCart = JSON.parse(localStorage.getItem('prestige_cart') || '[]')
    setCart(savedCart)
    
    if (savedCart.length === 0) {
      router.push('/cart')
      return
    }
    
    if (session?.user?.email) {
      setForm(prev => ({ ...prev, email: session.user.email }))
    }
    
    Promise.all([
      session?.user ? fetch('/api/loyalty').then(r => r.json()) : Promise.resolve(null),
      fetch('/api/settings').then(r => r.json()),
    ]).then(([loyaltyData, settingsData]) => {
      if (loyaltyData) setLoyaltyInfo(loyaltyData)
      setSettings(settingsData || {})
    }).finally(() => setLoading(false))
  }, [session, router])
  
  const subtotal = cart.reduce((s, i) => s + (i.price * i.quantity), 0)
  const discountAmount = discountData?.discountAmount || 0
  const loyaltyConfig = loyaltyInfo?.config || { dollarPerPoint: 0.01 }
  const loyaltyDiscount = useLoyalty && loyaltyInfo 
    ? Math.min(loyaltyInfo.points * loyaltyConfig.dollarPerPoint, subtotal - discountAmount)
    : 0
  const total = Math.max(0, subtotal - discountAmount - loyaltyDiscount)
  
  const validateDiscount = async () => {
    if (!discountCode.trim()) return
    setValidatingDiscount(true)
    setDiscountError('')
    
    try {
      const res = await fetch(`/api/discounts/validate?code=${discountCode}&amount=${subtotal}`)
      const data = await res.json()
      
      if (res.ok) {
        setDiscountData(data)
      } else {
        setDiscountError(data.error || 'كود غير صحيح')
        setDiscountData(null)
      }
    } catch (e) {
      setDiscountError('حدث خطأ')
    } finally {
      setValidatingDiscount(false)
    }
  }
  
  const createOrder = async () => {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: `${form.firstName} ${form.lastName}`,
        customerEmail: form.email,
        customerWhatsapp: `${form.countryCode}${form.whatsapp}`,
        customerCountry: form.countryCode,
        notes: form.notes,
        items: cart.map(i => ({
          id: i.id,
          slug: i.slug || i.id,
          title: i.title,
          price: i.price,
          quantity: i.quantity,
          image: i.image,
          fileUrl: i.fileUrl,
          selectedOption: i.selectedOption,
          customization: i.customization || {},
        })),
        subtotal,
        discountCode: discountData ? discountCode : null,
        useLoyaltyPoints: useLoyalty,
      }),
    })
    return await res.json()
  }
  
  const handleCreatePayPalOrder = async () => {
    // Validate form
    if (!form.firstName || !form.lastName || !form.email || !form.whatsapp) {
      alert('الرجاء تعبئة جميع الحقول المطلوبة')
      throw new Error('Form incomplete')
    }
    
    // Create order in DB
    const orderData = await createOrder()
    if (!orderData.orderId) throw new Error('Failed to create order')
    
    setOrderId(orderData.orderId)
    
    // If free order, skip PayPal and go to success
    if (orderData.isFree) {
      localStorage.removeItem('prestige_cart')
      setCart([])
      setPaymentStep('success')
      setTimeout(() => router.push(`/orders/${orderData.orderId}`), 2000)
      return null // Don't proceed to PayPal
    }
    
    // Create PayPal order
    const paypalRes = await fetch('/api/paypal/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: orderData.orderId }),
    })
    const paypalData = await paypalRes.json()
    
    if (!paypalData.paypalOrderId) {
      throw new Error(paypalData.error || 'Failed to create PayPal order')
    }
    
    return paypalData.paypalOrderId
  }
  
  const handleCaptureOrder = async (data) => {
    const res = await fetch('/api/paypal/capture-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paypalOrderId: data.orderID,
        orderId,
      }),
    })
    
    const result = await res.json()
    
    if (result.success) {
      // Clear cart
      localStorage.removeItem('prestige_cart')
      setCart([])
      setPaymentStep('success')
      setTimeout(() => router.push(`/orders/${orderId}`), 3000)
    } else {
      setPaymentError(result.error || 'فشلت عملية الدفع')
      setPaymentStep('failed')
    }
  }
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" />
      </div>
    )
  }
  
  if (paymentStep === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="glass-strong rounded-3xl p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
            <Check size={40} className="text-green-400" />
          </div>
          <h1 className="text-2xl font-black text-white mb-3">تم الدفع بنجاح! 🎉</h1>
          <p className="text-gray-400 mb-6">شكراً لك! سيتم توجيهك لتفاصيل طلبك...</p>
          <div className="spinner mx-auto" />
        </div>
      </div>
    )
  }
  
  if (paymentStep === 'failed') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="glass-strong rounded-3xl p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
            <X size={40} className="text-red-400" />
          </div>
          <h1 className="text-2xl font-black text-white mb-3">فشلت عملية الدفع</h1>
          <p className="text-red-400 mb-6">{paymentError || 'حدث خطأ غير متوقع'}</p>
          <button onClick={() => setPaymentStep('form')} className="btn-primary px-8 py-3">
            المحاولة مجدداً
          </button>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-grid">
      {/* Header */}
      <header className="glass-header sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-4">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
            <ArrowRight size={18} />
            رجوع
          </button>
          <h1 className="text-white font-bold flex items-center gap-2 mr-auto">
            <CreditCard size={18} className="text-purple-400" />
            إتمام الدفع
          </h1>
        </div>
      </header>
      
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT - Form */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Customer Info */}
            <div className="glass-card p-6">
              <h2 className="text-white font-bold mb-5 flex items-center gap-2">
                <Package size={18} className="text-purple-400" />
                بيانات العميل
              </h2>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-gray-400 text-xs mb-1.5 block">الاسم الأول *</label>
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={e => setForm(prev => ({ ...prev, firstName: e.target.value }))}
                    className="glass-input text-sm"
                    placeholder="أحمد"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1.5 block">الاسم الأخير *</label>
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={e => setForm(prev => ({ ...prev, lastName: e.target.value }))}
                    className="glass-input text-sm"
                    placeholder="محمد"
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label className="text-gray-400 text-xs mb-1.5 block">البريد الإلكتروني *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                  className="glass-input text-sm"
                  placeholder="example@email.com"
                />
              </div>
              
              <div className="mb-4">
                <label className="text-gray-400 text-xs mb-1.5 block">رقم الواتساب *</label>
                <div className="flex gap-2">
                  {/* Country Code Selector */}
                  <div className="relative">
                    <button
                      onClick={() => setCountryDropdown(!countryDropdown)}
                      className="glass-input text-sm flex items-center gap-1 whitespace-nowrap px-3 py-2.5 min-w-[100px] justify-between"
                    >
                      {COUNTRY_CODES.find(c => c.code === form.countryCode)?.flag} {form.countryCode}
                      <ChevronDown size={12} />
                    </button>
                    
                    {countryDropdown && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setCountryDropdown(false)} />
                        <div className="absolute top-full mt-1 right-0 w-60 glass border border-purple-500/20 rounded-xl overflow-hidden z-50 shadow-2xl max-h-60 overflow-y-auto">
                          {COUNTRY_CODES.map(country => (
                            <button
                              key={country.code}
                              onClick={() => { setForm(prev => ({ ...prev, countryCode: country.code })); setCountryDropdown(false) }}
                              className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/5 transition-colors text-right ${
                                form.countryCode === country.code ? 'bg-purple-500/10 text-purple-300' : 'text-gray-300'
                              }`}
                            >
                              <span>{country.flag}</span>
                              <span>{country.name}</span>
                              <span className="text-gray-500 mr-auto">{country.code}</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  
                  <input
                    type="tel"
                    value={form.whatsapp}
                    onChange={e => setForm(prev => ({ ...prev, whatsapp: e.target.value }))}
                    className="glass-input text-sm flex-1"
                    placeholder="5XXXXXXXX"
                    dir="ltr"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">ملاحظات (اختياري)</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="glass-input text-sm resize-none"
                  rows={2}
                  placeholder="أي ملاحظات إضافية..."
                />
              </div>
            </div>
            
            {/* Discount Code */}
            <div className="glass-card p-6">
              <h2 className="text-white font-bold mb-4 flex items-center gap-2">
                <Tag size={18} className="text-purple-400" />
                كود الخصم
              </h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={discountCode}
                  onChange={e => { setDiscountCode(e.target.value.toUpperCase()); setDiscountError(''); setDiscountData(null) }}
                  className="glass-input text-sm flex-1 uppercase"
                  placeholder="أدخل كود الخصم"
                  dir="ltr"
                />
                <button
                  onClick={validateDiscount}
                  disabled={validatingDiscount || !discountCode.trim()}
                  className="btn-primary px-5 py-2.5 text-sm disabled:opacity-50 whitespace-nowrap"
                >
                  {validatingDiscount ? '...' : 'تطبيق'}
                </button>
              </div>
              
              {discountError && (
                <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                  <X size={12} /> {discountError}
                </p>
              )}
              
              {discountData && (
                <p className="text-green-400 text-xs mt-2 flex items-center gap-1">
                  <Check size={12} /> خصم ${discountAmount.toFixed(2)} ✓
                </p>
              )}
            </div>
            
            {/* Loyalty Points */}
            {session?.user && loyaltyInfo && loyaltyInfo.points > 0 && (
              <div className="glass-card p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Award size={20} className="text-yellow-400" />
                    <div>
                      <p className="text-white font-semibold text-sm">نقاط الولاء</p>
                      <p className="text-gray-400 text-xs">
                        لديك {loyaltyInfo.points} نقطة = ${(loyaltyInfo.points * loyaltyConfig.dollarPerPoint).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setUseLoyalty(!useLoyalty)}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                      useLoyalty 
                        ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40' 
                        : 'bg-white/5 text-gray-400 border border-white/10 hover:border-yellow-500/30'
                    }`}
                  >
                    {useLoyalty ? '✓ مفعّل' : 'استخدام النقاط'}
                  </button>
                </div>
                
                {useLoyalty && loyaltyDiscount > 0 && (
                  <p className="text-green-400 text-xs mt-2 flex items-center gap-1">
                    <Check size={12} /> سيتم خصم ${loyaltyDiscount.toFixed(2)}
                  </p>
                )}
              </div>
            )}
            
            {/* PayPal */}
            <div className="glass-card p-6">
              <h2 className="text-white font-bold mb-4 flex items-center gap-2">
                <CreditCard size={18} className="text-blue-400" />
                طريقة الدفع
              </h2>
              
              {(!form.firstName || !form.lastName || !form.email || !form.whatsapp) ? (
                <div className="text-center py-6">
                  <AlertCircle size={32} className="text-gray-500 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">يرجى إكمال بيانات العميل أولاً</p>
                </div>
              ) : total === 0 ? (
                <button
                  onClick={async () => {
                    setLoading(true)
                    try {
                      await handleCreatePayPalOrder()
                    } catch (error) {
                      console.error('Error creating free order:', error)
                      alert('حدث خطأ، يرجى المحاولة مجدداً')
                    } finally {
                      setLoading(false)
                    }
                  }}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="spinner" />
                  ) : (
                    <>
                      <Check size={20} />
                      <span>إتمام الطلب (مجاني)</span>
                    </>
                  )}
                </button>
              ) : (
                <PayPalScriptProvider options={{
                  'client-id': process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '',
                  currency: 'USD',
                  locale: 'ar_SA',
                  components: 'buttons',
                }}>
                  <div className="paypal-buttons-container">
                    <PayPalButtons
                      style={{
                        layout: 'vertical',
                        shape: 'rect',
                        label: 'pay',
                        height: 50,
                        tagline: false,
                      }}
                      forceReRender={[total]}
                      createOrder={handleCreatePayPalOrder}
                      onApprove={handleCaptureOrder}
                      onError={(err) => {
                        console.error('PayPal error:', err)
                        setPaymentError('حدث خطأ في PayPal. يرجى المحاولة مجدداً.')
                        setPaymentStep('failed')
                      }}
                      onCancel={() => {
                        if (orderId) {
                          setOrderId(null)
                        }
                      }}
                    />
                  </div>
                </PayPalScriptProvider>
              )}
            </div>
          </div>
          
          {/* RIGHT - Order Summary */}
          <div className="lg:col-span-1">
            <div className="glass-card p-6 sticky top-20">
              <h2 className="text-white font-bold mb-5 flex items-center gap-2">
                <ShoppingCart size={18} className="text-purple-400" />
                ملخص الطلب
              </h2>
              
              {/* Cart Items */}
              <div className="space-y-3 mb-5 max-h-60 overflow-y-auto">
                {cart.map(item => (
                  <div key={`${item.id}-${item.optionId || ''}`} className="flex gap-3">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#0d0d1a] flex-shrink-0">
                      {item.image ? (
                        <img src={item.image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Sparkles size={16} className="text-purple-500/40" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-medium line-clamp-2">{item.title}</p>
                      {item.selectedOptionName && (
                        <p className="text-purple-300 text-xs">{item.selectedOptionName}</p>
                      )}
                      <p className="text-gray-400 text-xs">x{item.quantity}</p>
                    </div>
                    <span className="text-white text-sm font-bold flex-shrink-0">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
              
              {/* Price Breakdown */}
              <div className="space-y-2 border-t border-white/10 pt-4 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">${subtotal.toFixed(2)}</span>
                  <span className="text-gray-400">المجموع الفرعي</span>
                </div>
                
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-400">-${discountAmount.toFixed(2)}</span>
                    <span className="text-gray-400">خصم الكود</span>
                  </div>
                )}
                
                {loyaltyDiscount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-yellow-400">-${loyaltyDiscount.toFixed(2)}</span>
                    <span className="text-gray-400">نقاط الولاء</span>
                  </div>
                )}
                
                <div className="flex justify-between text-lg font-black border-t border-white/10 pt-2">
                  <span className="gradient-text">${total.toFixed(2)}</span>
                  <span className="text-white">الإجمالي</span>
                </div>
              </div>
              
              {/* Security note */}
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Check size={12} className="text-green-400" />
                دفع آمن ومشفر عبر PayPal
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
