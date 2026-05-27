/**
 * Smart Retail AI Canvas - Dashboard Manager
 * إدارة لوحة التحكم والمؤشرات
 * Version: 1.0
 */

class Dashboard {
  constructor() {
    this.stockChart = null
    this.totalSales = 0
    this.totalOrders = 0
    this.liveInventory = {}
    this.isInitialized = false
    
    // تهيئة بعد تحميل DOM
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init())
    } else {
      this.init()
    }
  }
  
  /**
   * تهيئة Dashboard
   */
  init() {
    if (this.isInitialized) return
    this.isInitialized = true
    
    this.initStockChart()
    this.initRealtimeSubscription()
    this.loadInitialData()
    
    console.log('📊 Dashboard initialized')
  }
  
  /**
   * تهيئة مخطط المخزون
   */
  initStockChart() {
    const chartCanvas = document.getElementById('stockChart')
    if (!chartCanvas) {
      console.warn('Stock chart canvas not found')
      return
    }
    
    const ctx = chartCanvas.getContext('2d')
    
    this.stockChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: [],
        datasets: [{
          label: 'المخزون الحالي',
          data: [],
          backgroundColor: [],
          borderColor: [],
          borderWidth: 2,
          borderRadius: 6,
          borderSkipped: false
        }, {
          label: 'نقطة إعادة الطلب',
          data: [],
          backgroundColor: 'rgba(255, 107, 107, 0.2)',
          borderColor: '#FF6B6B',
          borderWidth: 1,
          borderDash: [5, 5],
          type: 'line',
          pointRadius: 0,
          fill: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'index'
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            grid: {
              color: 'rgba(255, 255, 255, 0.05)'
            },
            ticks: {
              color: '#aaaacc',
              font: { size: 11 }
            }
          },
          x: {
            grid: {
              display: false
            },
            ticks: {
              color: '#aaaacc',
              font: { size: 11 }
            }
          }
        },
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              color: '#aaaacc',
              padding: 15,
              usePointStyle: true,
              font: { size: 11 }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(20, 20, 40, 0.95)',
            titleColor: '#e0e0e0',
            bodyColor: '#aaaacc',
            borderColor: '#2a2a4a',
            borderWidth: 1,
            padding: 12,
            cornerRadius: 8
          }
        }
      }
    })
  }
  
  /**
   * تحميل البيانات الأولية
   */
  async loadInitialData() {
    if (typeof supabase === 'undefined') return
    
    try {
      // تحميل المخزون
      const { data: inventory } = await supabase
        .from('inventory')
        .select('product_id, stock_level, reorder_point')
      
      if (inventory) {
        inventory.forEach(item => {
          this.liveInventory[item.product_id] = {
            stock: item.stock_level,
            reorderPoint: item.reorder_point
          }
        })
        this.updateChart()
        this.updateMetrics()
      }
      
      // تحميل إجمالي المبيعات
      const { count: salesCount } = await supabase
        .from('sales')
        .select('*', { count: 'exact', head: true })
      
      if (salesCount !== null) {
        this.totalSales = salesCount
        document.getElementById('totalSales').textContent = salesCount
      }
      
      // تحميل إجمالي الطلبات
      const { count: ordersCount } = await supabase
        .from('purchase_orders')
        .select('*', { count: 'exact', head: true })
      
      if (ordersCount !== null) {
        this.totalOrders = ordersCount
        document.getElementById('totalOrders').textContent = ordersCount
      }
      
      // تحميل آخر السجلات
      const { data: logs } = await supabase
        .from('agent_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)
      
      if (logs) {
        logs.forEach(log => {
          this.addLogEntry(log)
        })
      }
    } catch (error) {
      console.error('Error loading initial data:', error)
    }
  }
  
  /**
   * الاشتراك في التحديثات الحية
   */
  initRealtimeSubscription() {
    if (typeof supabase === 'undefined') return
    
    // الاستماع لتحديثات المخزون
    supabase
      .channel('dashboard-inventory')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'inventory'
      }, (payload) => {
        this.liveInventory[payload.new.product_id] = {
          stock: payload.new.stock_level,
          reorderPoint: payload.new.reorder_point
        }
        this.updateChart()
        this.updateMetrics()
        
        // الكشف عن إعادة التموين
        if (payload.new.stock_level > payload.old.stock_level) {
          const added = payload.new.stock_level - payload.old.stock_level
          const config = PRODUCT_CONFIGS[payload.new.product_id]
          if (config) {
            this.addLog({
              log_level: 'success',
              action: 'SUPPLY_ARRIVED',
              details: `📦 وصول توريد: +${added} ${config.emoji} ${config.nameAr}`,
              created_at: new Date().toISOString()
            })
          }
          
          // إضافة منتجات للـ Canvas
          if (typeof storeCanvas !== 'undefined' && storeCanvas) {
            storeCanvas.addProducts(payload.new.product_id, added)
          }
        }
      })
      .subscribe()
    
    // الاستماع للمبيعات الجديدة
    supabase
      .channel('dashboard-sales')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'sales'
      }, (payload) => {
        this.totalSales++
        document.getElementById('totalSales').textContent = this.totalSales
        this.updateMetrics()
      })
      .subscribe()
    
    // الاستماع لسجلات الوكيل
    supabase
      .channel('dashboard-logs')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'agent_logs'
      }, (payload) => {
        this.addLogEntry(payload.new)
      })
      .subscribe()
  }
  
  /**
   * تحديث المخطط البياني
   */
  updateChart() {
    if (!this.stockChart) return
    
    const labels = []
    const stockData = []
    const reorderData = []
    const colors = []
    
    for (const [sku, data] of Object.entries(this.liveInventory)) {
      const config = PRODUCT_CONFIGS[sku]
      if (!config) continue
      
      labels.push(config.emoji + ' ' + config.nameAr)
      stockData.push(data.stock)
      reorderData.push(data.reorderPoint)
      colors.push(config.color)
    }
    
    this.stockChart.data.labels = labels
    this.stockChart.data.datasets[0].data = stockData
    this.stockChart.data.datasets[0].backgroundColor = colors
    this.stockChart.data.datasets[0].borderColor = colors.map(c => this.darkenColor(c, 20))
    this.stockChart.data.datasets[1].data = reorderData
    this.stockChart.update('none') // تحديث بدون رسوم متحركة للأداء
  }
  
  /**
   * تحديث المؤشرات الرقمية
   */
  updateMetrics() {
    const totalStock = Object.values(this.liveInventory)
      .reduce((sum, data) => sum + data.stock, 0)
    
    document.getElementById('totalStock').textContent = totalStock
    
    // حساب معدل البيع
    if (typeof storeCanvas !== 'undefined' && storeCanvas) {
      document.getElementById('salesVelocity').textContent = 
        storeCanvas.stats.salesPerMinute.toFixed(1)
    }
  }
  
  /**
   * تحديث حالة الوكيل
   * @param {string} status - 'monitoring', 'ordering', 'idle'
   * @param {string} message - رسالة الحالة
   */
  updateAgentStatus(status, message) {
    const agentDiv = document.getElementById('agentStatus')
    if (!agentDiv) return
    
    const statusConfigs = {
      monitoring: {
        emoji: '🧠',
        indicatorClass: 'status-active',
        text: message || 'Agent Active - Monitoring...'
      },
      ordering: {
        emoji: '🛒',
        indicatorClass: 'status-processing',
        text: message || 'Agent Processing Order...'
      },
      idle: {
        emoji: '💤',
        indicatorClass: '',
        text: message || 'Agent Idle'
      }
    }
    
    const config = statusConfigs[status] || statusConfigs.monitoring
    
    agentDiv.innerHTML = `
      <div class="agent-emoji">${config.emoji}</div>
      <div class="agent-text">
        <span class="status-indicator ${config.indicatorClass}"></span>
        ${config.text}
      </div>
    `
  }
  
  /**
   * إضافة سجل جديد
   * @param {Object} log - كائن السجل
   */
  addLogEntry(log) {
    const logsList = document.getElementById('logsList')
    if (!logsList) return
    
    const time = new Date(log.created_at).toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
    
    const levelClass = `log-${log.log_level || 'info'}`
    
    const logEntry = document.createElement('div')
    logEntry.className = 'log-entry'
    logEntry.innerHTML = `
      <span class="log-time">[${time}]</span>
      <span class="${levelClass}">${log.details || log.action || ''}</span>
    `
    
    logsList.insertBefore(logEntry, logsList.firstChild)
    
    // الحفاظ على عدد السجلات
    const maxLogs = DASHBOARD_CONFIG.maxLogs
    while (logsList.children.length > maxLogs) {
      logsList.removeChild(logsList.lastChild)
    }
  }
  
  /**
   * إضافة سجل مباشر (للاستخدام المحلي)
   */
  addLocalLog(message, level = 'info') {
    this.addLogEntry({
      log_level: level,
      details: message,
      created_at: new Date().toISOString()
    })
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

// إنشاء نسخة عامة
let dashboard = null

function initDashboard() {
  dashboard = new Dashboard()
  return dashboard
}

// تصدير
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Dashboard, initDashboard, dashboard }
}
