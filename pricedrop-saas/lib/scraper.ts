// lib/scraper.ts
import axios from 'axios'
import * as cheerio from 'cheerio'

export interface ScrapedProduct {
  title: string
  price: number
  currency: string
  image: string
  in_stock: boolean
  platform: 'ebay' | 'amazon' | 'walmart' | 'unknown'
  original_price?: number
}

export class ProductScraper {
  private static readonly USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  private static readonly TIMEOUT = 10000
  
  /**
   * Main scraping function - detects platform and scrapes accordingly
   */
  static async scrape(url: string): Promise<ScrapedProduct> {
    const platform = this.detectPlatform(url)
    
    switch (platform) {
      case 'ebay':
        return this.scrapeEbay(url)
      case 'amazon':
        return this.scrapeAmazon(url)
      case 'walmart':
        return this.scrapeWalmart(url)
      default:
        return this.scrapeGeneric(url)
    }
  }

  /**
   * Detect platform from URL
   */
  private static detectPlatform(url: string): 'ebay' | 'amazon' | 'walmart' | 'unknown' {
    if (url.includes('ebay.com')) return 'ebay'
    if (url.includes('amazon.com')) return 'amazon'
    if (url.includes('walmart.com')) return 'walmart'
    return 'unknown'
  }

  /**
   * Scrape eBay product page
   */
  private static async scrapeEbay(url: string): Promise<ScrapedProduct> {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        timeout: this.TIMEOUT
      })

      const $ = cheerio.load(response.data)

      // Extract title
      const title = $('h1.x-item-title__mainTitle span').text().trim() ||
                    $('.it-ttl').text().trim() ||
                    $('h1').first().text().trim()

      // Extract price (multiple selectors for different layouts)
      let priceText = $('.x-price-primary span.ux-textspans').first().text() ||
                      $('.notranslate').first().text() ||
                      $('.vi-VR-cvipPrice').text() ||
                      $('.mainPrice').text()
      
      const price = this.parsePrice(priceText)

      // Extract original price if on sale
      const originalPriceText = $('.x-price-approx__price span').text() ||
                                 $('.vi-originalPrice').text()
      const original_price = originalPriceText ? this.parsePrice(originalPriceText) : price

      // Extract image
      const image = $('img.ux-image-magnify__image--original').attr('src') ||
                    $('img[id="icImg"]').attr('src') ||
                    $('.ux-image-carousel-item img').first().attr('src') ||
                    ''

      // Check stock status
      const availability = $('.d-shipping-minview').text() ||
                           $('.vi-acc-del-range').text() ||
                           $('.ux-action').text()
      const in_stock = !availability.toLowerCase().includes('out of stock')

      return {
        title,
        price,
        currency: 'USD',
        image,
        in_stock,
        platform: 'ebay',
        original_price: original_price !== price ? original_price : undefined
      }
    } catch (error: any) {
      console.error('eBay scraping error:', error.message)
      throw new Error(`Failed to scrape eBay product: ${error.message}`)
    }
  }

  /**
   * Scrape Amazon product page
   */
  private static async scrapeAmazon(url: string): Promise<ScrapedProduct> {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        timeout: this.TIMEOUT
      })

      const $ = cheerio.load(response.data)

      // Extract title
      const title = $('#productTitle').text().trim() ||
                    $('h1 span').first().text().trim()

      // Extract price
      let priceText = $('.a-price .a-offscreen').first().text() ||
                      $('#priceblock_ourprice').text() ||
                      $('#priceblock_dealprice').text() ||
                      $('.a-price-whole').first().text()
      
      const price = this.parsePrice(priceText)

      // Extract original price
      const originalPriceText = $('.a-text-price .a-offscreen').text() ||
                                 $('#priceblock_saleprice').text()
      const original_price = originalPriceText ? this.parsePrice(originalPriceText) : price

      // Extract image
      const image = $('#landingImage').attr('src') ||
                    $('.imgTagWrapper img').attr('src') ||
                    ''

      // Check stock status
      const availability = $('#availability span').text()
      const in_stock = availability.toLowerCase().includes('in stock')

      return {
        title,
        price,
        currency: 'USD',
        image,
        in_stock,
        platform: 'amazon',
        original_price: original_price !== price ? original_price : undefined
      }
    } catch (error: any) {
      console.error('Amazon scraping error:', error.message)
      throw new Error(`Failed to scrape Amazon product: ${error.message}`)
    }
  }

  /**
   * Scrape Walmart product page
   */
  private static async scrapeWalmart(url: string): Promise<ScrapedProduct> {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml',
        },
        timeout: this.TIMEOUT
      })

      const $ = cheerio.load(response.data)

      // Extract title
      const title = $('h1[itemprop="name"]').text().trim() ||
                    $('h1').first().text().trim()

      // Extract price
      const priceText = $('[itemprop="price"]').attr('content') ||
                        $('.price-characteristic').first().text()
      
      const price = this.parsePrice(priceText)

      // Extract image
      const image = $('.prod-hero-image img').attr('src') ||
                    $('img[data-testid="hero-image-carousel"]').attr('src') ||
                    ''

      // Check stock status  
      const stockText = $('[data-testid="fulfillment-badge"]').text() ||
                        $('.prod-ProductOffer-oosMsg').text()
      const in_stock = !stockText.toLowerCase().includes('out of stock')

      return {
        title,
        price,
        currency: 'USD',
        image,
        in_stock,
        platform: 'walmart',
        original_price: undefined
      }
    } catch (error: any) {
      console.error('Walmart scraping error:', error.message)
      throw new Error(`Failed to scrape Walmart product: ${error.message}`)
    }
  }

  /**
   * Generic scraper for unknown platforms
   */
  private static async scrapeGeneric(url: string): Promise<ScrapedProduct> {
    try {
      const response = await axios.get(url, {
        headers: { 'User-Agent': this.USER_AGENT },
        timeout: this.TIMEOUT
      })

      const $ = cheerio.load(response.data)

      // Try to find product info using common patterns
      const title = $('h1').first().text().trim() ||
                    $('[property="og:title"]').attr('content') ||
                    $('title').text().trim()

      // Look for price in common locations
      const priceSelectors = [
        '.price', '[itemprop="price"]', '.product-price',
        '[class*="price"]', '[id*="price"]'
      ]
      
      let priceText = ''
      for (const selector of priceSelectors) {
        priceText = $(selector).first().text() || $(selector).first().attr('content') || ''
        if (priceText) break
      }

      const price = this.parsePrice(priceText)

      // Try to find image
      const image = $('[property="og:image"]').attr('content') ||
                    $('img').first().attr('src') ||
                    ''

      return {
        title,
        price,
        currency: 'USD',
        image,
        in_stock: true, // Assume in stock for generic scraping
        platform: 'unknown'
      }
    } catch (error: any) {
      console.error('Generic scraping error:', error.message)
      throw new Error(`Failed to scrape product: ${error.message}`)
    }
  }

  /**
   * Parse price from string - handles various formats
   */
  private static parsePrice(priceText: string): number {
    if (!priceText) return 0

    // Remove currency symbols, commas, and spaces
    const cleaned = priceText
      .replace(/[$£€¥,\s]/g, '')
      .replace(/[^\d.]/g, '')

    const price = parseFloat(cleaned)
    
    return isNaN(price) ? 0 : price
  }

  /**
   * Validate URL before scraping
   */
  static isValidUrl(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }
}

/**
 * Quick function to check if a product is available for scraping
 */
export async function canScrapeUrl(url: string): Promise<boolean> {
  if (!ProductScraper.isValidUrl(url)) return false
  
  try {
    await axios.head(url, { 
      timeout: 5000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })
    return true
  } catch {
    return false
  }
}

/**
 * Extract product ID from URL
 */
export function extractProductId(url: string): string | null {
  try {
    const urlObj = new URL(url)
    
    // eBay: /itm/123456789
    if (url.includes('ebay.com')) {
      const match = url.match(/\/itm\/(\d+)/)
      return match ? match[1] : null
    }
    
    // Amazon: /dp/B0ABCD1234
    if (url.includes('amazon.com')) {
      const match = url.match(/\/dp\/([A-Z0-9]+)/)
      return match ? match[1] : null
    }
    
    // Generic: use pathname as ID
    return urlObj.pathname
  } catch {
    return null
  }
}