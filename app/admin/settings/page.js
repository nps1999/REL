'use client'
import { useState, useEffect } from 'react'
import { Settings, Plus, Trash2, Save, Check, X, Image, Link, Sun, Moon, Star } from 'lucide-react'

export default function AdminSettings() {
  const [settings, setSettings] = useState({
    logo: '',
    slider: [],
    socialLinks: { discord: '', whatsapp: '', telegram: '', youtube: '', tiktok: '' },
    featuredCustomers: [],
    faq: [],
    loyaltyConfig: { pointsPerDollar: 1, dollarPerPoint: 0.01 },
    festivities: { ramadan: false, eid_fitr: false, eid_adha: false },
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [activeTab, setActiveTab] = useState('general')
  
  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }
  
  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => {
      if (d) setSettings(prev => ({ ...prev, ...d }))
    }).finally(() => setLoading(false))
  }, [])
  
  const handleSave = async () => {
    setSaving(true)
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
    if (res.ok) showToast('تم الحفظ بنجاح ✅')
    setSaving(false)
  }
  
  const addSlide = () => setSettings(p => ({ ...p, slider: [...(p.slider || []), { id: Date.now().toString(), image: '', title: '', subtitle: '' }] }))
  const removeSlide = (i) => setSettings(p => ({ ...p, slider: p.slider.filter((_, idx) => idx !== i) }))
  const updateSlide = (i, field, val) => setSettings(p => ({ ...p, slider: p.slider.map((s, idx) => idx === i ? { ...s, [field]: val } : s) }))
  
  const addCustomer = () => setSettings(p => ({ ...p, featuredCustomers: [...(p.featuredCustomers || []), { name: '', image: '', link: '' }] }))
  const removeCustomer = (i) => setSettings(p => ({ ...p, featuredCustomers: p.featuredCustomers.filter((_, idx) => idx !== i) }))
  const updateCustomer = (i, field, val) => setSettings(p => ({ ...p, featuredCustomers: p.featuredCustomers.map((c, idx) => idx === i ? { ...c, [field]: val } : c) }))
  
  const addFaq = () => setSettings(p => ({ ...p, faq: [...(p.faq || []), { question: '', answer: '' }] }))
  const removeFaq = (i) => setSettings(p => ({ ...p, faq: p.faq.filter((_, idx) => idx !== i) }))
  const updateFaq = (i, field, val) => setSettings(p => ({ ...p, faq: p.faq.map((f, idx) => idx === i ? { ...f, [field]: val } : f) }))
  
  const tabs = [
    { key: 'general', label: 'عام' },
    { key: 'slider', label: 'سلايدر' },
    { key: 'social', label: 'تواصل' },
    { key: 'customers', label: 'عملاء مميزون' },
    { key: 'faq', label: 'أسئلة شائعة' },
    { key: 'loyalty', label: 'نقاط الولاء' },
    { key: 'festivities', label: 'زينة' },
  ]
  
  if (loading) return <div className="flex items-center justify-center h-64"><div className="spinner" /></div>
  
  return (
    <div className="space-y-6">
      {toast && <div className={`toast-notification ${toast.type === 'error' ? 'border-red-500/30' : ''}`}><span className="text-sm">{toast.msg}</span></div>}
      
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-white flex items-center gap-2"><Settings size={20} className="text-purple-400" />الإعدادات</h1>
        <button onClick={handleSave} disabled={saving} className="btn-primary px-5 py-2.5 text-sm flex items-center gap-2 disabled:opacity-50">
          <Save size={16} />{saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
        </button>
      </div>
      
      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-all ${activeTab === t.key ? 'bg-purple-500/30 border border-purple-500/50 text-purple-300' : 'bg-white/5 border border-white/10 text-gray-400'}`}>{t.label}</button>
        ))}
      </div>
      
      <div className="glass-card p-6">
        
        {/* General */}
        {activeTab === 'general' && (
          <div className="space-y-4">
            <div>
              <label className="text-gray-400 text-xs mb-1.5 block">شعار المتجر</label>
              <div className="flex gap-2">
                <input type="url" value={settings.logo} onChange={e => setSettings(p => ({ ...p, logo: e.target.value }))} className="glass-input text-sm flex-1" placeholder="https://... أو ارفع ملف" dir="ltr" />
                <label className="px-4 py-2 bg-purple-500/20 text-purple-300 rounded-xl text-xs hover:bg-purple-500/30 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap">
                  <Plus size={14} />
                  رفع
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      
                      const formData = new FormData()
                      formData.append('file', file)
                      formData.append('folder', 'logos')
                      
                      try {
                        const res = await fetch('/api/upload', { method: 'POST', body: formData })
                        const data = await res.json()
                        if (data.success) {
                          setSettings(p => ({ ...p, logo: data.url }))
                          showToast('تم رفع الشعار ✅')
                        }
                      } catch (error) {
                        showToast('فشل رفع الشعار', 'error')
                      }
                    }}
                    className="hidden"
                  />
                </label>
              </div>
              {settings.logo && <img src={settings.logo} alt="" className="mt-2 h-16 object-contain" />}
            </div>
          </div>
        )}
        
        {/* Slider */}
        {activeTab === 'slider' && (
          <div className="space-y-4">
            <button onClick={addSlide} className="btn-primary px-4 py-2 text-sm flex items-center gap-2"><Plus size={14} />إضافة صورة</button>
            {(settings.slider || []).map((slide, i) => (
              <div key={i} className="glass p-4 rounded-2xl space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white text-sm font-medium">صورة {i + 1}</span>
                  <button onClick={() => removeSlide(i)} className="text-red-400 hover:text-red-300"><X size={16} /></button>
                </div>
                
                {/* Upload Image Button */}
                <div className="flex gap-2">
                  <input type="url" value={slide.image} onChange={e => updateSlide(i, 'image', e.target.value)} className="glass-input text-sm flex-1" placeholder="رابط الصورة" dir="ltr" />
                  <label className="px-4 py-2 bg-purple-500/20 text-purple-300 rounded-xl text-xs hover:bg-purple-500/30 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap">
                    <Plus size={14} />
                    رفع صورة
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        
                        const formData = new FormData()
                        formData.append('file', file)
                        formData.append('folder', 'slider')
                        
                        try {
                          const res = await fetch('/api/upload', { method: 'POST', body: formData })
                          const data = await res.json()
                          if (data.url) {
                            updateSlide(i, 'image', data.url)
                            showToast('تم رفع الصورة ✅')
                          }
                        } catch (err) {
                          showToast('فشل رفع الصورة ❌', 'error')
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
                
                {slide.image && <img src={slide.image} alt="" className="w-full h-32 object-cover rounded-xl" />}
              </div>
            ))}
          </div>
        )}
        
        {/* Social */}
        {activeTab === 'social' && (
          <div className="space-y-3">
            {[['discord', 'رابط Discord', '🎮'], ['whatsapp', 'رقم WhatsApp', '💬'], ['telegram', 'رابط Telegram', '✈️'], ['youtube', 'رابط YouTube', '▶️'], ['tiktok', 'رابط TikTok', '🎵']].map(([k, l, icon]) => (
              <div key={k}>
                <label className="text-gray-400 text-xs mb-1.5 block">{icon} {l}</label>
                <input type="text" value={settings.socialLinks?.[k] || ''} onChange={e => setSettings(p => ({ ...p, socialLinks: { ...p.socialLinks, [k]: e.target.value } }))} className="glass-input text-sm" dir="ltr" />
              </div>
            ))}
          </div>
        )}
        
        {/* Featured Customers */}
        {activeTab === 'customers' && (
          <div className="space-y-4">
            <button onClick={addCustomer} className="btn-primary px-4 py-2 text-sm flex items-center gap-2"><Plus size={14} />إضافة عميل</button>
            {(settings.featuredCustomers || []).map((c, i) => (
              <div key={i} className="glass p-4 rounded-2xl space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {c.image && <img src={c.image} alt="" className="w-8 h-8 rounded-full object-cover" />}
                    <span className="text-white text-sm">{c.name || `عميل ${i + 1}`}</span>
                  </div>
                  <button onClick={() => removeCustomer(i)} className="text-red-400"><X size={16} /></button>
                </div>
                <input type="text" value={c.name} onChange={e => updateCustomer(i, 'name', e.target.value)} className="glass-input text-sm" placeholder="اسم العميل" />
                <div className="flex gap-2">
                  <input type="url" value={c.image} onChange={e => updateCustomer(i, 'image', e.target.value)} className="glass-input text-sm flex-1" placeholder="رابط الصورة أو ارفع" dir="ltr" />
                  <label className="px-4 py-2 bg-purple-500/20 text-purple-300 rounded-xl text-xs hover:bg-purple-500/30 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap">
                    <Plus size={14} />
                    رفع
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        
                        const formData = new FormData()
                        formData.append('file', file)
                        formData.append('folder', 'customers')
                        
                        try {
                          const res = await fetch('/api/upload', { method: 'POST', body: formData })
                          const data = await res.json()
                          if (data.success) {
                            updateCustomer(i, 'image', data.url)
                            showToast('تم رفع الصورة ✅')
                          }
                        } catch (error) {
                          showToast('فشل رفع الصورة', 'error')
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
                <input type="url" value={c.link} onChange={e => updateCustomer(i, 'link', e.target.value)} className="glass-input text-sm" placeholder="رابط الصفحة" dir="ltr" />
              </div>
            ))}
          </div>
        )}
        
        {/* FAQ */}
        {activeTab === 'faq' && (
          <div className="space-y-4">
            <button onClick={addFaq} className="btn-primary px-4 py-2 text-sm flex items-center gap-2"><Plus size={14} />إضافة سؤال</button>
            {(settings.faq || []).map((f, i) => (
              <div key={i} className="glass p-4 rounded-2xl space-y-2">
                <div className="flex justify-between mb-2">
                  <span className="text-white text-sm">سؤال {i + 1}</span>
                  <button onClick={() => removeFaq(i)} className="text-red-400"><X size={16} /></button>
                </div>
                <input type="text" value={f.question} onChange={e => updateFaq(i, 'question', e.target.value)} className="glass-input text-sm" placeholder="السؤال" />
                <textarea value={f.answer} onChange={e => updateFaq(i, 'answer', e.target.value)} className="glass-input text-sm resize-none" rows={3} placeholder="الإجابة" />
              </div>
            ))}
          </div>
        )}
        
        {/* Loyalty */}
        {activeTab === 'loyalty' && (
          <div className="space-y-4">
            <div>
              <label className="text-gray-400 text-xs mb-1.5 block">عدد النقاط لكل دولار يُنفق</label>
              <input type="number" value={settings.loyaltyConfig?.pointsPerDollar || 1} onChange={e => setSettings(p => ({ ...p, loyaltyConfig: { ...p.loyaltyConfig, pointsPerDollar: parseFloat(e.target.value) } }))} className="glass-input text-sm" dir="ltr" />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1.5 block">قيمة الدولار لكل نقطة (0.01 = سنت واحد)</label>
              <input type="number" step="0.001" value={settings.loyaltyConfig?.dollarPerPoint || 0.01} onChange={e => setSettings(p => ({ ...p, loyaltyConfig: { ...p.loyaltyConfig, dollarPerPoint: parseFloat(e.target.value) } }))} className="glass-input text-sm" dir="ltr" />
            </div>
            <div className="glass p-3 rounded-xl text-sm text-gray-400">
              مثال: شراء بمبلغ 50$ = {Math.floor(50 * (settings.loyaltyConfig?.pointsPerDollar || 1))} نقطة
            </div>
          </div>
        )}
        
        {/* Festivities */}
        {activeTab === 'festivities' && (
          <div className="space-y-3">
            {[['ramadan', 'رمضان 🎮', 'فوانيس ونجوم وهلال'], ['eid_fitr', 'عيد الفطر 🎉', 'نجوم وحلوى'], ['eid_adha', 'عيد الأضحى 🐑', 'نجوم وخرفان']].map(([k, l, desc]) => (
              <div key={k} className="flex items-center justify-between p-4 glass rounded-2xl">
                <div>
                  <p className="text-white font-medium">{l}</p>
                  <p className="text-gray-400 text-xs">{desc}</p>
                </div>
                <button
                  onClick={() => setSettings(p => ({ ...p, festivities: { ...p.festivities, [k]: !p.festivities?.[k] } }))}
                  className={`w-12 h-6 rounded-full transition-all relative ${settings.festivities?.[k] ? 'bg-gradient-to-r from-emerald-500 to-cyan-400' : 'bg-gray-600'}`}
                >
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${settings.festivities?.[k] ? 'right-1' : 'left-1'}`} />
                </button>
              </div>
            ))}
          </div>
        )}
        
      </div>
      
      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="btn-primary px-8 py-3 flex items-center gap-2">
          <Save size={18} />{saving ? 'جاري...' : 'حفظ جميع الإعدادات'}
        </button>
      </div>
    </div>
  )
}
