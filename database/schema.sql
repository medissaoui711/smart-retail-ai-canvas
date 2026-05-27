-- ============================================
-- Smart Retail AI Canvas - Database Schema
-- Version: 1.0
-- Platform: Supabase (PostgreSQL)
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. جدول المنتجات
-- ============================================
CREATE TABLE products (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sku TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    name_ar TEXT,
    emoji TEXT DEFAULT '📦',
    color TEXT NOT NULL DEFAULT '#FF6B6B',
    size INTEGER DEFAULT 15,
    category TEXT DEFAULT 'general',
    unit_price DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. جدول المخزون (الجدول الحيوي الرئيسي)
-- ============================================
CREATE TABLE inventory (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE UNIQUE,
    stock_level INTEGER NOT NULL DEFAULT 0 CHECK (stock_level >= 0),
    reorder_point INTEGER DEFAULT 20,
    max_capacity INTEGER DEFAULT 100,
    min_display INTEGER DEFAULT 10,
    sales_velocity REAL DEFAULT 0.0,
    last_restock_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. جدول المبيعات
-- ============================================
CREATE TABLE sales (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    quantity INTEGER DEFAULT 1,
    sale_price DECIMAL(10,2),
    total_amount DECIMAL(10,2) GENERATED ALWAYS AS (quantity * sale_price) STORED,
    sold_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. جدول أوامر الشراء الآلية
-- ============================================
CREATE TABLE purchase_orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    quantity_ordered INTEGER NOT NULL CHECK (quantity_ordered > 0),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'fulfilled', 'cancelled')),
    ai_prediction TEXT,
    agent_decision JSONB,
    prediction_seconds_to_empty INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    fulfilled_at TIMESTAMPTZ
);

-- ============================================
-- 5. جدول سجلات الوكيل الذكي
-- ============================================
CREATE TABLE agent_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sku_id TEXT,
    log_level TEXT DEFAULT 'info' CHECK (log_level IN ('info', 'warning', 'critical', 'success')),
    action TEXT NOT NULL,
    details TEXT,
    data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. جدول المتاجر (للتوسع المستقبلي)
-- ============================================
CREATE TABLE stores (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- المؤشرات (Indexes)
-- ============================================
CREATE INDEX idx_inventory_product ON inventory(product_id);
CREATE INDEX idx_inventory_stock_level ON inventory(stock_level);
CREATE INDEX idx_sales_product ON sales(product_id);
CREATE INDEX idx_sales_date ON sales(sold_at DESC);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX idx_agent_logs_date ON agent_logs(created_at DESC);
CREATE INDEX idx_agent_logs_level ON agent_logs(log_level);

-- ============================================
-- الدوال والإجراءات المخزنة (Functions)
-- ============================================

-- دالة: تحديث المخزون بعد البيع
CREATE OR REPLACE FUNCTION process_sale(
    p_product_id UUID,
    p_quantity INTEGER DEFAULT 1,
    p_price DECIMAL DEFAULT 9.99
) RETURNS JSONB AS $$
DECLARE
    v_current_stock INTEGER;
    v_result JSONB;
BEGIN
    -- جلب المخزون الحالي
    SELECT stock_level INTO v_current_stock
    FROM inventory
    WHERE product_id = p_product_id;
    
    -- التحقق من كفاية المخزون
    IF v_current_stock < p_quantity THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Insufficient stock',
            'available', v_current_stock
        );
    END IF;
    
    -- تحديث المخزون
    UPDATE inventory
    SET 
        stock_level = stock_level - p_quantity,
        sales_velocity = (
            SELECT COUNT(*)::REAL / 60
            FROM sales
            WHERE product_id = p_product_id
            AND sold_at > NOW() - INTERVAL '1 minute'
        ),
        updated_at = NOW()
    WHERE product_id = p_product_id;
    
    -- تسجيل عملية البيع
    INSERT INTO sales (product_id, quantity, sale_price)
    VALUES (p_product_id, p_quantity, p_price);
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Sale processed successfully',
        'new_stock', v_current_stock - p_quantity
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة: معالجة أمر الشراء وتحديث المخزون
CREATE OR REPLACE FUNCTION fulfill_purchase_order(
    p_order_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_product_id UUID;
    v_quantity INTEGER;
    v_current_stock INTEGER;
BEGIN
    -- جلب تفاصيل الأمر
    SELECT product_id, quantity_ordered INTO v_product_id, v_quantity
    FROM purchase_orders
    WHERE id = p_order_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Order not found or already processed');
    END IF;
    
    -- تحديث المخزون
    UPDATE inventory
    SET 
        stock_level = LEAST(stock_level + v_quantity, max_capacity),
        last_restock_at = NOW(),
        updated_at = NOW()
    WHERE product_id = v_product_id
    RETURNING stock_level INTO v_current_stock;
    
    -- تحديث حالة الأمر
    UPDATE purchase_orders
    SET status = 'fulfilled', fulfilled_at = NOW()
    WHERE id = p_order_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Order fulfilled',
        'new_stock', v_current_stock
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Triggers
-- ============================================

-- Trigger: تحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_products_update
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_inventory_update
    BEFORE UPDATE ON inventory
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ============================================
-- البيانات الأولية (Seed Data)
-- ============================================
INSERT INTO products (sku, name, name_ar, emoji, color, category, unit_price) VALUES
    ('MLK-001', 'Fresh Milk', 'حليب طازج', '🥛', '#FF6B6B', 'dairy', 5.99),
    ('WTR-002', 'Mineral Water', 'مياه معدنية', '💧', '#4ECDC4', 'beverages', 2.50),
    ('BRD-003', 'Whole Bread', 'خبز كامل', '🍞', '#FFD93D', 'bakery', 3.99),
    ('EGG-004', 'Organic Eggs', 'بيض عضوي', '🥚', '#FF8C42', 'dairy', 7.50),
    ('APP-005', 'Red Apple', 'تفاح أحمر', '🍎', '#FF4757', 'fruits', 1.99);

INSERT INTO inventory (product_id, stock_level, reorder_point, max_capacity)
SELECT id, 50, 20, 100 FROM products;

-- سجل تشغيلي أولي
INSERT INTO agent_logs (sku_id, log_level, action, details) VALUES
    ('SYSTEM', 'info', 'SYSTEM_INIT', 'Database schema initialized successfully'),
    ('SYSTEM', 'info', 'SYSTEM_INIT', 'Seed data loaded for 5 products');
