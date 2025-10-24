'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  Plus,
  TrendingDown,
  Package,
  Bell,
  Settings,
  Search,
  Filter,
  Download,
  Trash2,
  ExternalLink,
  DollarSign,
  Crown
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

interface Product {
  id: string
  url: string
  name: string
  platform: string
  current_price: number
  original_price: number
  currency: string
  image_url: string
  in_stock: boolean
  last_checked: string
  price_history?: any[]
  target_price?: number
}

interface UserProfile {
  id: string
  email: string
  full_name: string
  plan: 'free' | 'pro' | 'ultra' | 'mega'
  tracked_count: number
  alerts_count: number
}

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createServerClient()
  const queryClient = useQueryClient()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPlatform, setFilterPlatform] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [newProductUrl, setNewProductUrl] = useState('')
  const [targetPrice, setTargetPrice] = useState('')

  // Fetch user profile
  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (error) throw error
      return data as UserProfile
    },
  })

  // Fetch tracked products
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      
      const { data, error } = await supabase
        .from('user_tracking')
        .select(`
          *,
          products (*)
        `)
        .eq('user_id', user.id)
      
      if (error) throw error
      return data?.map(item => ({
        ...item.products,
        target_price: item.target_price
      })) as Product[]
    },
  })

  // Add product mutation
  const addProductMutation = useMutation({
    mutationFn: async ({ url, targetPrice }: { url: string; targetPrice: number | null }) => {
      const response = await fetch('/api/products/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url, 
          target_price: targetPrice,
          notify_on_drop: true 
        })
      })
      
      if (!response.ok) throw new Error('Failed to add product')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast.success('Product added successfully!')
      setShowAddModal(false)
      setNewProductUrl('')
      setTargetPrice('')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add product')
    }
  })

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from('user_tracking')
        .delete()
        .eq('product_id', productId)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast.success('Product removed')
    }
  })

  // Check if user can add more products
  const canAddMore = () => {
    if (!profile) return false
    const limits = {
      free: 5,
      pro: 999,
      ultra: 999,
      mega: 999
    }
    return products.length < limits[profile.plan]
  }

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesPlatform = filterPlatform === 'all' || product.platform === filterPlatform
    return matchesSearch && matchesPlatform
  })

  // Calculate total savings
  const totalSavings = products.reduce((sum, product) => {
    if (product.original_price && product.current_price) {
      return sum + (product.original_price - product.current_price)
    }
    return sum
  }, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <Link href="/" className="text-2xl font-bold text-primary">
                💰 PriceDrop
              </Link>
              <nav className="hidden md:flex space-x-6">
                <Link href="/dashboard" className="text-primary font-medium">
                  Dashboard
                </Link>
                <Link href="/alerts" className="text-gray-600 hover:text-primary">
                  Alerts
                </Link>
                <Link href="/analytics" className="text-gray-600 hover:text-primary">
                  Analytics
                </Link>
              </nav>
            </div>
            
            <div className="flex items-center space-x-4">
              {profile?.plan === 'free' && (
                <Link
                  href="/pricing"
                  className="flex items-center px-3 py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full text-sm font-medium"
                >
                  <Crown className="h-4 w-4 mr-1" />
                  Upgrade
                </Link>
              )}
              
              <button className="relative p-2 text-gray-600 hover:text-primary">
                <Bell className="h-6 w-6" />
                {(profile?.alerts_count ?? 0) > 0 && (
                  <span className="absolute top-0 right-0 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {profile?.alerts_count ?? 0}
                  </span>
                )}
              </button>
              
              <Link href="/settings" className="p-2 text-gray-600 hover:text-primary">
                <Settings className="h-6 w-6" />
              </Link>
              
              <div className="flex items-center space-x-2">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{profile?.full_name}</p>
                  <p className="text-xs text-gray-500 capitalize">{profile?.plan} Plan</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Dashboard Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-xl shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Products Tracked</p>
                <p className="text-2xl font-bold text-gray-900">
                  {products.length}
                  {profile?.plan === 'free' && <span className="text-sm text-gray-500">/5</span>}
                </p>
              </div>
              <Package className="h-8 w-8 text-purple-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-6 rounded-xl shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Alerts</p>
                <p className="text-2xl font-bold text-gray-900">{profile?.alerts_count || 0}</p>
              </div>
              <Bell className="h-8 w-8 text-pink-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-6 rounded-xl shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Price Drops Today</p>
                <p className="text-2xl font-bold text-green-600">
                  {products.filter(p => p.current_price < p.original_price).length}
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-green-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white p-6 rounded-xl shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Savings</p>
                <p className="text-2xl font-bold text-blue-600">
                  ${totalSavings.toFixed(2)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
          </motion.div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white p-4 rounded-xl shadow-sm mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
            
            <select
              value={filterPlatform}
              onChange={(e) => setFilterPlatform(e.target.value)}
              aria-label="Filter by platform"
              className="px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="all">All Platforms</option>
              <option value="ebay">eBay</option>
              <option value="amazon">Amazon</option>
              <option value="walmart">Walmart</option>
            </select>

            <button
              onClick={() => {
                if (canAddMore()) {
                  setShowAddModal(true)
                } else {
                  router.push('/pricing')
                }
              }}
              className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition flex items-center"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Product
            </button>

            <button
              aria-label="Export products"
              title="Export products"
              className="px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
            >
              <Download className="h-5 w-5 text-gray-600" />
              <span className="sr-only">Export products</span>
            </button>
          </div>
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-xl shadow-sm animate-pulse">
                <div className="h-48 bg-gray-200 rounded-lg mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white p-12 rounded-xl shadow-sm text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchQuery ? 'No products found' : 'No products tracked yet'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchQuery 
                ? 'Try adjusting your search or filters'
                : 'Start by adding products you want to track'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowAddModal(true)}
                className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition"
              >
                Add Your First Product
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-shadow"
              >
                <div className="relative h-48 bg-gray-100 rounded-t-xl overflow-hidden">
                  {product.image_url ? (
                    <Image
                      src={product.image_url}
                      alt={product.name}
                      fill
                      className="object-contain p-4"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Package className="h-12 w-12 text-gray-400" />
                    </div>
                  )}
                  
                  {product.current_price < product.original_price && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                      -{Math.round((1 - product.current_price / product.original_price) * 100)}%
                    </div>
                  )}
                </div>
                
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                    {product.name}
                  </h3>
                  
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-2xl font-bold text-gray-900">
                        ${product.current_price}
                      </p>
                      {product.original_price > product.current_price && (
                        <p className="text-sm text-gray-500 line-through">
                          ${product.original_price}
                        </p>
                      )}
                    </div>
                    
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      product.in_stock 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {product.in_stock ? 'In Stock' : 'Out of Stock'}
                    </span>
                  </div>

                  {product.target_price && (
                    <p className="text-sm text-gray-600 mb-2">
                      Target: ${product.target_price}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                    <span className="capitalize">{product.platform}</span>
                    <span>Checked {new Date(product.last_checked).toLocaleDateString()}</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <Link
                      href={product.url}
                      target="_blank"
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-center hover:bg-gray-50 transition"
                    >
                      <ExternalLink className="h-4 w-4 mx-auto" />
                    </Link>
                    <Link
                      href={`/products/${product.id}`}
                      className="flex-1 px-4 py-2 bg-primary text-white rounded-lg text-center hover:bg-primary/90 transition"
                    >
                      View
                    </Link>
                    <button
                      type="button"
                      title="Remove product"
                      aria-label="Remove product"
                      onClick={() => deleteProductMutation.mutate(product.id)}
                      className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl p-6 max-w-md w-full"
          >
            <h3 className="text-xl font-semibold mb-4">Add Product to Track</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product URL
                </label>
                <input
                  type="url"
                  placeholder="https://www.ebay.com/itm/..."
                  value={newProductUrl}
                  onChange={(e) => setNewProductUrl(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Price (Optional)
                </label>
                <input
                  type="number"
                  placeholder="99.99"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                />
                <p className="text-xs text-gray-500 mt-1">
                  We'll notify you when the price drops below this amount
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (newProductUrl) {
                    addProductMutation.mutate({
                      url: newProductUrl,
                      targetPrice: targetPrice ? parseFloat(targetPrice) : null
                    })
                  }
                }}
                disabled={!newProductUrl || addProductMutation.isPending}
                className="flex-1 px-4 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition disabled:opacity-50"
              >
                {addProductMutation.isPending ? 'Adding...' : 'Add Product'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
