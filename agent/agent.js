#!/usr/bin/env node

/**
 * Smart Store AI Agent v3.0
 * Autonomous Inventory Management System
 * 
 * المهام:
 * 1. مراقبة المخزون في الوقت الحقيقي
 * 2. التنبؤ بالطلب باستخدام GPT-4o Mini
 * 3. إنشاء أوامر شراء تلقائية
 * 4. إرسال Heartbeat كل 30 ثانية
 */

import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import 'dotenv/config'

// ============================================
// التحقق من المتغيرات البيئية
// ============================================
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY']
const missingVars = requiredEnvVars.filter(varName => !process.env[varName])

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars.join(', '))
  console.error('Please copy .env.example to .env and fill in the values')
  process.exit(1)
}

// ============================================
// تهيئة الخدمات
// ============================================
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// تهيئة OpenAI (اختياري)
let openai = null
if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'sk-...') {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  })
  console.log('🧠 OpenAI GPT-4o Mini enabled for intelligent predictions')
} else {
  console.log('⚠️  OpenAI API key not configured, using fallback calculations')
}

// ============================================
// الإعدادات
// ============================================
const CONFIG = {
  HEARTBEAT_INTERVAL: parseInt(process.env.AGENT_HEARTBEAT_INTERVAL) || 30000,
  LOG_LEVEL: process.env.AGENT_LOG_LEVEL || 'info',
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000
}

// ============================================
// دوال مساعدة
// ============================================

/**
 * تسجيل نشاط الوكيل في قاعدة البيانات
 */
async function logActivity(skuId, action, details, level = 'info', data = {}) {
  try {
    const { error } = await supabase
      .from('agent_logs')
      .insert({
        sku_id: skuId,
        log_level: level,
        action: action,
        details: details,
        data: data
      })
    
    if (error) {
      console.error('❌ Failed to log activity:', error.message)
    }
  } catch (err) {
    console.error('❌ Log activity error:', err.message)
  }
}

/**
 * إنشاء أمر شراء تلقائي
 */
async function createRestockOrder(productId, quantity, reasoning) {
  try {
    const { data, error } = await supabase
      .from('purchase_orders')
      .insert({
        product_id: productId,
        quantity_ordered: quantity,
        status: 'pending',
        ai_prediction: reasoning
      })
      .select()
      .single()
    
    if (error) {
      console.error(`❌ Failed to create order for ${productId}:`, error.message)
      return null
    }
    
    console.log(`📦 Order #${data.id.substring(0, 8)}: ${quantity} units of ${productId}`)
    return data
  } catch (err) {
    console.error('❌ Create order error:', err.message)
    return null
  }
}

/**
 * الحساب الاحتياطي (بدون AI)
 */
function fallbackPrediction(stockLevel, salesVelocity, maxCapacity) {
  const secondsToEmpty = salesVelocity > 0 
    ? Math.floor(stockLevel / salesVelocity)
    : 999999
  
  const orderQty = Math.min(
    Math.max(30, maxCapacity - stockLevel),
    maxCapacity
  )
  
  return {
    seconds_to_empty: secondsToEmpty,
    order_qty: orderQty,
    reasoning: `حساب احتياطي: المعدل ${salesVelocity.toFixed(2)} وحدة/ثانية، سيتم النفاد خلال ${secondsToEmpty} ثانية`
  }
}

/**
 * التنبؤ الذكي باستخدام GPT-4o Mini
 */
