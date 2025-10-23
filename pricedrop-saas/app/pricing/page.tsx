'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Check, Crown, Zap } from 'lucide-react'
// Define your PLANS object here or import it from another file if needed
export const PLANS = {
  // plan definitions
}

export default function PricingPage() {
  const router = useRouter()
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')

  const handleSelectPlan = async (plan: string) => {
    if (plan === 'free') {
      router.push('/signup')
    } else {
      router.push(`/signup?plan=${plan}`)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-20">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600">
            Start free, upgrade as you grow
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-8 max-w-7xl mx-auto">
          {Object.entries(PLANS).map(([key, plan], index) => {
            // Add a type assertion for plan
            type PlanType = {
              name: string
              price: number
              limits: {
                products: number
                apiCalls: number
                features: string[]
              }
            }
            const typedPlan = plan as PlanType
            return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{typedPlan.name}</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold">${typedPlan.price}</span>
                {typedPlan.price > 0 && <span className="text-gray-600">/month</span>}
              </div>

              <ul className="space-y-3 mb-8">
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-600">
                    {typedPlan.limits.products === 999 ? 'Unlimited' : typedPlan.limits.products} products
                  </span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-600">
                    {typedPlan.limits.apiCalls.toLocaleString()} API calls/month
                  </span>
                </li>
                {typedPlan.limits.features.map((feature) => (
                  <li key={feature} className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-600 capitalize">
                      {feature.replace(/_/g, ' ')}
                    </span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleSelectPlan(key)}
                className={`w-full py-3 rounded-lg font-semibold transition ${
                  key === 'pro'
                    ? 'bg-primary text-white hover:bg-primary/90'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                }`}
              >
                {key === 'free' ? 'Start Free' : 'Get Started'}
              </button>
            </motion.div>
            )
          })}
        </div>
        </div>

        <div className="mt-16 text-center">
          <p className="text-gray-600">
            All plans include 24/7 support and a 30-day money-back guarantee
          </p>
        </div>
      </div>
  )
}