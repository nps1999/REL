'use client'
import { useState, useEffect } from 'react'
import { Users, Edit, Trash2, Ban, Award, Eye, X, Check, Search } from 'lucide-react'

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [editUser, setEditUser] = useState(null)
  const [pointsInput, setPointsInput] = useState(0)
  const [toast, setToast] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  
  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }
  
  useEffect(() => {
    fetch('/api/users').then(r => r.json()).then(d => setUsers(Array.isArray(d) ? d : [])).finally(() => setLoading(false))
  }, [])
  
  // Filter users based on search query
  const filteredUsers = users.filter(user => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      user.name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.id?.toLowerCase().includes(query) ||
      user.role?.toLowerCase().includes(query)
    )
  })
  
  const handleUpdatePoints = async () => {
    await fetch(`/api/users/${editUser.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loyaltyPoints: parseInt(pointsInput) }),
    })
    setUsers(prev => prev.map(u => u.id === editUser.id ? { ...u, loyaltyPoints: parseInt(pointsInput) } : u))
    showToast('تم تحديث النقاط')
    setEditUser(null)
  }
  
  const handleBanUser = async (user) => {
    if (!confirm(`هل تريد ${user.banned ? 'إلغاء حظر' : 'حظر'} هذا المستخدم؟`)) return
    await fetch(`/api/users/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ banned: !user.banned }),
    })
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, banned: !u.banned } : u))
    showToast(user.banned ? 'تم إلغاء الحظر' : 'تم الحظر')
  }
  
  const handleDeleteUser = async (userId) => {
    if (!confirm('هل أنت متأكد؟')) return
    await fetch(`/api/users/${userId}`, { method: 'DELETE' })
    setUsers(prev => prev.filter(u => u.id !== userId))
    showToast('تم الحذف')
  }
  
  if (loading) return <div className="flex items-center justify-center h-64"><div className="spinner" /></div>
  
  return (
    <div className="space-y-6">
      {toast && <div className="toast-notification"><span className="text-sm">{toast.msg}</span></div>}
      
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-white flex items-center gap-2">
          <Users size={20} className="text-purple-400" />
          المستخدمون ({filteredUsers.length} من {users.length})
        </h1>
      </div>
      
      {/* Search Box */}
      <div className="relative">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
        <input
          type="text"
          placeholder="بحث بالاسم، البريد الإلكتروني، أو الصلاحية..."
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
      
      <div className="space-y-3">
        {filteredUsers.map(user => (
          <div key={user.id} className={`glass-card p-4 flex items-center gap-4 ${user.banned ? 'opacity-50' : ''}`}>
            <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-violet-600 to-pink-500 flex-shrink-0 flex items-center justify-center">
              {user.image ? <img src={user.image} alt="" className="w-full h-full object-cover" /> : <span className="text-white font-bold">{user.name?.charAt(0)}</span>}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-white font-medium text-sm truncate">{user.name}</p>
                {user.role === 'admin' && <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">مدير</span>}
                {user.banned && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">محظور</span>}
              </div>
              <p className="text-gray-400 text-xs truncate">{user.email}</p>
              <div className="flex gap-3 mt-1 text-xs text-gray-500">
                <span>🏆 {user.loyaltyPoints || 0} نقطة</span>
                <span>🛎️ {user.orderCount || 0} طلب</span>
                <span>💰 ${(user.totalSpent || 0).toFixed(2)}</span>
              </div>
            </div>
            
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => { setEditUser(user); setPointsInput(user.loyaltyPoints || 0) }}
                className="p-2 rounded-xl bg-yellow-500/20 text-yellow-400 border border-yellow-500/20 hover:bg-yellow-500/30"
                title="تعديل النقاط"
              >
                <Award size={14} />
              </button>
              <button
                onClick={() => handleBanUser(user)}
                className={`p-2 rounded-xl border ${user.banned ? 'bg-green-500/20 text-green-400 border-green-500/20' : 'bg-orange-500/20 text-orange-400 border-orange-500/20'}`}
                title={user.banned ? 'إلغاء الحظر' : 'حظر المستخدم'}
              >
                {user.banned ? <Check size={14} /> : <Ban size={14} />}
              </button>
              <button
                onClick={() => handleDeleteUser(user.id)}
                className="p-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/20"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {editUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-strong rounded-3xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-white">تعديل نقاط الولاء</h2>
              <button onClick={() => setEditUser(null)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            <p className="text-gray-300 text-sm mb-4">{editUser.name}</p>
            <input type="number" value={pointsInput} onChange={e => setPointsInput(e.target.value)} className="glass-input mb-4" dir="ltr" />
            <div className="flex gap-3">
              <button onClick={handleUpdatePoints} className="btn-primary flex-1 py-3 text-sm">حفظ</button>
              <button onClick={() => setEditUser(null)} className="px-5 py-3 rounded-full border border-white/10 text-gray-400 text-sm">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
