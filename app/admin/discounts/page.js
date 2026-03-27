'use client'
import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit, Check, X, Percent, Copy } from 'lucide-react'

export default function AdminDiscounts() {
  const [codes, setCodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editCode, setEditCode] = useState(null)
  const [toast, setToast] = useState(null)
  const [saving, setSaving] = useState(false)
  
  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }
  
  const emptyForm = {
    name: '', code: '', type: 'percentage', value: '', startDate: '', endDate: '',
    userId: '', usageLimit: '', minAmount: '', maxAmount: '',
    status: 'active', isPartner: false, partnerPoints: '',
  }
  const [form, setForm] = useState(emptyForm)
  
  useEffect(() => {
    fetch('/api/discounts').then(r => r.json()).then(d => setCodes(Array.isArray(d) ? d : [])).finally(() => setLoading(false))
  }, [])
  
  const handleSubmit = async () => {
    if (!form.code || !form.value) { showToast('أدخل الكود والقيمة', 'error'); return }
    setSaving(true)
    
    const url = editCode ? `/api/discounts/${editCode.id}` : '/api/discounts'
    const method = editCode ? 'PUT' : 'POST'
    
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, value: parseFloat(form.value), usageLimit: form.usageLimit ? parseInt(form.usageLimit) : null, minAmount: form.minAmount ? parseFloat(form.minAmount) : null, maxAmount: form.maxAmount ? parseFloat(form.maxAmount) : null, partnerPoints: form.partnerPoints ? parseInt(form.partnerPoints) : 0 }),
    })
    if (res.ok) {
      if (editCode) {
        setCodes(prev => prev.map(c => c.id === editCode.id ? { ...c, ...form } : c))
        showToast('تم التحديث بنجاح')
      } else {
        const data = await res.json()
        setCodes(prev => [data, ...prev])
        showToast('تم إنشاء الكود')
      }
      setShowForm(false); setForm(emptyForm); setEditCode(null)
    }
    setSaving(false)
  }
  
  const handleToggle = async (code) => {
    const newStatus = code.status === 'active' ? 'inactive' : 'active'
    await fetch(`/api/discounts/${code.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) })
    setCodes(prev => prev.map(c => c.id === code.id ? { ...c, status: newStatus } : c))
  }
  
  const handleDelete = async (id) => {
    if (!confirm('حذف؟')) return
    await fetch(`/api/discounts/${id}`, { method: 'DELETE' })
    setCodes(prev => prev.filter(c => c.id !== id))
  }
  
  const openEdit = (code) => {
    setEditCode(code)
    setForm({
      name: code.name || '',
      code: code.code || '',
      type: code.type || 'percentage',
      value: code.value || '',
      startDate: code.startDate ? new Date(code.startDate).toISOString().split('T')[0] : '',
      endDate: code.endDate ? new Date(code.endDate).toISOString().split('T')[0] : '',
      userId: code.userId || '',
      usageLimit: code.usageLimit || '',
      minAmount: code.minAmount || '',
      maxAmount: code.maxAmount || '',
      status: code.status || 'active',
      isPartner: code.isPartner || false,
      partnerPoints: code.partnerPoints || '',
    })
    setShowForm(true)
  }
  
  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  }
  
  if (loading) return <div className="flex items-center justify-center h-64"><div className="spinner" /></div>
  
  return (
    <div className="space-y-6">
      {toast && <div className={`toast-notification ${toast.type === 'error' ? 'border-red-500/30' : ''}`}><span className="text-sm">{toast.msg}</span></div>}
      
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-white flex items-center gap-2"><Percent size={20} className="text-purple-400" />أكواد الخصم ({codes.length})</h1>
        <button onClick={() => { setShowForm(true); setForm(emptyForm) }} className="btn-primary px-5 py-2.5 text-sm flex items-center gap-2">
          <Plus size={16} />إضافة كود
        </button>
      </div>
      
      <div className="space-y-3">
        {codes.length === 0 ? <div className="text-center py-16 text-gray-400">لا توجد أكواد</div> :
          codes.map(code => (
            <div key={code.id} className={`glass-card p-4 ${code.status !== 'active' ? 'opacity-50' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="glass px-3 py-1.5 rounded-xl">
                    <span className="text-purple-300 font-mono font-bold" dir="ltr">{code.code}</span>
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{code.name}</p>
                    <p className="text-gray-400 text-xs">
                      {code.type === 'percentage' ? `خصم ${code.value}%` : `خصم $${code.value}`}
                      {code.usageLimit && ` • ${code.usageCount || 0}/${code.usageLimit} استخدام`}
                      {code.isPartner && ' • شريك'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { navigator.clipboard.writeText(code.code); showToast('تم النسخ') }} className="p-2 rounded-xl bg-white/5 text-gray-400 hover:text-white"><Copy size={13} /></button>
                  <button onClick={() => openEdit(code)} className="p-2 rounded-xl bg-blue-500/20 border border-blue-500/20 text-blue-400 hover:bg-blue-500/30"><Edit size={13} /></button>
                  <button onClick={() => handleToggle(code)} className={`p-2 rounded-xl border ${code.status === 'active' ? 'bg-green-500/20 border-green-500/20 text-green-400' : 'bg-gray-500/20 border-gray-500/20 text-gray-400'}`}>
                    {code.status === 'active' ? <Check size={13} /> : <X size={13} />}
                  </button>
                  <button onClick={() => handleDelete(code.id)} className="p-2 rounded-xl bg-red-500/20 border border-red-500/20 text-red-400"><Trash2 size={13} /></button>
                </div>
              </div>
            </div>
          ))
        }
      </div>
      
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 overflow-y-auto py-8 px-4">
          <div className="max-w-lg mx-auto glass-strong rounded-3xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-black text-white">{editCode ? 'تعديل كود الخصم' : 'إضافة كود خصم'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            
            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">اسم الكود</label>
                <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="glass-input text-sm" placeholder="اسم وصفي" />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">الكود *</label>
                <div className="flex gap-2">
                  <input type="text" value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} className="glass-input text-sm flex-1 uppercase" placeholder="SUMMER20" dir="ltr" />
                  <button onClick={() => setForm(p => ({ ...p, code: generateCode() }))} className="px-3 py-2 glass rounded-xl text-xs text-purple-400 whitespace-nowrap">تلقائي</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 text-xs mb-1.5 block">نوع الخصم</label>
                  <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} className="glass-input text-sm">
                    <option value="percentage">نسبة %</option>
                    <option value="fixed">مبلغ ثابت</option>
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1.5 block">القيمة *</label>
                  <input type="number" value={form.value} onChange={e => setForm(p => ({ ...p, value: e.target.value }))} className="glass-input text-sm" placeholder={form.type === 'percentage' ? '20' : '5'} dir="ltr" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 text-xs mb-1.5 block">تاريخ البدء</label>
                  <input type="date" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} className="glass-input text-sm" dir="ltr" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1.5 block">تاريخ الانتهاء</label>
                  <input type="date" value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} className="glass-input text-sm" dir="ltr" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 text-xs mb-1.5 block">حد الاستخدام</label>
                  <input type="number" value={form.usageLimit} onChange={e => setForm(p => ({ ...p, usageLimit: e.target.value }))} className="glass-input text-sm" placeholder="غير محدود" dir="ltr" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1.5 block">مخصص لايميل (اختياري)</label>
                  <input type="email" value={form.userId} onChange={e => setForm(p => ({ ...p, userId: e.target.value }))} className="glass-input text-sm" placeholder="user@email.com" dir="ltr" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 text-xs mb-1.5 block">حد أدنى ($)</label>
                  <input type="number" value={form.minAmount} onChange={e => setForm(p => ({ ...p, minAmount: e.target.value }))} className="glass-input text-sm" dir="ltr" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1.5 block">حد أقصى ($)</label>
                  <input type="number" value={form.maxAmount} onChange={e => setForm(p => ({ ...p, maxAmount: e.target.value }))} className="glass-input text-sm" dir="ltr" />
                </div>
              </div>
              
              {/* Partner */}
              <div className="p-3 glass rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-300 text-sm">كود شريك</span>
                  <button onClick={() => setForm(p => ({ ...p, isPartner: !p.isPartner }))} className={`w-10 h-5 rounded-full transition-all relative ${form.isPartner ? 'bg-purple-500' : 'bg-gray-600'}`}>
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${form.isPartner ? 'right-0.5' : 'left-0.5'}`} />
                  </button>
                </div>
                {form.isPartner && (
                  <input type="number" value={form.partnerPoints} onChange={e => setForm(p => ({ ...p, partnerPoints: e.target.value }))} className="glass-input text-sm" placeholder="عدد نقاط للشريك" dir="ltr" />
                )}
              </div>
              
              <div className="flex gap-3">
                <button onClick={handleSubmit} disabled={saving} className="btn-primary flex-1 py-3 text-sm">{saving ? '...' : (editCode ? 'حفظ التغييرات' : 'إنشاء الكود')}</button>
                <button onClick={() => setShowForm(false)} className="px-5 py-3 rounded-full border border-white/10 text-gray-400 text-sm">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
