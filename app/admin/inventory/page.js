'use client'
import { useEffect, useMemo, useState } from 'react'
import { KeyRound, Plus, Trash2 } from 'lucide-react'

export default function AdminInventoryPage() {
  const [products, setProducts] = useState([])
  const [selectedProductId, setSelectedProductId] = useState('')
  const [codesText, setCodesText] = useState('')
  const [codesData, setCodesData] = useState({ codes: [], summary: { available: 0, reserved: 0, sold: 0 } })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/products?limit=300')
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data?.products) ? data.products : []
        setProducts(list)
        if (list.length > 0) setSelectedProductId(list[0].id)
      })
      .finally(() => setLoading(false))
  }, [])

  const selectedProduct = useMemo(
    () => products.find(p => p.id === selectedProductId),
    [products, selectedProductId]
  )

  const loadCodes = async (productId) => {
    if (!productId) return
    const res = await fetch(`/api/products/${productId}/codes`)
    const data = await res.json()
    setCodesData({
      codes: Array.isArray(data?.codes) ? data.codes : [],
      summary: data?.summary || { available: 0, reserved: 0, sold: 0 },
    })
  }

  useEffect(() => {
    if (!selectedProductId) return
    loadCodes(selectedProductId)
  }, [selectedProductId])

  const addCodes = async () => {
    if (!selectedProductId || !codesText.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/products/${selectedProductId}/codes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codesText }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'فشل إضافة الأكواد')
      setCodesText('')
      await loadCodes(selectedProductId)
    } catch (e) {
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }

  const updateStatus = async (codeId, status) => {
    const res = await fetch(`/api/products/${selectedProductId}/codes/${codeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    const data = await res.json()
    if (!res.ok) return alert(data.error || 'فشل تحديث الكود')
    await loadCodes(selectedProductId)
  }

  const removeCode = async (codeId) => {
    if (!confirm('حذف هذا الكود؟')) return
    const res = await fetch(`/api/products/${selectedProductId}/codes/${codeId}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) return alert(data.error || 'فشل حذف الكود')
    await loadCodes(selectedProductId)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-60"><div className="spinner" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <KeyRound size={20} className="text-emerald-300" />
        <h1 className="text-xl font-black text-white">إدارة مخزون الأكواد</h1>
      </div>

      <div className="glass-card p-4 space-y-4">
        <div>
          <label className="text-xs text-gray-400 mb-1 block">اختر المنتج</label>
          <select
            value={selectedProductId}
            onChange={e => setSelectedProductId(e.target.value)}
            className="glass-input text-sm"
          >
            {products.map(product => (
              <option key={product.id} value={product.id}>
                {product.title} ({product.fulfillmentMode === 'stock' ? 'Stock' : 'Manual'})
              </option>
            ))}
          </select>
        </div>

        {selectedProduct && (
          <div className="text-xs text-gray-400 flex flex-wrap gap-3">
            <span>متاح: {codesData.summary.available || 0}</span>
            <span>محجوز: {codesData.summary.reserved || 0}</span>
            <span>مباع: {codesData.summary.sold || 0}</span>
          </div>
        )}

        <div className="space-y-2">
          <textarea
            value={codesText}
            onChange={e => setCodesText(e.target.value)}
            rows={5}
            className="glass-input text-xs resize-none"
            dir="ltr"
            placeholder={'أدخل كوداً في كل سطر\nSTEAM-XXXX-YYYY\nPSN-AAAA-BBBB'}
          />
          <button
            onClick={addCodes}
            disabled={saving || !codesText.trim()}
            className="btn-primary px-4 py-2 text-sm disabled:opacity-50 inline-flex items-center gap-2"
          >
            <Plus size={14} />
            {saving ? 'جاري الإضافة...' : 'إضافة للمخزون'}
          </button>
        </div>
      </div>

      <div className="glass-card p-4">
        <h2 className="text-white font-bold text-sm mb-3">الأكواد الحالية</h2>
        <div className="space-y-2 max-h-[420px] overflow-y-auto">
          {codesData.codes.length === 0 ? (
            <p className="text-xs text-gray-500">لا يوجد أكواد مضافة بعد.</p>
          ) : (
            codesData.codes.map(code => (
              <div key={code.id} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5">
                <span className="text-xs font-mono text-gray-200 flex-1 truncate" dir="ltr">{code.code}</span>
                <select
                  value={code.status || 'available'}
                  onChange={e => updateStatus(code.id, e.target.value)}
                  className="bg-transparent text-[11px] border border-white/15 rounded px-1.5 py-1"
                >
                  <option value="available">available</option>
                  <option value="reserved">reserved</option>
                  <option value="sold">sold</option>
                </select>
                <button onClick={() => removeCode(code.id)} className="text-red-400 hover:text-red-300" title="حذف">
                  <Trash2 size={12} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
