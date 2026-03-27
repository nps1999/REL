'use client'
import { useState, useEffect } from 'react'
import {
  Plus, Edit, Trash2, Eye, EyeOff, Star, X, Check, Image,
  Upload, Package, Search
} from 'lucide-react'

export default function AdminProducts() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editProduct, setEditProduct] = useState(null)
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState(null)
  
  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }
  
  const emptyForm = {
    title: '',
    slug: '',
    image: '',
    categories: [],
    price: '',
    discount: '',
    description: '',
    fulfillmentMode: 'stock',
    fileUrl: '',
    status: 'active',
    featured: false,
  }
  
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [codeState, setCodeState] = useState({ codes: [], summary: { available: 0, reserved: 0, sold: 0 } })
  const [codesText, setCodesText] = useState('')
  const [codesLoading, setCodesLoading] = useState(false)
  const [addingCodes, setAddingCodes] = useState(false)
  
  useEffect(() => {
    Promise.all([
      fetch('/api/products?limit=200').then(r => r.json()),
      fetch('/api/categories').then(r => r.json()),
    ]).then(([productsData, catsData]) => {
      setProducts(productsData?.products || [])
      setCategories(Array.isArray(catsData) ? catsData : [])
    }).finally(() => setLoading(false))
  }, [])
  
  const openAdd = () => {
    setForm(emptyForm)
    setEditProduct(null)
    setCodeState({ codes: [], summary: { available: 0, reserved: 0, sold: 0 } })
    setCodesText('')
    setShowForm(true)
  }
  
  const openEdit = (product) => {
    setForm({
      ...emptyForm,
      ...product,
    })
    setEditProduct(product)
    loadProductCodes(product.id)
    setShowForm(true)
  }

  const loadProductCodes = async (productId) => {
    if (!productId) return
    setCodesLoading(true)
    try {
      const res = await fetch(`/api/products/${productId}/codes`)
      const data = await res.json()
      setCodeState({
        codes: Array.isArray(data.codes) ? data.codes : [],
        summary: data.summary || { available: 0, reserved: 0, sold: 0 },
      })
    } catch {
      setCodeState({ codes: [], summary: { available: 0, reserved: 0, sold: 0 } })
    } finally {
      setCodesLoading(false)
    }
  }

  const handleAddCodes = async () => {
    if (!editProduct?.id || !codesText.trim()) return
    setAddingCodes(true)
    try {
      const res = await fetch(`/api/products/${editProduct.id}/codes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codesText }),
      })
      const data = await res.json()
      if (!res.ok) {
        showToast(data.error || 'فشل إضافة الأكواد', 'error')
        return
      }
      setCodesText('')
      showToast(`تمت إضافة ${data.inserted || 0} كود`)
      await loadProductCodes(editProduct.id)
    } catch {
      showToast('فشل إضافة الأكواد', 'error')
    } finally {
      setAddingCodes(false)
    }
  }

  const handleCodeStatusChange = async (codeId, status) => {
    if (!editProduct?.id || !codeId) return
    const res = await fetch(`/api/products/${editProduct.id}/codes/${codeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    const data = await res.json()
    if (!res.ok) {
      showToast(data.error || 'فشل تحديث الكود', 'error')
      return
    }
    await loadProductCodes(editProduct.id)
  }

  const handleDeleteCode = async (codeId) => {
    if (!editProduct?.id || !codeId) return
    if (!confirm('هل تريد حذف هذا الكود؟')) return
    const res = await fetch(`/api/products/${editProduct.id}/codes/${codeId}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) {
      showToast(data.error || 'فشل حذف الكود', 'error')
      return
    }
    await loadProductCodes(editProduct.id)
  }
  
  const handleSubmit = async () => {
    if (!form.title || !form.price) {
      showToast('يرجى إدخال العنوان والسعر', 'error')
      return
    }
    
    setSaving(true)
    try {
      const url = editProduct ? `/api/products/${editProduct.id}` : '/api/products'
      const method = editProduct ? 'PUT' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          price: parseFloat(form.price),
          discount: form.discount ? parseFloat(form.discount) : null,
          slug: form.slug || form.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        }),
      })
      
      if (res.ok) {
        const data = await res.json()
        showToast(editProduct ? 'تم التحديث بنجاح' : 'تم الإضافة بنجاح')
        if (editProduct) {
          setProducts(prev => prev.map(p => p.id === editProduct.id ? { ...p, ...form, ...data } : p))
        } else {
          setProducts(prev => [data, ...prev])
        }
        setShowForm(false)
      } else {
        showToast('حدث خطأ', 'error')
      }
    } catch (e) {
      showToast('خطأ: ' + e.message, 'error')
    } finally {
      setSaving(false)
    }
  }
  
  const handleDelete = async (productId) => {
    if (!confirm('هل أنت متأكد من الحذف؟')) return
    await fetch(`/api/products/${productId}`, { method: 'DELETE' })
    setProducts(prev => prev.filter(p => p.id !== productId))
    showToast('تم الحذف')
  }
  
  const handleToggleStatus = async (product) => {
    const newStatus = product.status === 'active' ? 'inactive' : 'active'
    await fetch(`/api/products/${product.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, status: newStatus } : p))
  }
  
  const handleToggleFeatured = async (product) => {
    const newFeatured = !product.featured
    await fetch(`/api/products/${product.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ featured: newFeatured }),
    })
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, featured: newFeatured } : p))
  }
  
  const filteredProducts = products.filter(p => 
    p.title?.toLowerCase().includes(search.toLowerCase())
  )
  
  if (loading) return <div className="flex items-center justify-center h-64"><div className="spinner" /></div>
  
  return (
    <div className="space-y-6">
      {toast && (
        <div className={`toast-notification ${toast.type === 'error' ? 'border-red-500/30' : ''}`}>
          {toast.type === 'success' ? <Check size={16} className="text-green-400" /> : <X size={16} className="text-red-400" />}
          <span className="text-sm">{toast.msg}</span>
        </div>
      )}
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-white flex items-center gap-2">
          <Package size={20} className="text-purple-400" />
          المنتجات ({products.length})
        </h1>
        <button onClick={openAdd} className="btn-primary px-5 py-2.5 text-sm flex items-center gap-2">
          <Plus size={16} />
          إضافة منتج
        </button>
      </div>
      
      {/* Search */}
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="البحث عن منتج..."
          className="glass-input pl-10 pr-4 text-sm"
        />
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      </div>
      
      {/* Products List */}
      <div className="space-y-3">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 text-gray-400">لا توجد منتجات</div>
        ) : (
          filteredProducts.map(product => (
            <div key={product.id} className="glass-card p-4 flex items-center gap-4">
              {/* Image */}
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-[#111827] flex-shrink-0">
                {product.image ? (
                  <img src={product.image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Image size={20} className="text-gray-600" />
                  </div>
                )}
              </div>
              
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm truncate">{product.title}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-green-400 text-sm font-bold">
                    ${product.discount 
                      ? (product.price * (1 - product.discount / 100)).toFixed(2)
                      : product.price?.toFixed(2)
                    }
                  </span>
                  {product.discount && (
                    <span className="text-gray-500 text-xs line-through">${product.price?.toFixed(2)}</span>
                  )}
                  {product.categories?.length > 0 && (
                    <span className="text-purple-400 text-xs">{product.categories.length} قسم</span>
                  )}
                  <span className={`text-xs ${(product.fulfillmentMode || 'manual') === 'stock' ? 'text-emerald-300' : 'text-orange-300'}`}>
                    {(product.fulfillmentMode || 'manual') === 'stock' ? 'مخزون أكواد' : 'تسليم يدوي'}
                  </span>
                  {product.orderCount > 0 && (
                    <span className="text-gray-400 text-xs">{product.orderCount} طلب</span>
                  )}
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Featured */}
                <button
                  onClick={() => handleToggleFeatured(product)}
                  className={`p-2 rounded-xl transition-all ${
                    product.featured 
                      ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' 
                      : 'bg-white/5 text-gray-500 hover:text-yellow-400'
                  }`}
                  title="مميز"
                >
                  <Star size={15} className={product.featured ? 'fill-current' : ''} />
                </button>
                
                {/* Toggle status */}
                <button
                  onClick={() => handleToggleStatus(product)}
                  className={`p-2 rounded-xl transition-all ${
                    product.status === 'active' 
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                      : 'bg-gray-500/20 text-gray-500'
                  }`}
                  title={product.status === 'active' ? 'تفعيل' : 'إيقاف'}
                >
                  {product.status === 'active' ? <Eye size={15} /> : <EyeOff size={15} />}
                </button>
                
                {/* Edit */}
                <button
                  onClick={() => openEdit(product)}
                  className="p-2 rounded-xl bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-all border border-blue-500/20"
                >
                  <Edit size={15} />
                </button>
                
                {/* Delete */}
                <button
                  onClick={() => handleDelete(product.id)}
                  className="p-2 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all border border-red-500/20"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto py-8 px-4">
          <div className="w-full max-w-2xl glass-strong rounded-3xl p-6 relative my-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-white">
                {editProduct ? 'تعديل المنتج' : 'إضافة منتج جديد'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white p-2 hover:bg-white/5 rounded-full">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4 max-h-[75vh] overflow-y-auto pl-1">
              
              {/* Title */}
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">عنوان المنتج *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(prev => ({
                    ...prev,
                    title: e.target.value,
                    slug: prev.slug || e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
                  }))}
                  className="glass-input text-sm"
                  placeholder="اسم المنتج"
                />
              </div>
              
              {/* Slug */}
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">رابط المنتج (Slug)</label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={e => setForm(prev => ({ ...prev, slug: e.target.value }))}
                  className="glass-input text-sm"
                  placeholder="product-name-url"
                  dir="ltr"
                />
              </div>
              
              {/* Image */}
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block flex items-center gap-1">
                  <Image size={12} /> صورة المنتج
                </label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={form.image}
                      onChange={e => setForm(prev => ({ ...prev, image: e.target.value }))}
                      className="glass-input text-sm flex-1"
                      placeholder="https://... أو ارفع ملف"
                      dir="ltr"
                    />
                    <label className="px-4 py-2 bg-purple-500/20 text-purple-300 rounded-xl text-xs hover:bg-purple-500/30 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap">
                      <Upload size={14} />
                      رفع
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          
                          const formData = new FormData()
                          formData.append('file', file)
                          formData.append('folder', 'products')
                          
                          try {
                            const res = await fetch('/api/upload', { method: 'POST', body: formData })
                            const data = await res.json()
                            if (data.success) {
                              setForm(prev => ({ ...prev, image: data.url }))
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
                  {form.image && (
                    <img src={form.image} alt="" className="w-full max-h-32 object-cover rounded-xl" />
                  )}
                </div>
              </div>
              
              {/* Categories */}
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">الأقسام</label>
                <div className="flex flex-wrap gap-2">
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        const isSelected = form.categories?.includes(cat.id)
                        setForm(prev => ({
                          ...prev,
                          categories: isSelected
                            ? (prev.categories || []).filter(id => id !== cat.id)
                            : [...(prev.categories || []), cat.id],
                        }))
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs transition-all border ${
                        form.categories?.includes(cat.id)
                          ? 'bg-purple-500/30 border-purple-500/50 text-purple-300'
                          : 'bg-white/5 border-white/10 text-gray-400 hover:border-purple-400/30'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                  {categories.length === 0 && (
                    <p className="text-gray-500 text-xs">أضف أقساماً من قسم التصنيفات أولاً</p>
                  )}
                </div>
              </div>
              
              {/* Price */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 text-xs mb-1.5 block">السعر ($) *</label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={e => setForm(prev => ({ ...prev, price: e.target.value }))}
                    className="glass-input text-sm"
                    placeholder="9.99"
                    min="0"
                    step="0.01"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1.5 block">نسبة الخصم (%) - اختياري</label>
                  <input
                    type="number"
                    value={form.discount}
                    onChange={e => setForm(prev => ({ ...prev, discount: e.target.value }))}
                    className="glass-input text-sm"
                    placeholder="20"
                    min="0"
                    max="100"
                    dir="ltr"
                  />
                </div>
              </div>
              
              {/* Description */}
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">وصف المنتج</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                  className="glass-input text-sm resize-none"
                  rows={4}
                  placeholder="وصف تفصيلي للمنتج... (يدعم HTML)"
                />
              </div>
              
              {/* Fulfillment mode */}
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block">نوع التسليم</label>
                <select
                  value={form.fulfillmentMode || 'stock'}
                  onChange={e => setForm(prev => ({ ...prev, fulfillmentMode: e.target.value }))}
                  className="glass-input text-sm"
                >
                  <option value="stock">مخزّن (أكواد جاهزة)</option>
                  <option value="manual">تسليم يدوي</option>
                </select>
                <p className="text-gray-500 text-xs mt-1">
                  المنتجات المخزنة تستخدم أكواد المخزون. التسليم اليدوي يتم من لوحة الطلبات.
                </p>
              </div>
              
              {/* File URL */}
              <div>
                <label className="text-gray-400 text-xs mb-1.5 block flex items-center gap-1">
                  <Upload size={12} /> رابط ملف يدوي/قديم (اختياري)
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={form.fileUrl}
                    onChange={e => setForm(prev => ({ ...prev, fileUrl: e.target.value }))}
                    className="glass-input text-sm flex-1"
                    placeholder="https://drive.google.com/... أو ارفع ملف"
                    dir="ltr"
                  />
                  <label className="px-4 py-2 bg-purple-500/20 text-purple-300 rounded-xl text-xs hover:bg-purple-500/30 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap">
                    <Upload size={14} />
                    رفع
                    <input
                      type="file"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        
                        const formData = new FormData()
                        formData.append('file', file)
                        formData.append('folder', 'products/files')
                        
                        try {
                          const res = await fetch('/api/upload', { method: 'POST', body: formData })
                          const data = await res.json()
                          if (data.success) {
                            setForm(prev => ({ ...prev, fileUrl: data.url }))
                            showToast('تم رفع الملف ✅')
                          }
                        } catch (error) {
                          showToast('فشل رفع الملف', 'error')
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="text-gray-500 text-xs mt-1">للمنتجات اليدوية أو للتوافق مع المنتجات القديمة فقط</p>
              </div>

              {editProduct && (form.fulfillmentMode || 'stock') === 'stock' && (
                <div className="glass p-4 rounded-2xl space-y-3 border border-emerald-500/20">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-emerald-300">إدارة أكواد المخزون</h3>
                    <div className="text-[11px] text-gray-400 flex items-center gap-2">
                      <span>متاح: {codeState.summary?.available || 0}</span>
                      <span>محجوز: {codeState.summary?.reserved || 0}</span>
                      <span>مباع: {codeState.summary?.sold || 0}</span>
                    </div>
                  </div>

                  <textarea
                    value={codesText}
                    onChange={e => setCodesText(e.target.value)}
                    className="glass-input text-xs resize-none"
                    rows={4}
                    placeholder={'أدخل كوداً في كل سطر\nABCD-1234-EFGH\nZXCV-9876-QWER'}
                    dir="ltr"
                  />
                  <button
                    onClick={handleAddCodes}
                    disabled={addingCodes || !codesText.trim()}
                    className="btn-primary px-4 py-2 text-xs disabled:opacity-50"
                  >
                    {addingCodes ? 'جاري الإضافة...' : 'إضافة أكواد للمخزون'}
                  </button>

                  <div className="max-h-52 overflow-y-auto space-y-2">
                    {codesLoading ? (
                      <p className="text-xs text-gray-500">جاري تحميل الأكواد...</p>
                    ) : codeState.codes.length === 0 ? (
                      <p className="text-xs text-gray-500">لا توجد أكواد مخزنة بعد.</p>
                    ) : (
                      codeState.codes.slice(0, 120).map(codeItem => (
                        <div key={codeItem.id} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5">
                          <span className="text-xs font-mono text-gray-200 flex-1 truncate" dir="ltr">{codeItem.code}</span>
                          <select
                            value={codeItem.status || 'available'}
                            onChange={e => handleCodeStatusChange(codeItem.id, e.target.value)}
                            className="bg-transparent text-[11px] border border-white/15 rounded px-1.5 py-1"
                          >
                            <option value="available">available</option>
                            <option value="reserved">reserved</option>
                            <option value="sold">sold</option>
                          </select>
                          <button
                            onClick={() => handleDeleteCode(codeItem.id)}
                            className="text-red-400 hover:text-red-300"
                            title="حذف الكود"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
              {/* Status and Featured */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 text-xs mb-1.5 block">حالة المنتج</label>
                  <select
                    value={form.status}
                    onChange={e => setForm(prev => ({ ...prev, status: e.target.value }))}
                    className="glass-input text-sm"
                  >
                    <option value="active">نشط</option>
                    <option value="inactive">غير نشط</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => setForm(prev => ({ ...prev, featured: !prev.featured }))}
                    className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all border flex items-center justify-center gap-2 ${
                      form.featured
                        ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400'
                        : 'bg-white/5 border-white/10 text-gray-400'
                    }`}
                  >
                    <Star size={15} className={form.featured ? 'fill-current' : ''} />
                    {form.featured ? 'مميز ✓' : 'تمييز المنتج'}
                  </button>
                </div>
              </div>
              
              {/* Save */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="btn-primary flex-1 py-3 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? 'جاري الحفظ...' : (editProduct ? 'حفظ التغييرات' : 'إضافة المنتج')}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="px-6 py-3 rounded-full border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-all text-sm"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
