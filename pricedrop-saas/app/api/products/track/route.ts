import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

const PRICEDROP_API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://pricedrop-api.vercel.app'
const PRICEDROP_API_KEY = process.env.PRICEDROP_API_KEY || 'demo-key-123'

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies })
  
  try {
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile to check plan limits
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('plan, tracked_count')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Check plan limits
    const limits = {
      free: 5,
      pro: 999,
      ultra: 999,
      mega: 999
    }

    const currentCount = await supabase
      .from('user_tracking')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id)

    if ((currentCount.count || 0) >= limits[profile.plan as keyof typeof limits]) {
      return NextResponse.json(
        { error: 'Plan limit reached. Please upgrade to track more products.' },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await req.json()
    const { url, target_price, notify_on_drop } = body

    // Call your PriceDrop API to track the product
    const response = await fetch(`${PRICEDROP_API_URL}/api/v1/products/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': PRICEDROP_API_KEY,
      },
      body: JSON.stringify({
        url,
        target_price,
        notify_on_drop: notify_on_drop !== false,
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

    // Store in your database
    if (data.success && data.data) {
      const productData = data.data.product || data.product

      // Check if product exists
      let { data: existingProduct } = await supabase
        .from('products')
        .select('id')
        .eq('url', url)
        .single()

      let productId = existingProduct?.id

      if (!productId) {
        // Create product if doesn't exist
        const { data: newProduct, error: productError } = await supabase
          .from('products')
          .insert({
            url,
            platform: productData.store || 'ebay',
            name: productData.title || productData.name,
            current_price: productData.current_price || productData.price,
            original_price: productData.original_price || productData.price,
            currency: productData.currency || 'USD',
            image_url: productData.image_url || productData.image,
            in_stock: productData.in_stock !== false,
            last_checked: new Date().toISOString()
          })
          .select()
          .single()

        if (productError) {
          console.error('Product creation error:', productError)
          return NextResponse.json(
            { error: 'Failed to save product' },
            { status: 500 }
          )
        }

        productId = newProduct.id
      }

      // Create user tracking entry
      const { error: trackingError } = await supabase
        .from('user_tracking')
        .insert({
          user_id: user.id,
          product_id: productId,
          target_price,
          notify_on_any_drop: notify_on_drop !== false
        })

      if (trackingError) {
        // Handle duplicate tracking
        if (trackingError.code === '23505') {
          return NextResponse.json(
            { error: 'You are already tracking this product' },
            { status: 400 }
          )
        }
        console.error('Tracking error:', trackingError)
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
            product_id: productId,
            price: productData.current_price || productData.price,
            currency: productData.currency || 'USD',
            in_stock: productData.in_stock !== false,
            recorded_at: new Date().toISOString()
          })
      }
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Track product error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
