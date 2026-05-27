/**
 * Smart Retail AI Canvas - Configuration
 * Version: 1.0
 */

// Supabase Configuration
const SUPABASE_CONFIG = {
  url: 'YOUR_SUPABASE_URL',        // استبدل بـ URL الخاص بك
  anonKey: 'YOUR_SUPABASE_ANON_KEY' // استبدل بـ Anon Key الخاص بك
}

// Canvas Configuration
const CANVAS_CONFIG = {
  width: 800,
  height: 600,
  backgroundColor: '#0a0a1a',
  floorOffset: 60,        // ارتفاع خط Checkout من الأسفل
  gravity: 0.15,          // الجاذبية الافتراضية (معدل البيع)
  maxParticles: 500       // الحد الأقصى للكرات المعروضة
}

// Product Configuration
const PRODUCT_CONFIGS = {
  'MLK-001': {
    name: 'Fresh Milk',
    nameAr: 'حليب طازج',
    emoji: '🥛',
    color: '#FF6B6B',
    size: 16,
    price: 5.99
  },
  'WTR-002': {
    name: 'Mineral Water',
    nameAr: 'مياه معدنية',
    emoji: '💧',
    color: '#4ECDC4',
    size: 15,
    price: 2.50
  },
  'BRD-003': {
    name: 'Whole Bread',
    nameAr: 'خبز كامل',
    emoji: '🍞',
    color: '#FFD93D',
    size: 18,
    price: 3.99
  },
  'EGG-004': {
    name: 'Organic Eggs',
    nameAr: 'بيض عضوي',
    emoji: '🥚',
    color: '#FF8C42',
    size: 14,
    price: 7.50
  },
  'APP-005': {
    name: 'Red Apple',
    nameAr: 'تفاح أحمر',
    emoji: '🍎',
    color: '#FF4757',
    size: 13,
    price: 1.99
  }
}

// Dashboard Configuration
const DASHBOARD_CONFIG = {
  maxLogs: 100,           // الحد الأقصى للسجلات المعروضة
  chartUpdateInterval: 1000, // تحديث المخطط كل ثانية
  metricUpdateInterval: 500   // تحديث المؤشرات كل نصف ثانية
}

// Export for ES modules (if using modules)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SUPABASE_CONFIG,
    CANVAS_CONFIG,
    PRODUCT_CONFIGS,
    DASHBOARD_CONFIG
  }
}
