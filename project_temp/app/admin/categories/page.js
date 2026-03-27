'use client'
import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Check, X, Tag, ArrowUp, ArrowDown } from 'lucide-react'

export default function AdminCategories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editCat, setEditCat] = useState(null)
  const [form, setForm] = useState({ name: '', order: 0 })
  const [toast, setToast] = useState(null)
  const [saving, setSaving] = useState(false)
  
  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }
  
  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(d => setCategories(Array.isArray(d) ? d : [])).finally(() => setLoading(false))
  }, [])
  
  const handleSubmit = async () => {
    if (!form.name) return
    setSaving(true)
    const url = editCat ? `/api/categories/${editCat.id}` : '/api/categories'
    const method = editCat ? 'PUT' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    if (res.ok) {
      const data = await res.json()
      showToast(editCat ? 'تم التحديث' : 'تمت الإضافة')
      if (editCat) setCategories(prev => prev.map(c => c.id === editCat.id ? { ...c, ...form } : c).sort((a,b) => a.order - b.order))
      else { const newList = [...categories, data].sort((a,b) => a.order - b.order); setCategories(newList) }
      setShowForm(false); setForm({ name: '', order: 0 }); setEditCat(null)
    }
    setSaving(false)
  }
  
  const handleDelete = async (id) => {
    if (!confirm('هل أنت متأكد؟')) return
    await fetch(`/api/categories/${id}`, { method: 'DELETE' })
    setCategories(prev => prev.filter(c => c.id !== id))
    showToast('تم الحذف')
  }
  
  if (loading) return <div className="flex items-center justify-center h-64"><div className="spinner" /></div>
  
  return (
    <div className="space-y-6">
      {toast && <div className={`toast-notification ${toast.type === 'error' ? 'border-red-500/30' : ''}`}><span className="text-sm">{toast.msg}</span></div>}
      
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-white flex items-center gap-2">
          <Tag size={20} className="text-purple-400" />
          التصنيفات ({categories.length})
        </h1>
        <button onClick={() => { setShowForm(true); setEditCat(null); setForm({ name: '', order: categories.length + 1 }) }} className="btn-primary px-5 py-2.5 text-sm flex items-center gap-2">
          <Plus size={16} />إضافة قسم
        </button>
      </div>
      
      <div className="space-y-3">
        {categories.length === 0 ? (
          <div className="text-center py-16 text-gray-400">لا توجد تصنيفات حتى الآن</div>
        ) : (
          categories.map(cat => (
            <div key={cat.id} className="glass-card p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-purple-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">{cat.order || 0}</span>
              </div>
              <p className="text-white font-semibold flex-1">{cat.name}</p>
              <button
                onClick={async () => {
                  const newStatus = cat.status === 'active' ? 'inactive' : 'active'
                  const res = await fetch(`/api/categories/${cat.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: newStatus })
                  })
                  if (res.ok) {
                    setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, status: newStatus } : c))
                    showToast(`تم ${newStatus === 'active' ? 'تفعيل' : 'تعطيل'} القسم`)
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  cat.status === 'active' 
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                    : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                }`}
              >
                {cat.status === 'active' ? '✓ نشط' : '✕ معطل'}
              </button>
              <div className="flex gap-2">
                <button onClick={() => { setEditCat(cat); setForm({ name: cat.name, order: cat.order || 0 }); setShowForm(true) }} className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/20">
                  <Edit size={14} />
                </button>
                <button onClick={() => handleDelete(cat.id)} className="p-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/20">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm glass-strong rounded-3xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-black text-white">{editCat ? 'تعديل قسم' : 'إضافة قسم جديد'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">اسم القسم *</label>
                <input type="text" value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} className="glass-input text-sm" placeholder="اسم القسم" />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">ترتيب الظهور</label>
                <input type="number" value={form.order} onChange={e => setForm(prev => ({ ...prev, order: parseInt(e.target.value) || 0 }))} className="glass-input text-sm" dir="ltr" />
              </div>
              <div className="flex gap-3">
                <button onClick={handleSubmit} disabled={saving} className="btn-primary flex-1 py-3 text-sm">{saving ? '...' : 'حفظ'}</button>
                <button onClick={() => setShowForm(false)} className="px-5 py-3 rounded-full border border-white/10 text-gray-400 text-sm">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
