import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = headers().get('stripe-signature')
if (!signature) {
  return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
}

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (error: any) {
    console.error('Webhook signature verification failed:', error.message)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        
        // Get the customer email and metadata
        const customerId = session.customer as string
        const userId = session.metadata?.userId
        
        if (!userId) {
          console.error('No userId in session metadata')
          break
        }

        // Determine the plan based on the price
        let plan = 'free'
        if (session.amount_total) {
          if (session.amount_total === 999) plan = 'pro'
          else if (session.amount_total === 2999) plan = 'ultra'
          else if (session.amount_total === 14999) plan = 'mega'
        }

        // Update user profile
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({
            plan,
            stripe_customer_id: customerId,
            stripe_subscription_id: session.subscription as string,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)

        if (updateError) {
          console.error('Failed to update user profile:', updateError)
        }

        // Update the API user's plan too
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('email')
          .eq('id', userId)
          .single()

        if (profile) {
          await supabase
            .from('api_users')
            .update({
              plan,
              credits_limit: plan === 'pro' ? 1000 : plan === 'ultra' ? 10000 : plan === 'mega' ? 50000 : 100,
              updated_at: new Date().toISOString()
            })
            .eq('email', profile.email)
        }

        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        
        // Get the price ID to determine the plan
        const priceId = subscription.items.data[0]?.price.id
        let plan = 'free'
        
        if (priceId === process.env.STRIPE_PRICE_PRO_MONTHLY) plan = 'pro'
        else if (priceId === process.env.STRIPE_PRICE_ULTRA_MONTHLY) plan = 'ultra'
        else if (priceId === process.env.STRIPE_PRICE_MEGA_MONTHLY) plan = 'mega'

        // Update user profile
        const { error } = await supabase
          .from('user_profiles')
          .update({
            plan,
            stripe_subscription_id: subscription.id,
            subscription_status: subscription.status,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('stripe_customer_id', subscription.customer as string)

        if (error) {
          console.error('Failed to update subscription:', error)
        }
        
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        
        // Downgrade to free plan
        const { error } = await supabase
          .from('user_profiles')
          .update({
            plan: 'free',
            subscription_status: 'canceled',
            updated_at: new Date().toISOString()
          })
          .eq('stripe_customer_id', subscription.customer as string)

        if (error) {
          console.error('Failed to cancel subscription:', error)
        }
        
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        
        // Log successful payment
        console.log('Payment succeeded for customer:', invoice.customer)
        
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        
        // Handle failed payment
        console.error('Payment failed for customer:', invoice.customer)
        
        // You could send an email notification here
        
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed', details: error.message },
      { status: 500 }
    )
  }
}
