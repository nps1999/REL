'use client'
import Link from 'next/link'
import { AlertCircle } from 'lucide-react'

export default function AuthError() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="glass-strong rounded-3xl p-8 w-full max-w-md text-center">
        <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-white mb-2">حدث خطأ في تسجيل الدخول</h1>
        <p className="text-gray-400 text-sm mb-6">تأكد من إضافة بيانات OAuth في ملف .env</p>
        <Link href="/auth/signin">
          <button className="btn-primary px-6 py-2">محاولة مجدداً</button>
        </Link>
      </div>
    </div>
  )
}
