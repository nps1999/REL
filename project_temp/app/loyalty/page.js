'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Award, ArrowRight, Plus, Minus, Check, Clock, TrendingUp, Gift } from 'lucide-react'

export default function LoyaltyPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [redeemPoints, setRedeemPoints] = useState(0)
  const [redeemResult, setRedeemResult] = useState(null)
  const [redeeming, setRedeeming] = useState(false)
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }
    if (status === 'authenticated') {
      fetch('/api/loyalty')
        .then(r => r.json())
        .then(d => setData(d))
        .finally(() => setLoading(false))
    }
  }, [status, router])
  
  const handleRedeem = async () => {
    if (redeemPoints <= 0 || redeemPoints > data.points) return
    setRedeeming(true)
    try {
      const res = await fetch('/api/loyalty/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points: redeemPoints }),
      })
      const result = await res.json()
      if (res.ok) {
        setRedeemResult(result)
        setData(prev => ({ ...prev, points: prev.points - redeemPoints }))
      }
    } catch (e) {
    } finally {
      setRedeeming(false)
    }
  }
  
  if (status === 'loading' || loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="spinner" /></div>
  }
  
  const config = data?.config || { pointsPerDollar: 1, dollarPerPoint: 0.01 }
  const maxRedeem = Math.min(data?.points || 0, 10000)
  const redeemValue = (redeemPoints * config.dollarPerPoint).toFixed(2)
  
  return (
    <div className="min-h-screen bg-grid">
      <header className="glass-header sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-4">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm">
            <ArrowRight size={18} />رجوع
          </button>
          <h1 className="text-white font-bold flex items-center gap-2 mr-auto">
            <Award size={18} className="text-yellow-400" />
            نقاط الولاء
          </h1>
        </div>
      </header>
      
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Points Balance */}
        <div className="glass-strong rounded-3xl p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-orange-500/5" />
          <Award size={48} className="text-yellow-400 mx-auto mb-3 relative z-10" />
          <p className="text-gray-400 text-sm relative z-10">رصيد النقاط</p>
          <p className="text-5xl font-black text-yellow-400 my-2 relative z-10">{data?.points || 0}</p>
          <p className="text-gray-400 text-sm relative z-10">نقطة ولاء</p>
          <p className="text-white mt-2 relative z-10">
            تساوي <span className="text-green-400 font-bold">${((data?.points || 0) * config.dollarPerPoint).toFixed(2)}</span>
          </p>
        </div>
        
        {/* How it works */}
        <div className="glass-card p-6">
          <h2 className="text-white font-bold mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-purple-400" />
            كيف تعمل النقاط؟
          </h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-purple-400 text-sm font-bold">1</span>
              </div>
              <p className="text-gray-300 text-sm">عند كل شراء تحصل على <span className="text-yellow-400 font-bold">{config.pointsPerDollar} نقطة</span> مقابل كل دولار</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-purple-400 text-sm font-bold">2</span>
              </div>
              <p className="text-gray-300 text-sm">كل <span className="text-yellow-400 font-bold">100 نقطة</span> = بالقيمة <span className="text-green-400 font-bold">${(100 * config.dollarPerPoint).toFixed(2)}</span></p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-purple-400 text-sm font-bold">3</span>
              </div>
              <p className="text-gray-300 text-sm">استردد نقاطك ككود خصم صالح لمدة 24 ساعة</p>
            </div>
          </div>
        </div>
        
        {/* Redeem */}
        {(data?.points || 0) > 0 && (
          <div className="glass-card p-6">
            <h2 className="text-white font-bold mb-4 flex items-center gap-2">
              <Gift size={18} className="text-green-400" />
              استرداد النقاط
            </h2>
            
            {redeemResult ? (
              <div className="text-center py-4">
                <Check size={40} className="text-green-400 mx-auto mb-3" />
                <p className="text-green-400 font-bold text-lg mb-1">تم إنشاء كود الخصم!</p>
                <div className="glass p-4 rounded-2xl mt-3">
                  <p className="text-gray-400 text-sm">كودك:</p>
                  <p className="text-2xl font-black text-purple-400 font-mono my-1" dir="ltr">{redeemResult.code}</p>
                  <p className="text-green-400 text-sm">قيمة: ${redeemResult.value?.toFixed(2)}</p>
                  <p className="text-gray-500 text-xs mt-1">صالح لمدة 24 ساعة</p>
                </div>
                <button onClick={() => setRedeemResult(null)} className="mt-4 text-purple-400 text-sm hover:text-purple-300">
                  استرداد مرة أخرى
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-gray-400 text-sm mb-3 block">
                    عدد النقاط للاسترداد (1 - {data?.points})
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setRedeemPoints(Math.max(0, redeemPoints - 10))}
                      className="w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-white/10 transition-colors"
                    >
                      <Minus size={16} />
                    </button>
                    <input
                      type="number"
                      value={redeemPoints}
                      onChange={e => setRedeemPoints(Math.min(maxRedeem, Math.max(0, parseInt(e.target.value) || 0)))}
                      className="glass-input text-center text-lg font-bold flex-1"
                      min={0}
                      max={data?.points}
                    />
                    <button
                      onClick={() => setRedeemPoints(Math.min(maxRedeem, redeemPoints + 10))}
                      className="w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-white/10 transition-colors"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
                
                {redeemPoints > 0 && (
                  <div className="glass p-3 rounded-xl text-center">
                    <p className="text-gray-400 text-sm">ستحصل على خصم</p>
                    <p className="text-green-400 font-black text-2xl">${redeemValue}</p>
                  </div>
                )}
                
                <button
                  onClick={handleRedeem}
                  disabled={redeeming || redeemPoints <= 0}
                  className="btn-primary w-full py-3 disabled:opacity-50"
                >
                  {redeeming ? 'جاري الإنشاء...' : 'إنشاء كود الخصم'}
                </button>
              </div>
            )}
          </div>
        )}
        
        {/* History */}
        {data?.history?.length > 0 && (
          <div className="glass-card p-6">
            <h2 className="text-white font-bold mb-4">سجل النقاط</h2>
            <div className="space-y-3">
              {data.history.map(item => (
                <div key={item.id} className="flex items-center justify-between border-b border-white/5 pb-3 last:border-0">
                  <div>
                    <p className="text-white text-sm">{item.description}</p>
                    <p className="text-gray-500 text-xs">{new Date(item.createdAt).toLocaleDateString('ar-SA')}</p>
                  </div>
                  <span className={`font-bold text-sm ${item.points > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {item.points > 0 ? '+' : ''}{item.points}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
