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
            store_id: currentStoreId,
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
// دعم Multi-Tenant (متاجر متعددة)
// ============================================
let currentStoreId = '00000000-0000-0000-0000-000000000001'

async function switchStore(storeId) {
  currentStoreId = storeId

  if (dashboard) {
    dashboard.liveInventory = {}
    await dashboard.loadStoreInventory(storeId)
    dashboard.updateChart()
    dashboard.updateMetrics()
    const storeName = document.getElementById('storeSelector')?.selectedOptions[0]?.text || 'متجر جديد'
    dashboard.addLocalLog(`🏪 تم التبديل إلى ${storeName}`, 'info')
  }

  if (storeCanvas) {
    storeCanvas.products = []
    storeCanvas.stats.totalSold = 0
    storeCanvas.stats.lastMinuteSales = []

    for (const [sku] of Object.entries(PRODUCT_CONFIGS)) {
      const stock = dashboard?.liveInventory?.[sku]?.stock || 20
      storeCanvas.addProducts(sku, stock)
    }
  }
}

// ============================================
// تصدير تقرير PDF
// ============================================
async function exportPDFReport() {
  const { jsPDF } = window.jspdf
  const doc = new jsPDF('p', 'mm', 'a4')

  doc.setR2L(true)

  doc.setFontSize(22)
  doc.setTextColor(78, 205, 196)
  doc.text('Smart Store Solutions', 105, 20, { align: 'center' })

  doc.setFontSize(14)
  doc.setTextColor(100, 100, 100)
  doc.text('تقرير حالة المخزون الذكي', 105, 30, { align: 'center' })

  doc.setFontSize(10)
  doc.setTextColor(150, 150, 150)
  doc.text(`تاريخ التقرير: ${new Date().toLocaleDateString('ar-SA')} | الوقت: ${new Date().toLocaleTimeString('ar-SA')}`, 105, 38, { align: 'center' })

  doc.setDrawColor(78, 205, 196)
  doc.setLineWidth(0.5)
  doc.line(15, 42, 195, 42)

  doc.setFontSize(14)
  doc.setTextColor(30, 30, 50)
  doc.text('ملخص المؤشرات', 15, 52)

  const totalStock = document.getElementById('totalStock')?.textContent || '0'
  const totalSales = document.getElementById('totalSales')?.textContent || '0'
  const salesVelocity = document.getElementById('salesVelocity')?.textContent || '0'
  const totalOrders = document.getElementById('totalOrders')?.textContent || '0'

  doc.setFontSize(11)
  doc.setTextColor(60, 60, 80)
  const metrics = [
    `إجمالي المخزون الحالي: ${totalStock} وحدة`,
    `إجمالي المبيعات: ${totalSales} عملية`,
    `معدل البيع: ${salesVelocity} وحدة/دقيقة`,
    `أوامر الشراء التلقائية: ${totalOrders} أمر`
  ]

  let y = 62
  metrics.forEach(metric => {
    doc.text(`• ${metric}`, 20, y)
    y += 8
  })

  y += 8
  doc.setFontSize(14)
  doc.setTextColor(30, 30, 50)
  doc.text('حالة المنتجات', 15, y)

  y += 10
  doc.setFillColor(78, 205, 196)
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(10)
  doc.rect(15, y, 180, 8, 'F')
  doc.text('المنتج', 25, y + 5.5)
  doc.text('المخزون', 90, y + 5.5)
  doc.text('نقطة الطلب', 130, y + 5.5)
  doc.text('الحالة', 170, y + 5.5)

  y += 12
  doc.setTextColor(60, 60, 80)

  for (const [sku, config] of Object.entries(PRODUCT_CONFIGS)) {
    const stock = dashboard?.liveInventory?.[sku]?.stock || 0
    const reorderPoint = dashboard?.liveInventory?.[sku]?.reorderPoint || 20

    let statusText = '✅ آمن'
    if (stock <= reorderPoint) statusText = '⚠️ منخفض'
    if (stock <= 5) statusText = '🔴 خطر'

    doc.setFontSize(9)
    doc.text(`${config.emoji} ${config.nameAr}`, 25, y + 5)
    doc.text(`${stock}`, 95, y + 5, { align: 'center' })
    doc.text(`${reorderPoint}`, 135, y + 5, { align: 'center' })
    doc.text(statusText, 175, y + 5, { align: 'center' })

    doc.setDrawColor(220, 220, 220)
    doc.line(15, y + 8, 195, y + 8)

    y += 10
  }

  y += 15
  doc.setFontSize(9)
  doc.setTextColor(150, 150, 150)
  doc.text('تم إنشاء هذا التقرير تلقائياً بواسطة Smart Retail AI Agent', 105, y, { align: 'center' })
  doc.text('© 2026 Smart Store Solutions - جميع الحقوق محفوظة', 105, y + 6, { align: 'center' })
  doc.text('نظام Closed-Loop Automation للإدارة الذكية للمخزون', 105, y + 12, { align: 'center' })

  const filename = `تقرير_المخزون_${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(filename)

  if (dashboard) {
    dashboard.addLocalLog('📄 تم تصدير تقرير PDF بنجاح', 'success')
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
window.exportPDFReport = exportPDFReport
window.switchStore = switchStore
window.storeCanvas = storeCanvas
window.dashboard = dashboard
