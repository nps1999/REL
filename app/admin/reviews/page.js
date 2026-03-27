'use client'
import { useState, useEffect } from 'react'
import { Star, Check, X, ThumbsUp, ThumbsDown } from 'lucide-react'

export default function AdminReviews() {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [toast, setToast] = useState(null)
  
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000) }
  
  useEffect(() => {
    fetch('/api/reviews').then(r => r.json()).then(d => setReviews(Array.isArray(d) ? d : [])).finally(() => setLoading(false))
  }, [])
  
  const handleUpdate = async (reviewId, status) => {
    await fetch(`/api/reviews/${reviewId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, status } : r))
    showToast(status === 'approved' ? 'تم القبول ✅' : 'تم الرفض ❌')
  }
  
  const handleDelete = async (reviewId) => {
    await fetch(`/api/reviews/${reviewId}`, { method: 'DELETE' })
    setReviews(prev => prev.filter(r => r.id !== reviewId))
    showToast('تم الحذف')
  }
  
  const filtered = reviews.filter(r => filter === 'all' || r.status === filter)
  
  if (loading) return <div className="flex items-center justify-center h-64"><div className="spinner" /></div>
  
  return (
    <div className="space-y-6">
      {toast && <div className="toast-notification"><span className="text-sm">{toast}</span></div>}
      
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-white flex items-center gap-2">
          <Star size={20} className="text-yellow-400" />
          التقييمات ({reviews.length})
        </h1>
      </div>
      
      <div className="flex gap-2">
        {[['all', 'الكل'], ['pending', 'بانتظار'], ['approved', 'مقبولة'], ['rejected', 'مرفوضة']].map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} className={`px-4 py-1.5 rounded-full text-xs transition-all ${filter === k ? 'bg-purple-500/30 border border-purple-500/50 text-purple-300' : 'bg-white/5 border border-white/10 text-gray-400'}`}>{l}</button>
        ))}
      </div>
      
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">لا توجد تقييمات</div>
        ) : (
          filtered.map(review => (
            <div key={review.id} className="glass-card p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-400 flex items-center justify-center flex-shrink-0">
                  {review.userImage ? <img src={review.userImage} alt="" className="w-full h-full object-cover rounded-full" /> : <span className="text-white font-bold text-sm">{review.userName?.charAt(0)}</span>}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium text-sm">{review.userName}</span>
                    <div className="flex">{[1,2,3,4,5].map(i => <Star key={i} size={12} className={i <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'} />)}</div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${review.status === 'approved' ? 'bg-green-500/10 text-green-400' : review.status === 'rejected' ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                      {review.status === 'approved' ? 'مقبول' : review.status === 'rejected' ? 'مرفوض' : 'معلق'}
                    </span>
                  </div>
                  <p className="text-gray-300 text-sm mt-1">{review.text}</p>
                </div>
              </div>
              
              <div className="flex gap-2 mr-13">
                {review.status !== 'approved' && (
                  <button onClick={() => handleUpdate(review.id, 'approved')} className="px-3 py-1.5 rounded-xl bg-green-500/20 text-green-400 text-xs flex items-center gap-1">
                    <ThumbsUp size={12} />قبول
                  </button>
                )}
                {review.status !== 'rejected' && (
                  <button onClick={() => handleUpdate(review.id, 'rejected')} className="px-3 py-1.5 rounded-xl bg-red-500/20 text-red-400 text-xs flex items-center gap-1">
                    <ThumbsDown size={12} />رفض
                  </button>
                )}
                <button onClick={() => handleDelete(review.id)} className="px-3 py-1.5 rounded-xl bg-gray-500/20 text-gray-400 text-xs">
                  <X size={12} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
