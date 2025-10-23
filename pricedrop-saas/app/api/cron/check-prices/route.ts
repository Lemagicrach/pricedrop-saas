// app/api/cron/check-prices/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ProductScraper } from '@/lib/scraper'
import { sendPriceDropEmail } from '@/lib/email'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY! // Use service key for cron jobs
)

// Verify cron secret to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET || 'your-secret-key-here'

export const maxDuration = 300 // 5 minutes
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  // Verify authorization
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  console.log('🔄 Starting price check cron job...')
  const startTime = Date.now()

  try {
    // Get all unique products that need checking
    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('id, url, platform, current_price, last_checked')
      .eq('is_active', true)
      .order('last_checked', { ascending: true, nullsFirst: true })
      .limit(100) // Process 100 products per run

    if (fetchError) throw fetchError

    console.log(`📦 Found ${products?.length || 0} products to check`)

    const results = {
      checked: 0,
      updated: 0,
      alerts_sent: 0,
      errors: 0,
      price_drops: [] as any[]
    }

    // Process each product
    for (const product of products || []) {
      try {
        // Scrape current price
        const scrapedData = await ProductScraper.scrape(product.url)
        results.checked++

        // Check if price changed
        const priceChanged = scrapedData.price !== product.current_price
        const priceDropped = scrapedData.price < product.current_price

        if (priceChanged) {
          // Update product in database
          const { error: updateError } = await supabase
            .from('products')
            .update({
              current_price: scrapedData.price,
              in_stock: scrapedData.in_stock,
              last_checked: new Date().toISOString(),
              name: scrapedData.title, // Update title in case it changed
              image_url: scrapedData.image
            })
            .eq('id', product.id)

          if (updateError) throw updateError

          // Add to price history
          await supabase
            .from('price_history')
            .insert({
              product_id: product.id,
              price: scrapedData.price,
              currency: scrapedData.currency,
              in_stock: scrapedData.in_stock,
              recorded_at: new Date().toISOString()
            })

          results.updated++

          if (priceDropped) {
            results.price_drops.push({
              product_id: product.id,
              old_price: product.current_price,
              new_price: scrapedData.price,
              savings: product.current_price - scrapedData.price
            })

            // Find all users tracking this product and send alerts
            const { data: trackers } = await supabase
              .from('user_tracking')
              .select(`
                *,
                user_profiles!inner (
                  id,
                  email,
                  full_name,
                  email_notifications
                )
              `)
              .eq('product_id', product.id)
              .eq('is_active', true)

            for (const tracker of trackers || []) {
              const shouldAlert = 
                tracker.notify_on_any_drop || 
                (tracker.target_price && scrapedData.price <= tracker.target_price)

              if (shouldAlert && tracker.user_profiles.email_notifications) {
                try {
                  await sendPriceDropEmail({
                    to: tracker.user_profiles.email,
                    userName: tracker.user_profiles.full_name,
                    productName: scrapedData.title,
                    oldPrice: product.current_price,
                    newPrice: scrapedData.price,
                    productUrl: product.url,
                    productImage: scrapedData.image
                  })

                  // Create notification record
                  await supabase
                    .from('notifications')
                    .insert({
                      user_id: tracker.user_profiles.id,
                      type: 'price_drop',
                      title: 'Price Drop Alert!',
                      message: `${scrapedData.title} dropped to $${scrapedData.price}`,
                      product_id: product.id,
                      metadata: {
                        old_price: product.current_price,
                        new_price: scrapedData.price,
                        savings: product.current_price - scrapedData.price
                      },
                      read: false
                    })

                  // Update user's alert count
                  await supabase.rpc('increment_alert_count', {
                    p_user_id: tracker.user_profiles.id
                  })

                  results.alerts_sent++
                } catch (emailError) {
                  console.error(`Failed to send alert to ${tracker.user_profiles.email}:`, emailError)
                }
              }
            }
          }
        } else {
          // Just update last_checked timestamp
          await supabase
            .from('products')
            .update({
              last_checked: new Date().toISOString(),
              in_stock: scrapedData.in_stock
            })
            .eq('id', product.id)
        }

      } catch (productError: any) {
        console.error(`Error checking product ${product.id}:`, productError.message)
        results.errors++

        // Log error for monitoring
        await supabase
          .from('error_logs')
          .insert({
            type: 'price_check_failed',
            product_id: product.id,
            error_message: productError.message,
            created_at: new Date().toISOString()
          })

        // If product consistently fails, mark as inactive
        const { data: errorCount } = await supabase
          .from('error_logs')
          .select('id', { count: 'exact' })
          .eq('product_id', product.id)
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

        if ((errorCount?.length || 0) >= 5) {
          await supabase
            .from('products')
            .update({ is_active: false })
            .eq('id', product.id)
        }
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    const duration = Date.now() - startTime

    console.log(`✅ Price check complete:`, {
      ...results,
      duration_ms: duration
    })

    // Track cron job execution
    await supabase
      .from('cron_logs')
      .insert({
        job_name: 'check_prices',
        status: 'success',
        products_checked: results.checked,
        products_updated: results.updated,
        alerts_sent: results.alerts_sent,
        errors: results.errors,
        duration_ms: duration,
        created_at: new Date().toISOString()
      })

    return NextResponse.json({
      success: true,
      results,
      duration_ms: duration
    })

  } catch (error: any) {
    console.error('❌ Cron job failed:', error)

    // Log failure
    await supabase
      .from('cron_logs')
      .insert({
        job_name: 'check_prices',
        status: 'failed',
        error_message: error.message,
        created_at: new Date().toISOString()
      })

    return NextResponse.json(
      { 
        success: false, 
        error: error.message 
      },
      { status: 500 }
    )
  }
}

// Manual trigger endpoint for testing (remove in production)
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  return GET(req)
}