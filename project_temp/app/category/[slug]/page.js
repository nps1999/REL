'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import CategoriesNav from '@/components/CategoriesNav'
import { ArrowRight, Search, ShoppingCart, Heart, Package, Star, User, Sparkles, Zap } from 'lucide-react'

const LOGO_URL = 'https://customer-assets.emergentagent.com/job_5bfed863-cc5b-467d-9502-6446bf9a8d11/artifacts/80xsas6y_Asset%205.png'

export default function CategoryPage() {
  const params = useParams()
  const router = useRouter()
  const [category, setCategory] = useState(null)
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchData()
  }, [params.slug])

  const fetchData = async () => {
    try {
      setLoading(true)
      // Fetch categories
      const catRes = await fetch('/api/categories')
      const catData = await catRes.json()
      setCategories(catData.categories || [])

      // Find current category
      const currentCat = catData.categories?.find(c => c.slug === params.slug)
      setCategory(currentCat)

      // Fetch products for this category
      const prodRes = await fetch(`/api/products?category=${params.slug}`)
      const prodData = await prodRes.json()
      setProducts(prodData.products || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = products.filter(p =>
    searchQuery ? p.title?.toLowerCase().includes(searchQuery.toLowerCase()) : true
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050508]">
      {/* Header */}
      <header className="glass-card border-b border-white/5 sticky top-0 z-50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Logo Only */}
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <img src={LOGO_URL} alt="Logo" className="h-12 w-auto" />
            </Link>

            {/* Search Bar */}
            <div className="flex-1 max-w-xl">
              <div className="relative">
                <input
                  type="text"
                  placeholder="ابحث عن التصاميم..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 pr-10 text-white placeholder-white/40 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all"
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40" size={20} />
              </div>
            </div>

            {/* Icons */}
            <div className="flex items-center gap-3">
              <Link href="/wishlist" className="glass-button p-2.5">
                <Heart size={20} />
              </Link>
              <Link href="/cart" className="glass-button p-2.5">
                <ShoppingCart size={20} />
              </Link>
              <Link href="/orders" className="glass-button p-2.5">
                <Package size={20} />
              </Link>
              <Link href="/account" className="glass-button p-2.5">
                <User size={20} />
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Categories Bar */}
      <CategoriesNav 
        categories={categories} 
        currentCategoryId={category?.id} 
      />

      {/* Back Button */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <button
          onClick={() => router.push('/')}
          className="glass-button px-6 py-2.5 flex items-center gap-2 hover:bg-purple-500/20 transition-all"
        >
          <ArrowRight size={20} />
          <span>رجوع للقائمة الرئيسية</span>
        </button>
      </div>

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-4 pb-16">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">{category?.name || 'المنتجات'}</h1>
          <p className="text-white/60">تصفح جميع المنتجات في هذا القسم</p>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="text-center py-20">
            <Sparkles size={60} className="text-purple-500/40 mx-auto mb-4" />
            <p className="text-white/60 text-lg">لا توجد منتجات في هذا القسم حالياً</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map(product => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="glass-card border-t border-white/5 py-8 mt-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-white/40 text-sm">© 2024 PRESTIGE DESIGNS - جميع الحقوق محفوظة</p>
        </div>
      </footer>
    </div>
  )
}

function ProductCard({ product }) {
  const discountPrice = product.discount
    ? product.price * (1 - product.discount / 100)
    : null

  return (
    <Link href={`/products/${product.slug || product._id}`}>
      <div className="product-card group cursor-pointer">
        {/* Product Image */}
        <div className="relative aspect-square overflow-hidden rounded-t-xl bg-[#0d0d1a]">
          {product.image ? (
            <img
              src={product.image}
              alt={product.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Sparkles size={40} className="text-purple-500/40" />
            </div>
          )}

          {/* Discount badge */}
          {product.discount > 0 && (
            <div className="absolute top-3 right-3 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
              -{product.discount}%
            </div>
          )}

          {/* Featured badge */}
          {product.featured && (
            <div className="absolute top-3 left-3 bg-gradient-to-r from-violet-600 to-purple-500 text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
              <Zap size={10} /> مميز
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="p-4">
          <h3 className="font-semibold text-white text-sm mb-2 line-clamp-2 hover:text-purple-300 transition-colors">
            {product.title}
          </h3>

          {/* Price */}
          <div className="flex items-center gap-2 mb-3">
            {discountPrice ? (
              <>
                <span className="text-lg font-bold text-purple-400">${discountPrice.toFixed(2)}</span>
                <span className="text-sm text-white/40 line-through">${product.price?.toFixed(2)}</span>
              </>
            ) : (
              <span className="text-lg font-bold text-purple-400">
                {product.price === 0 ? 'مجاني' : `$${product.price?.toFixed(2)}`}
              </span>
            )}
          </div>

          {/* Rating */}
          {product.rating > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map(i => (
                  <Star
                    key={i}
                    size={14}
                    className={i <= product.rating ? 'fill-yellow-400 text-yellow-400' : 'text-white/20'}
                  />
                ))}
              </div>
              <span className="text-xs text-white/50">({product.reviewCount || 0})</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}