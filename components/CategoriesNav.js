'use client'
import Link from 'next/link'

export default function CategoriesNav({ categories = [], currentCategoryId = null }) {
  // Filter active categories and sort by order - Fixed to use isActive
  const activeCategories = categories
    .filter(cat => cat.isActive === true || cat.status === 'active')
    .sort((a, b) => (a.order || 0) - (b.order || 0))
  
  // Calculate dynamic sizing based on number of categories
  const totalCategories = activeCategories.length + 1 // +1 for "الرائجة"
  
  // Dynamic sizing - adjusted for better balance
  const getSizeClasses = () => {
    if (totalCategories <= 4) return 'px-8 py-2.5 text-base min-w-[120px]'
    if (totalCategories <= 7) return 'px-6 py-2.5 text-sm min-w-[100px]'
    if (totalCategories <= 11) return 'px-5 py-2 text-sm min-w-[90px]'
    if (totalCategories <= 15) return 'px-4 py-2 text-xs min-w-[80px]'
    return 'px-3 py-2 text-xs min-w-[70px]'
  }
  
  const sizeClasses = getSizeClasses()
  
  return (
    <div className="w-full bg-gradient-to-b from-[#0a0a0f] to-[#0d0d12] border-b border-purple-500/10 sticky top-16 z-40 shadow-lg shadow-black/20">
      <div className="max-w-[1600px] mx-auto px-4">
        {/* Scrollable container */}
        <div className="relative">
          <div 
            className="flex items-center gap-2 py-3 overflow-x-auto scroll-smooth"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#8b5cf6 transparent'
            }}
          >
            {/* الرائجة - Special styling */}
            <Link 
              href="/" 
              className={`group relative ${sizeClasses} rounded-xl whitespace-nowrap transition-all duration-300 flex items-center justify-center gap-1.5 flex-shrink-0 font-bold ${
                !currentCategoryId 
                  ? 'bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white shadow-lg shadow-orange-500/40' 
                  : 'bg-gradient-to-r from-orange-500/20 via-red-500/20 to-pink-500/20 text-orange-300 hover:from-orange-500/30 hover:via-red-500/30 hover:to-pink-500/30 hover:text-orange-200 border border-orange-500/20'
              }`}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
              </svg>
              <span>الرائجة</span>
              {!currentCategoryId && (
                <>
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 rounded-xl blur-lg opacity-50 -z-10 animate-pulse"></div>
                  <div className="absolute -top-0.5 -right-0.5 flex gap-1">
                    <div className="w-1.5 h-1.5 bg-yellow-300 rounded-full animate-pulse shadow-lg shadow-yellow-300/50"></div>
                    <div className="w-1.5 h-1.5 bg-orange-300 rounded-full animate-pulse shadow-lg shadow-orange-300/50" style={{animationDelay: '0.2s'}}></div>
                  </div>
                </>
              )}
            </Link>
            
            {/* All Categories - Same exact sizing */}
            {activeCategories.map((cat, index) => (
              <Link
                key={cat.id || cat._id}
                href={`/category/${cat.slug || cat.id}`}
                className={`group relative ${sizeClasses} rounded-xl whitespace-nowrap transition-all duration-300 flex items-center justify-center flex-shrink-0 font-semibold ${
                  currentCategoryId === cat.id || currentCategoryId === cat._id
                    ? 'bg-gradient-to-r from-purple-600 via-violet-600 to-purple-600 text-white shadow-lg shadow-purple-500/30' 
                    : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white hover:scale-[1.02]'
                }`}
                style={{
                  animationDelay: `${index * 30}ms`
                }}
              >
                {cat.name}
                {(currentCategoryId === cat.id || currentCategoryId === cat._id) && (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-violet-600 rounded-xl blur-lg opacity-40 -z-10 animate-pulse"></div>
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
                  </>
                )}
              </Link>
            ))}
          </div>
          
          {/* Gradient fade indicators for scroll */}
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#0d0d12] to-transparent pointer-events-none"></div>
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#0d0d12] to-transparent pointer-events-none"></div>
        </div>
      </div>
      
      {/* Elegant bottom gradient line */}
      <div className="h-px bg-gradient-to-r from-transparent via-purple-500/40 to-transparent"></div>
      
      {/* Custom scrollbar styles */}
      <style jsx global>{`
        .overflow-x-auto::-webkit-scrollbar {
          height: 4px;
        }
        .overflow-x-auto::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .overflow-x-auto::-webkit-scrollbar-thumb {
          background: linear-gradient(to right, #8b5cf6, #a855f7);
          border-radius: 10px;
        }
        .overflow-x-auto::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to right, #7c3aed, #9333ea);
        }
      `}</style>
    </div>
  )
}