async function aiPrediction(productId, productName, stockLevel, salesVelocity, reorderPoint) {
  if (!openai) {
    return fallbackPrediction(stockLevel, salesVelocity, 100)
  }
  
  const prompt = `أنت خبير إدارة مخزون في متجر تجزئة ذكي.

المنتج: ${productName} (${productId})
المخزون الحالي: ${stockLevel} وحدة
نقطة إعادة الطلب: ${reorderPoint} وحدة
معدل البيع: ${salesVelocity.toFixed(2)} وحدة/ثانية

المطلوب:
1. احسب الوقت المتبقي حتى نفاد المخزون (بالثواني)
2. اقترح الكمية المثلى للطلب لتغطية 7 أيام عمل
3. قدم تبريراً مختصراً للقرار

أجب بصيغة JSON فقط:
{
  "seconds_to_empty": number,
  "order_qty": number,
  "reasoning": "شرح مختصر بالعربية"
}`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 300
    })
    
    const decision = JSON.parse(response.choices[0].message.content)
    
    // التحقق من صحة القيم
    if (typeof decision.seconds_to_empty !== 'number' || typeof decision.order_qty !== 'number') {
      throw new Error('Invalid AI response format')
    }
    
    return decision
  } catch (error) {
    console.error('❌ AI prediction failed:', error.message)
    console.log('🔄 Falling back to calculation-based prediction')
    return fallbackPrediction(stockLevel, salesVelocity, 100)
  }
}

/**
 * جلب اسم المنتج
 */
async function getProductName(productId) {
  try {
    const { data } = await supabase
      .from('products')
      .select('name')
      .eq('id', productId)
      .single()
    
    return data?.name || productId
  } catch {
    return productId
  }
}

/**
 * دالة إعادة المحاولة مع تأخير
 */
async function withRetry(fn, retries = CONFIG.MAX_RETRIES) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn()
    } catch (error) {
      if (i === retries - 1) throw error
      console.log(`🔄 Retry ${i + 1}/${retries} after error: ${error.message}`)
      await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY * (i + 1)))
    }
  }
}

// ============================================
// المراقب الرئيسي للمخزون
// ============================================

async function startInventoryMonitor() {
  console.log('📡 Starting inventory monitor...')
  
  const channel = supabase
    .channel('inventory-monitor')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'inventory'
      },
      async (payload) => {
        const newItem = payload.new
        const oldItem = payload.old
        
        // تجاهل التحديثات التي لا تغير المخزون
        if (newItem.stock_level === oldItem.stock_level) return
        
        const productName = await getProductName(newItem.product_id)
        
        console.log(`📦 ${productName}: ${oldItem.stock_level} → ${newItem.stock_level}`)
        
        // التحقق من الوصول لنقطة إعادة الطلب
        const reachedReorderPoint = newItem.stock_level <= newItem.reorder_point
        const wasAboveReorderPoint = oldItem.stock_level > oldItem.reorder_point
        
        if (reachedReorderPoint && wasAboveReorderPoint) {
          console.log(`⚠️  LOW STOCK: ${productName} (${newItem.stock_level} units)`)
          
          // تسجيل الإنذار
          await logActivity(
            newItem.product_id,
            'LOW_STOCK_ALERT',
            `المخزون انخفض إلى ${newItem.stock_level} (نقطة إعادة الطلب: ${newItem.reorder_point})`,
            'warning',
            { stock_level: newItem.stock_level, reorder_point: newItem.reorder_point }
          )
          
          // التنبؤ بالطلب
          console.log('🧠 Analyzing demand...')
          const prediction = await aiPrediction(
            newItem.product_id,
            productName,
            newItem.stock_level,
            newItem.sales_velocity,
            newItem.reorder_point
          )
          
          console.log(`⏱️  Time to empty: ${prediction.seconds_to_empty}s`)
          console.log(`📊 Recommended order: ${prediction.order_qty} units`)
          console.log(`💡 Reasoning: ${prediction.reasoning}`)
          
          // تسجيل قرار الـ AI
          await logActivity(
            newItem.product_id,
            'AI_PREDICTION',
            prediction.reasoning,
            'info',
            prediction
          )
          
          // إنشاء أمر الشراء
          const order = await createRestockOrder(
            newItem.product_id,
            prediction.order_qty,
            prediction.reasoning
          )
          
          if (order) {
            await logActivity(
              newItem.product_id,
              'ORDER_CREATED',
              `تم إنشاء أمر شراء #${order.id.substring(0, 8)} لـ ${prediction.order_qty} وحدة`,
              'success',
              { order_id: order.id, quantity: prediction.order_qty }
            )
            
            // تنفيذ الأمر تلقائياً (محاكاة وصول المورد)
            setTimeout(async () => {
              await withRetry(async () => {
                const { error } = await supabase.rpc('fulfill_purchase_order', {
                  p_order_id: order.id
                })
                
                if (error) {
                  console.error('❌ Failed to fulfill order:', error.message)
                  throw error
                }
                
                console.log(`✅ Order #${order.id.substring(0, 8)} fulfilled automatically`)
                
                await logActivity(
                  newItem.product_id,
                  'ORDER_FULFILLED',
                  `تم استلام أمر الشراء #${order.id.substring(0, 8)}`,
                  'success'
                )
              })
            }, 5000) // تأخير 5 ثواني لمحاكاة وقت التوريد
          }
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Inventory monitor subscribed successfully')
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Channel error, will retry...')
      } else if (status === 'TIMED_OUT') {
        console.warn('⚠️  Channel timed out, reconnecting...')
      }
    })
  
  return channel
}

