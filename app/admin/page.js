'use client'
import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Package, Users, Star, Percent, ShoppingBag, Clock, Check, DollarSign } from 'lucide-react'

function StatCard({ label, value, icon: Icon, color, sub }) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${color}`}>
          <Icon size={22} className="text-white" />
        </div>
        {sub !== undefined && (
          <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
            sub >= 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
          }`}>
            {sub >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {Math.abs(sub).toFixed(0)}%
          </div>
        )}
      </div>
      <p className="text-gray-400 text-xs mb-1">{label}</p>
      <p className="text-white text-2xl font-black">{value}</p>
    </div>
  )
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [recentOrders, setRecentOrders] = useState([])
  const [error, setError] = useState(null)
  
  useEffect(() => {
    Promise.all([
      fetch('/api/admin/stats').then(r => r.json()),
      fetch('/api/orders?limit=5').then(r => r.json()),
    ]).then(([statsData, ordersData]) => {
      if (statsData.error) {
        setError(statsData.error)
      } else {
        setStats(statsData)
      }
      setRecentOrders(Array.isArray(ordersData) ? ordersData.slice(0, 5) : ordersData.orders?.slice(0, 5) || [])
    }).catch(err => {
      setError('فشل تحميل البيانات')
    }).finally(() => setLoading(false))
  }, [])
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-500"></div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="glass-card p-8 rounded-2xl text-center max-w-md">
          <h2 className="text-xl font-bold text-white mb-4">⚠️ خطأ في الوصول</h2>
          <p className="text-white/70 mb-6">{error}</p>
          <p className="text-white/50 text-sm">يرجى تسجيل الدخول كمسؤول للوصول إلى لوحة التحكم</p>
        </div>
      </div>
    )
  }
  
  const weeklyGrowth = stats?.prevWeekIncome > 0 
    ? ((stats.weeklyIncome - stats.prevWeekIncome) / stats.prevWeekIncome) * 100 
    : 0
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">مرحباً بك! 👋</h1>
        <p className="text-gray-400 text-sm mt-1">هذا ملخص نشاط متجرك</p>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="إجمالي الطلبات"
          value={stats?.totalOrders || 0}
          icon={ShoppingBag}
          color="bg-gradient-to-br from-violet-600 to-purple-500"
          sub={weeklyGrowth}
        />
        <StatCard
          label="إجمالي المستخدمين"
          value={stats?.totalUsers || 0}
          icon={Users}
          color="bg-gradient-to-br from-blue-600 to-cyan-500"
        />
        <StatCard
          label="إجمالي التقييمات"
          value={stats?.totalReviews || 0}
          icon={Star}
          color="bg-gradient-to-br from-yellow-500 to-orange-500"
        />
        <StatCard
          label="أكواد الخصم"
          value={stats?.totalDiscounts || 0}
          icon={Percent}
          color="bg-gradient-to-br from-green-600 to-emerald-500"
        />
      </div>
      
      {/* Income cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="glass-card p-5 lg:col-span-1">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-400 flex items-center justify-center">
              <DollarSign size={20} className="text-white" />
            </div>
            <p className="text-gray-400 text-sm">الدخل الأسبوعي</p>
          </div>
          <p className="text-3xl font-black text-green-400">${stats?.weeklyIncome?.toFixed(2) || '0.00'}</p>
          {weeklyGrowth !== 0 && (
            <p className={`text-xs mt-1 flex items-center gap-1 ${weeklyGrowth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {weeklyGrowth >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {weeklyGrowth >= 0 ? '+' : ''}{weeklyGrowth.toFixed(1)}% عن الأسبوع الماضي
            </p>
          )}
        </div>
        
        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-400 flex items-center justify-center">
              <Clock size={20} className="text-white" />
            </div>
            <p className="text-gray-400 text-sm">بانتظار التسليم</p>
          </div>
          <p className="text-3xl font-black text-yellow-400">{stats?.pendingOrders || 0}</p>
          <p className="text-gray-500 text-xs mt-1">طلب يحتاج تسليم</p>
        </div>
        
        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-violet-500 flex items-center justify-center">
              <Check size={20} className="text-white" />
            </div>
            <p className="text-gray-400 text-sm">إجمالي الدخل</p>
          </div>
          <p className="text-3xl font-black gradient-text">${stats?.totalIncome?.toFixed(2) || '0.00'}</p>
          <p className="text-gray-500 text-xs mt-1">منذ البداية</p>
        </div>
      </div>
      
      {/* Recent Orders */}
      <div className="glass-card p-6">
        <h2 className="text-white font-bold mb-5 flex items-center gap-2">
          <Package size={18} className="text-purple-400" />
          أحدث الطلبات
        </h2>
        
        {recentOrders.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">لا توجد طلبات حتى الآن</p>
        ) : (
          <div className="space-y-3">
            {recentOrders.map(order => (
              <div key={order.id} className="flex items-center justify-between p-3 rounded-xl bg-white/2 border border-white/5 hover:border-purple-500/20 transition-colors">
                <div>
                  <p className="text-white text-sm font-medium">#{order.id?.slice(-8)?.toUpperCase()}</p>
                  <p className="text-gray-400 text-xs">{order.customerName}</p>
                </div>
                <div className="text-center">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${
                    order.paymentStatus === 'paid' 
                      ? 'bg-green-500/10 border-green-500/20 text-green-400'
                      : order.paymentStatus === 'failed'
                        ? 'bg-red-500/10 border-red-500/20 text-red-400'
                        : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                  }`}>
                    {order.paymentStatus === 'paid' ? 'مدفوع' : order.paymentStatus === 'failed' ? 'فشل' : 'معلق'}
                  </span>
                </div>
                <p className="text-green-400 font-bold text-sm">${order.totalAmount?.toFixed(2)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
