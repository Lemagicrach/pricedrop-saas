import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { trackProductSchema } from '@/lib/validation'
import { getPlanLimits } from '@/lib/stripe'

const PRICEDROP_API_URL = process.env.NEXT_PUBLIC_API_URL
const PRICEDROP_API_KEY = process.env.PRICEDROP_API_KEY

if (!PRICEDROP_API_KEY || PRICEDROP_API_KEY.length < 32) {
  throw new Error('PRICEDROP_API_KEY must be at least 32 characters')
}

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies })
  
  try {
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate request body
    const body = await req.json()
    const validatedData = trackProductSchema.parse(body)

    // Get user profile to check plan limits
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('plan, tracked_count')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Check plan limits
    const limits = getPlanLimits(profile.plan)
    const { count } = await supabase
      .from('user_tracking')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if ((count || 0) >= limits.products) {
      return NextResponse.json(
        { 
          error: 'Plan limit reached', 
          message: `Your ${profile.plan} plan allows ${limits.products} products. Please upgrade to track more.`,
          upgrade_url: '/pricing'
        },
        { status: 403 }
      )
    }

    // Call PriceDrop API
    const response = await fetch(`${PRICEDROP_API_URL}/api/v1/products/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': PRICEDROP_API_KEY,
      },
      body: JSON.stringify({
        url: validatedData.url,
        target_price: validatedData.target_price,
        notify_on_drop: validatedData.notify_on_drop,
        user_email: user.email
      })
    })

    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json(
        { error: 'Failed to track product', details: error },
        { status: response.status }
      )
    }

    const data = await response.json()

    // Store in database
    if (data.success && data.data) {
      const productData = data.data.product || data.product

      // Upsert product
      const { data: product, error: productError } = await supabase
        .from('products')
        .upsert({
          url: validatedData.url,
          platform: productData.store || 'ebay',
          name: productData.title || productData.name,
          current_price: productData.current_price || productData.price,
          original_price: productData.original_price || productData.price,
          currency: productData.currency || 'USD',
          image_url: productData.image_url || productData.image,
          in_stock: productData.in_stock !== false,
          last_checked: new Date().toISOString()
        }, { onConflict: 'url' })
        .select()
        .single()

      if (productError) {
        console.error('Product upsert error:', productError)
        return NextResponse.json({ error: 'Failed to save product' }, { status: 500 })
      }

      // Create user tracking entry
      const { error: trackingError } = await supabase
        .from('user_tracking')
        .insert({
          user_id: user.id,
          product_id: product.id,
          target_price: validatedData.target_price,
          notify_on_any_drop: validatedData.notify_on_drop
        })

      if (trackingError) {
        if (trackingError.code === '23505') {
          return NextResponse.json(
            { error: 'You are already tracking this product' },
            { status: 400 }
          )
        }
        console.error('Tracking error:', trackingError)
        return NextResponse.json({ error: 'Failed to create tracking' }, { status: 500 })
      }

      // Update user's tracked count
      await supabase
        .from('user_profiles')
        .update({ 
          tracked_count: (profile.tracked_count || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      // Add to price history
      if (productData.current_price || productData.price) {
        await supabase
          .from('price_history')
          .insert({
            product_id: product.id,
            price: productData.current_price || productData.price,
            currency: productData.currency || 'USD',
            in_stock: productData.in_stock !== false,
            recorded_at: new Date().toISOString()
          })
      }
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Track product error:', error)
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}