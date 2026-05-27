/**
 * Smart Retail AI Canvas - Canvas Manager
 * إدارة المحاكاة الفيزيائية للمتجر
 * Version: 1.0
 */

class StoreCanvas {
  constructor() {
    this.canvas = document.getElementById('storeCanvas')
    this.ctx = this.canvas.getContext('2d')
    this.products = []
    this.animationId = null
    this.isRunning = false
    this.stats = {
      totalSold: 0,
      salesPerMinute: 0,
      lastMinuteSales: []
    }
    
    // ضبط حجم Canvas
    this.resize()
    window.addEventListener('resize', () => this.resize())
    
    // خصائص المتجر
    this.floorY = this.canvas.height - CANVAS_CONFIG.floorOffset
    this.checkoutLinePulse = 0
  }
  
  /**
   * ضبط حجم Canvas ليناسب النافذة
   */
  resize() {
    const parent = this.canvas.parentElement
    this.canvas.width = parent.clientWidth
    this.canvas.height = parent.clientHeight
    this.floorY = this.canvas.height - CANVAS_CONFIG.floorOffset
  }
  
  /**
   * بدء المحاكاة
   */
  start() {
    if (this.isRunning) return
    this.isRunning = true
    this.animate()
    console.log('🏪 Store simulation started')
  }
  
  /**
   * إيقاف المحاكاة
   */
  stop() {
    this.isRunning = false
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
    console.log('🏪 Store simulation stopped')
  }
  
  /**
   * إضافة منتجات جديدة للـ Canvas
   * @param {string} sku - رمز المنتج
   * @param {number} quantity - الكمية
   */
  addProducts(sku, quantity) {
    const config = PRODUCT_CONFIGS[sku]
    if (!config) {
      console.warn(`Cannot add products: Unknown SKU ${sku}`)
      return
    }
    
    for (let i = 0; i < quantity; i++) {
      // إضافة المنتجات من أعلى الشاشة مع تأخير بسيط
      setTimeout(() => {
        const product = new Product(sku)
        this.products.push(product)
      }, i * 50) // تأخير 50ms بين كل كرة وأخرى
    }
    
    console.log(`📦 Added ${quantity} ${config.emoji} ${config.name} to canvas`)
  }
  
  /**
   * معالجة بيع منتج
   * @param {Product} product
   */
  async processSale(product) {
    if (product.sold) return
    
    // تحديث الإحصائيات
    this.stats.totalSold++
    const now = Date.now()
    this.stats.lastMinuteSales.push(now)
    
    // إزالة المبيعات الأقدم من دقيقة
    this.stats.lastMinuteSales = this.stats.lastMinuteSales.filter(
      time => now - time < 60000
    )
    this.stats.salesPerMinute = this.stats.lastMinuteSales.length
    
    // تحديث المخزون في قاعدة البيانات
    try {
      if (typeof supabase !== 'undefined') {
        // استدعاء دالة process_sale المخزنة
        const { data, error } = await supabase.rpc('process_sale', {
          p_product_id: product.sku,
          p_quantity: 1,
          p_price: product.config.price
        })
        
        if (error) {
          console.error('Sale processing error:', error.message)
        } else if (data?.success) {
          // تحريك المنتج (بيع)
          product.sell()
          
          // إزالة المنتج بعد انتهاء الرسم المتحرك
          setTimeout(() => {
            this.products = this.products.filter(p => p !== product)
          }, 500)
        }
      } else {
        // وضع المحاكاة (بدون قاعدة بيانات)
        product.sell()
        setTimeout(() => {
          this.products = this.products.filter(p => p !== product)
        }, 500)
      }
    } catch (error) {
      console.error('Sale error:', error)
    }
  }
  
