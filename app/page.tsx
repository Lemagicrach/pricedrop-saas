'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  TrendingDown, 
  Bell, 
  BarChart3, 
  Shield, 
  Zap, 
  Check,
  ArrowRight,
  DollarSign
} from 'lucide-react'

const plans = [
  {
    name: 'Free',
    price: 0,
    period: 'forever',
    description: 'Perfect for getting started',
    features: [
      'Track up to 5 products',
      'Daily price checks',
      '30-day price history',
      'Email alerts',
      'Basic dashboard'
    ],
    cta: 'Start Free',
    href: '/signup',
    popular: false
  },
  {
    name: 'Pro',
    price: 9.99,
    period: 'month',
    description: 'For serious deal hunters',
    features: [
      'Track unlimited products',
      'Real-time price monitoring',
      '1-year price history',
      'Instant alerts (email + SMS)',
      'Price prediction AI',
      'Chrome extension',
      'Export data to CSV',
      'Priority support'
    ],
    cta: 'Start 7-day Trial',
    href: '/signup?plan=pro',
    popular: true
  },
  {
    name: 'Team',
    price: 29.99,
    period: 'month',
    description: 'For businesses & resellers',
    features: [
      'Everything in Pro',
      '5 user accounts',
      'Shared watchlists',
      'Budget management',
      'API access',
      'Webhook integrations',
      'Custom alerts',
      'Dedicated support'
    ],
    cta: 'Contact Sales',
    href: '/contact',
    popular: false
  }
]

