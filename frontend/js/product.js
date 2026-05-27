/**
 * Smart Retail AI Canvas - Product Class
 * تمثل كل كرة منتجاً في المتجر
 * Version: 1.0
 */

class Product {
  /**
   * @param {string} sku - رمز المنتج
   * @param {number} x - الإحداثي الأفقي (اختياري)
   * @param {number} y - الإحداثي الرأسي (اختياري)
   */
  constructor(sku, x = null, y = null) {
    this.sku = sku
    this.config = PRODUCT_CONFIGS[sku]
    
    if (!this.config) {
      console.warn(`Unknown product SKU: ${sku}`)
      this.config = {
        name: 'Unknown',
        emoji: '📦',
        color: '#888888',
        size: 15,
        price: 0
      }
    }
    
    // الموقع
    this.x = x ?? Math.random() * (canvas?.width || CANVAS_CONFIG.width)
    this.y = y ?? Math.random() * -150 // يبدأ من فوق الشاشة
    
    // السرعة
    this.vx = (Math.random() - 0.5) * 2.5 // سرعة أفقية عشوائية
    this.vy = 0                            // سرعة رأسية (تبدأ من الصفر)
    
    // الخصائص
    this.size = this.config.size
    this.color = this.config.color
    this.gravity = CANVAS_CONFIG.gravity * (0.8 + Math.random() * 0.4) // اختلاف بسيط في الجاذبية
    this.bounceFactor = 0.6 // معامل الارتداد عن الجدران
    this.friction = 0.995   // احتكاك الهواء
    
    // الحالة
    this.sold = false
    this.sellAnimation = 0  // 0 إلى 1 (لرسوم متحركة عند البيع)
    this.opacity = 1
    this.scale = 1
    this.rotation = Math.random() * Math.PI * 2
    this.rotationSpeed = (Math.random() - 0.5) * 0.02
    
    // معرف فريد
    this.id = `${sku}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
  }
  
  /**
   * تحديث حالة المنتج (الموقع، السرعة)
   */
  update() {
    if (this.sold) {
      // رسوم متحركة عند البيع
      this.sellAnimation += 0.05
      this.opacity = Math.max(0, 1 - this.sellAnimation)
      this.scale = 1 + this.sellAnimation * 0.5
      return
    }
    
    // تطبيق الجاذبية
    this.vy += this.gravity
    
    // تطبيق الاحتكاك
    this.vx *= this.friction
    
    // تحديث الموقع
    this.x += this.vx
    this.y += this.vy
    
    // الدوران
    this.rotation += this.rotationSpeed
    
    // الاصطدام بالجدران الجانبية
    const canvasWidth = canvas?.width || CANVAS_CONFIG.width
    if (this.x <= this.size) {
      this.x = this.size
      this.vx *= -this.bounceFactor
    } else if (this.x >= canvasWidth - this.size) {
      this.x = canvasWidth - this.size
      this.vx *= -this.bounceFactor
    }
  }
  
  /**
   * رسم المنتج على Canvas
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    if (this.opacity <= 0) return
    
    ctx.save()
    
    // تطبيق الشفافية والحجم
    ctx.globalAlpha = this.opacity
    ctx.translate(this.x, this.y)
    ctx.scale(this.scale, this.scale)
    ctx.rotate(this.rotation)
    
    // تأثير الظل الخارجي
    ctx.shadowColor = this.color
    ctx.shadowBlur = this.sold ? 20 : 12
    
    // رسم الدائرة الرئيسية
    const gradient = ctx.createRadialGradient(
      -this.size * 0.3, -this.size * 0.3, this.size * 0.1,
      0, 0, this.size
    )
    gradient.addColorStop(0, this.lightenColor(this.color, 40))
    gradient.addColorStop(0.7, this.color)
    gradient.addColorStop(1, this.darkenColor(this.color, 30))
    
    ctx.beginPath()
    ctx.arc(0, 0, this.size, 0, Math.PI * 2)
    ctx.fillStyle = gradient
    ctx.fill()
    
    // حدود خفيفة
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'
    ctx.lineWidth = 1.5
    ctx.stroke()
    
    // إعادة تعيين الظل للنص
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    
    // كتابة الإيموجي
    ctx.fillStyle = 'white'
    ctx.font = `${this.size * 1.2}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(this.config.emoji, 0, 1)
    
    ctx.restore()
  }
  
  /**
   * تنفيذ عملية البيع
   */
  sell() {
    if (this.sold) return
    this.sold = true
    this.vx = 0
    this.vy = 0
  }
  
  /**
   * التحقق من ملامسة أرضية Checkout
   * @param {number} floorY - ارتفاع خط Checkout
   * @returns {boolean}
   */
  isOnFloor(floorY) {
    return !this.sold && this.y >= floorY - this.size
  }
  
  /**
   * تفتيح لون
   */
  lightenColor(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16)
    const amt = Math.round(2.55 * percent)
    const R = Math.min(255, (num >> 16) + amt)
    const G = Math.min(255, ((num >> 8) & 0x00FF) + amt)
    const B = Math.min(255, (num & 0x0000FF) + amt)
    return `rgb(${R}, ${G}, ${B})`
  }
  
  /**
   * تغميق لون
   */
  darkenColor(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16)
    const amt = Math.round(2.55 * percent)
    const R = Math.max(0, (num >> 16) - amt)
    const G = Math.max(0, ((num >> 8) & 0x00FF) - amt)
    const B = Math.max(0, (num & 0x0000FF) - amt)
    return `rgb(${R}, ${G}, ${B})`
  }
}

// تصدير للاستخدام في ملفات أخرى
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Product
}