  /**
   * رسم خلفية المتجر
   */
  drawBackground() {
    const ctx = this.ctx
    const w = this.canvas.width
    const h = this.canvas.height
    
    // تدرج الخلفية
    const bgGradient = ctx.createRadialGradient(w / 2, h / 3, 0, w / 2, h / 2, w * 0.8)
    bgGradient.addColorStop(0, '#1a1a2e')
    bgGradient.addColorStop(1, '#0a0a1a')
    ctx.fillStyle = bgGradient
    ctx.fillRect(0, 0, w, h)
    
    // شبكة خفيفة (تأثير الأرضية)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)'
    ctx.lineWidth = 1
    const gridSize = 40
    for (let x = 0; x < w; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
      ctx.stroke()
    }
    for (let y = 0; y < h; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
      ctx.stroke()
    }
  }
  
  /**
   * رسم خط Checkout
   */
  drawCheckoutLine() {
    const ctx = this.ctx
    const y = this.floorY
    
    // نبض الخط
    this.checkoutLinePulse += 0.02
    const pulseAlpha = 0.6 + Math.sin(this.checkoutLinePulse) * 0.2
    
    // ظل الخط
    ctx.save()
    ctx.shadowColor = 'rgba(255, 0, 0, 0.5)'
    ctx.shadowBlur = 15
    
    // الخط الرئيسي
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(this.canvas.width, y)
    ctx.strokeStyle = '#ff3333'
    ctx.lineWidth = 3
    ctx.setLineDash([15, 8])
    ctx.stroke()
    ctx.setLineDash([])
    
    ctx.restore()
    
    // خط متوهج أعلى الخط الرئيسي
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(this.canvas.width, y)
    ctx.strokeStyle = `rgba(255, 50, 50, ${pulseAlpha})`
    ctx.lineWidth = 8
    ctx.stroke()
    
    // نص Checkout
    ctx.fillStyle = '#ff4444'
    ctx.font = 'bold 16px "Segoe UI", "Cairo", sans-serif'
    ctx.textAlign = 'right'
    
    // خلفية النص
    const text = '🛒 نقطة البيع - Checkout'
    const textWidth = ctx.measureText(text).width + 20
    ctx.fillStyle = 'rgba(10, 10, 26, 0.8)'
    ctx.fillRect(10, y - 30, textWidth, 25)
    
    // النص
    ctx.fillStyle = '#ff6666'
    ctx.fillText(text, 25, y - 12)
  }
  
  /**
   * رسم معلومات المتجر
   */
  drawStoreInfo() {
    const ctx = this.ctx
    
    // عدد المنتجات المعروضة
    const activeProducts = this.products.filter(p => !p.sold).length
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
    ctx.font = '14px "Segoe UI", sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(`📦 المنتجات: ${activeProducts}`, 15, 30)
    ctx.fillText(`💰 المبيعات: ${this.stats.totalSold}`, 15, 55)
    ctx.fillText(`📊 معدل البيع: ${this.stats.salesPerMinute}/دقيقة`, 15, 80)
  }
  
  /**
   * حلقة الرسم الرئيسية
   */
  animate() {
    if (!this.isRunning) return
    
    const ctx = this.ctx
    
    // مسح الشاشة
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    
    // رسم الخلفية
    this.drawBackground()
    
    // تحديث ورسم المنتجات
    const productsToRemove = []
    
    for (const product of this.products) {
      product.update()
      product.draw(ctx)
      
      // التحقق من ملامسة خط Checkout
      if (product.isOnFloor(this.floorY)) {
        this.processSale(product)
      }
      
      // إزالة المنتجات المباعة بعد انتهاء الرسم المتحرك
      if (product.sold && product.sellAnimation >= 1) {
        productsToRemove.push(product)
      }
    }
    
    // إزالة المنتجات المنتهية
    this.products = this.products.filter(p => !productsToRemove.includes(p))
    
    // رسم خط Checkout
    this.drawCheckoutLine()
    
    // رسم معلومات المتجر
    this.drawStoreInfo()
    
    // متابعة الحلقة
    this.animationId = requestAnimationFrame(() => this.animate())
  }
}

// إنشاء نسخة عامة
let storeCanvas = null

function initStoreCanvas() {
  storeCanvas = new StoreCanvas()
  storeCanvas.start()
  return storeCanvas
}

// تصدير
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { StoreCanvas, initStoreCanvas, storeCanvas }
}