export default function LandingPage() {
  const [email, setEmail] = useState('')
  const [url, setUrl] = useState('')
  const [demoLoading, setDemoLoading] = useState(false)
  const [demoResult, setDemoResult] = useState<any>(null)

  const handleQuickDemo = async () => {
    if (!url) return
    
    setDemoLoading(true)
    try {
      // Call your API to check the price
      const response = await fetch('/api/demo/check-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      })
      const data = await response.json()
      setDemoResult(data)
    } catch (error) {
      console.error('Demo error:', error)
    } finally {
      setDemoLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-8">
              <Link href="/" className="text-2xl font-bold text-primary">
                💰 PriceDrop
              </Link>
              <div className="hidden md:flex space-x-6">
                <Link href="#features" className="text-gray-600 hover:text-primary">Features</Link>
                <Link href="#pricing" className="text-gray-600 hover:text-primary">Pricing</Link>
                <Link href="#how-it-works" className="text-gray-600 hover:text-primary">How it Works</Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/login" className="text-gray-600 hover:text-primary">
                Sign In
              </Link>
              <Link 
                href="/signup" 
                className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition"
              >
                Start Free
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Never Overpay for
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
                {' '}Products Again
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Track prices across eBay, Amazon, and major retailers. Get instant alerts when prices drop. 
              Save an average of $2,100 per year.
            </p>
            
            {/* Quick Demo */}
            <div className="max-w-2xl mx-auto mb-8 bg-white p-6 rounded-2xl shadow-lg">
              <p className="text-sm text-gray-600 mb-3">Try it now - paste any product URL:</p>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://www.ebay.com/itm/..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="flex-1 px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  onClick={handleQuickDemo}
                  disabled={demoLoading}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:opacity-90 transition disabled:opacity-50"
                >
                  {demoLoading ? 'Checking...' : 'Check Price'}
                </button>
              </div>
              
              {demoResult && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-4 bg-green-50 rounded-lg text-left"
                >
                  <p className="font-semibold">{demoResult.title}</p>
                  <p className="text-2xl font-bold text-green-600">${demoResult.price}</p>
                  <p className="text-sm text-gray-600">We'll alert you when this drops!</p>
                  <Link href="/signup" className="text-primary underline text-sm">
                    Create free account to start tracking →
                  </Link>
                </motion.div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/signup"
                className="px-8 py-4 bg-primary text-white rounded-lg text-lg font-semibold hover:bg-primary/90 transition flex items-center justify-center"
              >
                Start Tracking Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link
                href="#how-it-works"
                className="px-8 py-4 bg-white text-primary border-2 border-primary rounded-lg text-lg font-semibold hover:bg-primary/5 transition"
              >
                See How It Works
              </Link>
            </div>
          </motion.div>

          {/* Trust Indicators */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-20">
            {[
              { label: 'Active Users', value: '12,847+' },
              { label: 'Products Tracked', value: '584K+' },
              { label: 'Avg. Savings/Year', value: '$2,100' },
              { label: 'Price Alerts Sent', value: '2.3M+' }
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-gray-600">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12">
            Everything You Need to Save Money
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <TrendingDown className="h-8 w-8 text-purple-600" />,
                title: 'Real-Time Tracking',
                description: 'Monitor prices across multiple stores. Our system checks every hour for the best deals.'
              },
              {
                icon: <Bell className="h-8 w-8 text-pink-600" />,
                title: 'Instant Alerts',
                description: 'Get notified via email, SMS, or push notifications the moment prices drop.'
              },
              {
                icon: <BarChart3 className="h-8 w-8 text-blue-600" />,
                title: 'Price History & Analytics',
                description: 'See historical trends, predict future prices, and know the perfect time to buy.'
              },
              {
                icon: <Shield className="h-8 w-8 text-green-600" />,
                title: 'Price Protection',
                description: 'Never miss a deal. Set your target price and we\'ll watch 24/7.'
              },
              {
                icon: <Zap className="h-8 w-8 text-yellow-600" />,
                title: 'Lightning Fast',
                description: 'Add products in seconds with our Chrome extension or mobile app.'
              },
              {
                icon: <DollarSign className="h-8 w-8 text-red-600" />,
                title: 'Save Thousands',
                description: 'Our users save an average of $2,100 per year on online purchases.'
              }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition"
              >
                <div className="mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-gray-600 text-center mb-12">
            Start free, upgrade when you need more
          </p>
          
          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`relative bg-white rounded-2xl shadow-lg ${
                  plan.popular ? 'ring-2 ring-primary transform scale-105' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-primary text-white px-4 py-1 rounded-full text-sm">
                      MOST POPULAR
                    </span>
                  </div>
                )}
                
                <div className="p-8">
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-gray-600 mb-4">{plan.description}</p>
                  <div className="mb-6">
                    <span className="text-4xl font-bold">${plan.price}</span>
                    {plan.price > 0 && (
                      <span className="text-gray-600">/{plan.period}</span>
                    )}
                  </div>
                  
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, j) => (
                      <li key={j} className="flex items-start">
                        <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Link
                    href={plan.href}
                    className={`block text-center py-3 rounded-lg font-semibold transition ${
                      plan.popular
                        ? 'bg-primary text-white hover:bg-primary/90'
                        : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12">
            Start Saving in 3 Simple Steps
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                title: 'Add Products',
                description: 'Paste any product URL or use our Chrome extension while shopping'
              },
              {
                step: '2',
                title: 'Set Your Price',
                description: 'Tell us your target price or let us notify you of any drops'
              },
              {
                step: '3',
                title: 'Get Alerts & Save',
                description: 'Receive instant notifications and buy at the perfect moment'
              }
            ].map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.2 }}
                className="text-center"
              >
                <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  {step.step}
                </div>
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-gray-600">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-purple-600 to-pink-600">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Start Saving?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Join 12,847+ smart shoppers who never overpay. 
            Start tracking for free, no credit card required.
          </p>
          <div className="max-w-md mx-auto">
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-4 py-3 rounded-lg text-gray-900"
              />
              <Link 
                href={`/signup?email=${email}`}
                className="px-6 py-3 bg-white text-primary rounded-lg font-semibold hover:bg-gray-100 transition"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-gray-900 text-gray-400">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h4 className="text-white font-semibold mb-4">PriceDrop</h4>
              <p className="text-sm">Never overpay for products again.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/features" className="hover:text-white">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-white">Pricing</Link></li>
                <li><Link href="/api" className="hover:text-white">API</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/about" className="hover:text-white">About</Link></li>
                <li><Link href="/blog" className="hover:text-white">Blog</Link></li>
                <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/privacy" className="hover:text-white">Privacy</Link></li>
                <li><Link href="/terms" className="hover:text-white">Terms</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
            © 2025 PriceDrop. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
