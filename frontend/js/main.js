/**
 * Smart Retail AI Canvas - Main Entry Point
 * نقطة البداية الرئيسية للتطبيق
 * Version: 1.0
 */

// ============================================
// تهيئة Supabase Client
// ============================================
let supabase = null

function initSupabase() {
  if (SUPABASE_CONFIG.url === 'YOUR_SUPABASE_URL') {
    console.warn('⚠️  Please configure SUPABASE_CONFIG in config.js')
    console.log('📋 Running in simulation mode (no database connection)')
    return null
  }
  
  try {
    supabase = window.supabase.createClient(
      SUPABASE_CONFIG.url,
      SUPABASE_CONFIG.anonKey
    )
    console.log('✅ Supabase connected')
    return supabase
  } catch (error) {
    console.error('❌ Supabase connection failed:', error.message)
    return null
  }
}

// ============================================
// أزرار التحكم اليدوي
// ============================================
async function manualRestock(sku) {
  const config = PRODUCT_CONFIGS[sku]
  if (!config) {
    console.warn(`Unknown product: ${sku}`)
    return
  }
  
  const quantity = 30
  
  // تحديث قاعدة البيانات
  if (supabase) {
    try {
      // جلب المخزون الحالي
      const { data: inv } = await supabase
        .from('inventory')
        .select('stock_level, max_capacity')
        .eq('product_id', sku)
        .single()
      
      if (inv) {
        const newStock = Math.min(inv.stock_level + quantity, inv.max_capacity)
        
        await supabase
          .from('inventory')
          .update({
            stock_level: newStock,
            last_restock_at: new Date().toISOString()
          })
          .eq('product_id', sku)
        
        // تسجيل العملية
        await supabase
          .from('agent_logs')
          .insert({
            sku_id: sku,
            log_level: 'success',
            action: 'MANUAL_RESTOCK',
            details: `🛒 توريد يدوي: +${quantity} ${config.emoji} ${config.nameAr}`
          })
        
        console.log(`✅ Manual restock: ${sku} +${quantity}`)
      }
    } catch (error) {
      console.error('Restock error:', error)
    }
  }
  
  // إضافة للـ Canvas
  if (storeCanvas) {
    storeCanvas.addProducts(sku, quantity)
  }
  
  // تحديث Dashboard
  if (dashboard) {
    dashboard.addLocalLog(
      `🛒 توريد يدوي: +${quantity} ${config.emoji} ${config.nameAr}`,
      'success'
    )
  }
}

// ============================================
// بدء التشغيل
// ============================================
async function initApp() {
  console.log('🚀 Starting Smart Retail AI Canvas...')
  console.log('')
  
  // تهيئة Supabase
  initSupabase()
  
  // تهيئة Dashboard
  initDashboard()
  
  // تهيئة Canvas
  initStoreCanvas()
  
  // إضافة منتجات أولية
  const initialStock = 30
  for (const [sku, config] of Object.entries(PRODUCT_CONFIGS)) {
    // إضافة تأخير بين كل منتج والآخر
    await new Promise(resolve => setTimeout(resolve, 300))
    
    if (storeCanvas) {
      storeCanvas.addProducts(sku, initialStock)
    }
  }
  
  // تحديث Dashboard بعد التحميل
  if (dashboard) {
    dashboard.updateMetrics()
    dashboard.addLocalLog('🏪 بدء محاكاة المتجر الذكي', 'info')
    
    if (supabase) {
      dashboard.addLocalLog('📡 الاتصال بقاعدة البيانات - Real-time Sync', 'success')
    } else {
      dashboard.addLocalLog('⚠️  وضع المحاكاة - بدون اتصال بقاعدة البيانات', 'warning')
    }
  }
  
  console.log('')
  console.log('✅ Smart Retail AI Canvas is ready!')
  console.log('🛒 Watch products fall and get sold at checkout')
  console.log('🤖 AI Agent monitors stock levels 24/7')
  console.log('')
}

// ============================================
// معالجة الأخطاء العامة
// ============================================
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error)
  if (dashboard) {
    dashboard.addLocalLog(`❌ خطأ: ${event.error?.message || 'Unknown error'}`, 'critical')
  }
})

// ============================================
// بدء التطبيق عند تحميل الصفحة
// ============================================
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp)
} else {
  initApp()
}

// ============================================
// تصدير الدوال العامة للاستخدام في HTML
// ============================================
window.manualRestock = manualRestock
window.storeCanvas = storeCanvas
window.dashboard = dashboard
