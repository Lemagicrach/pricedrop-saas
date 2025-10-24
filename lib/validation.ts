import { z } from 'zod'

/**
 * Product tracking schema
 * Validates product tracking preferences
 */
export const trackProductSchema = z.object({
  notify_on_drop: z.boolean().default(true),
})

/**
 * User profile update schema
 * Validates user profile information
 */
export const updateProfileSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address').optional(),
  phone: z.string().optional(),
  notification_preferences: z.object({
    email_alerts: z.boolean().default(true),
    sms_alerts: z.boolean().default(false),
    push_notifications: z.boolean().default(true),
  }).optional(),
})

/**
 * Product schema for adding new products to track
 */
export const addProductSchema = z.object({
  url: z.string().url('Invalid URL'),
  name: z.string().min(1, 'Product name is required'),
  target_price: z.number().positive('Target price must be positive').optional(),
  current_price: z.number().positive('Current price must be positive'),
  notify_on_drop: z.boolean().default(true),
})

/**
 * Price alert schema
 */
export const priceAlertSchema = z.object({
  product_id: z.string(),
  threshold_type: z.enum(['percentage', 'fixed']),
  threshold_value: z.number().positive(),
  is_active: z.boolean().default(true),
})

// Type exports for TypeScript
export type TrackProductInput = z.infer<typeof trackProductSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type AddProductInput = z.infer<typeof addProductSchema>
export type PriceAlertInput = z.infer<typeof priceAlertSchema>