// ============================================
// Heartbeat System
// ============================================

async function startHeartbeat() {
  console.log(`💓 Starting heartbeat (every ${CONFIG.HEARTBEAT_INTERVAL / 1000}s)...`)
  
  const sendHeartbeat = async () => {
    try {
      const timestamp = new Date().toISOString()
      const uptime = process.uptime()
      
      await logActivity(
        'SYSTEM',
        'HEARTBEAT',
        `Agent alive - Uptime: ${Math.floor(uptime)}s`,
        'info',
        {
          timestamp,
          uptime_seconds: uptime,
          memory_usage: process.memoryUsage().heapUsed,
          node_version: process.version
        }
      )
      
      console.log(`💓 Heartbeat: ${timestamp} (Uptime: ${Math.floor(uptime)}s)`)
    } catch (error) {
      console.error('❌ Heartbeat failed:', error.message)
    }
  }
  
  // إرسال أول نبضة فوراً
  await sendHeartbeat()
  
  // جدولة النبضات
  setInterval(sendHeartbeat, CONFIG.HEARTBEAT_INTERVAL)
}

// ============================================
// إشارات النظام (Graceful Shutdown)
// ============================================

async function shutdown(signal) {
  console.log(`\n🛑 Received ${signal}, shutting down gracefully...`)
  
  await logActivity(
    'SYSTEM',
    'AGENT_SHUTDOWN',
    `Agent stopped (signal: ${signal})`,
    'warning'
  )
  
  // إغلاق اتصال Supabase
  await supabase.removeAllChannels()
  
  console.log('👋 Agent stopped. Goodbye!')
  process.exit(0)
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

// ============================================
// بدء التشغيل
// ============================================

async function main() {
  console.log('')
  console.log('╔══════════════════════════════════════════╗')
  console.log('║   🤖 Smart Store AI Agent v3.0          ║')
  console.log('║   Autonomous Inventory Management       ║')
  console.log('╚══════════════════════════════════════════╝')
  console.log('')
  
  // تسجيل بدء التشغيل
  await logActivity(
    'SYSTEM',
    'AGENT_START',
    `Agent v3.0 started (Node ${process.version})`,
    'info',
    {
      ai_enabled: !!openai,
      heartbeat_interval: CONFIG.HEARTBEAT_INTERVAL
    }
  )
  
  // بدء المراقب
  await startInventoryMonitor()
  
  // بدء نظام النبضات
  await startHeartbeat()
  
  console.log('')
  console.log('✅ All systems operational')
  console.log('📊 Monitoring inventory in real-time')
  if (openai) {
    console.log('🧠 GPT-4o Mini predictions enabled')
  } else {
    console.log('📐 Using calculation-based predictions')
  }
  console.log('')
  console.log('Press Ctrl+C to stop')
  console.log('')
}

// تشغيل النظام
main().catch(async (error) => {
  console.error('❌ Fatal error:', error)
  await logActivity(
    'SYSTEM',
    'AGENT_CRASH',
    `Fatal error: ${error.message}`,
    'critical',
    { error: error.stack }
  )
  process.exit(1)
})
