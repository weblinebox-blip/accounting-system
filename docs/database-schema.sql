-- =========================================================
-- Accounting System — Full Database Schema (PostgreSQL)
-- =========================================================

CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    product_code VARCHAR(50) UNIQUE NOT NULL,
    product_name VARCHAR(255),
    current_stock NUMERIC(12,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS suppliers (
    id SERIAL PRIMARY KEY,
    supplier_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    balance NUMERIC(14,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    customer_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    balance NUMERIC(14,2) DEFAULT 0,
    first_purchase_date DATE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ---------------- خرید ----------------
CREATE TABLE IF NOT EXISTS purchase_invoices (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    purchase_date DATE NOT NULL,
    supplier_name VARCHAR(255) NOT NULL,
    settlement_status VARCHAR(20) CHECK (settlement_status IN ('شده','نشده')) DEFAULT 'نشده',
    total_yuan NUMERIC(14,2) DEFAULT 0,
    total_toman NUMERIC(16,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_items (
    id SERIAL PRIMARY KEY,
    purchase_invoice_id INT REFERENCES purchase_invoices(id) ON DELETE CASCADE,
    product_code VARCHAR(50) NOT NULL,
    quantity NUMERIC(12,2) NOT NULL,
    unit_price_yuan NUMERIC(12,2) NOT NULL DEFAULT 0,
    unit_price_toman NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_price_yuan NUMERIC(14,2) GENERATED ALWAYS AS (quantity * unit_price_yuan) STORED,
    total_price_toman NUMERIC(16,2) GENERATED ALWAYS AS (quantity * unit_price_toman) STORED
);

-- ---------------- فروش ----------------
CREATE TABLE IF NOT EXISTS sales_invoices (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(20) UNIQUE NOT NULL,
    sales_date DATE NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    discount_percent NUMERIC(5,2) DEFAULT 0,
    discount_amount NUMERIC(14,2) DEFAULT 0,
    settlement_status VARCHAR(20) CHECK (settlement_status IN ('شده','نشده')) DEFAULT 'نشده',
    shipping_cost NUMERIC(14,2) DEFAULT 0,
    subtotal NUMERIC(16,2) DEFAULT 0,
    final_total NUMERIC(16,2) DEFAULT 0,
    source_type VARCHAR(20) DEFAULT 'excel',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_items (
    id SERIAL PRIMARY KEY,
    sales_invoice_id INT REFERENCES sales_invoices(id) ON DELETE CASCADE,
    product_code VARCHAR(50) NOT NULL,
    quantity NUMERIC(12,2) NOT NULL,
    unit_price_toman NUMERIC(14,2) NOT NULL,
    total_price NUMERIC(16,2) GENERATED ALWAYS AS (quantity * unit_price_toman) STORED
);

-- ---------------- هزینه‌ها ----------------
CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    expense_number VARCHAR(20) UNIQUE NOT NULL,
    expense_date DATE NOT NULL,
    amount NUMERIC(14,2) NOT NULL,
    category VARCHAR(50) CHECK (category IN (
        'اجاره','حقوق','قبوض','هزینه پست','حمل‌ونقل داخلی',
        'تبلیغات و سایت','هزینه های جاری','هزینه حمل چین تا دبی/ایران',
        'هزینه لنج','هزینه جنوب تا شمال','هزینه گمرک','سایر موارد'
    )) NOT NULL,
    description TEXT,
    receipt_image_path VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ---------------- برگشتی ----------------
CREATE TABLE IF NOT EXISTS return_invoices (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(20) UNIQUE NOT NULL,
    related_sales_invoice_id INT REFERENCES sales_invoices(id),
    return_date DATE NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS return_items (
    id SERIAL PRIMARY KEY,
    return_invoice_id INT REFERENCES return_invoices(id) ON DELETE CASCADE,
    product_code VARCHAR(50) NOT NULL,
    quantity NUMERIC(12,2) NOT NULL,
    unit_price_toman NUMERIC(14,2) NOT NULL,
    total_price NUMERIC(16,2) GENERATED ALWAYS AS (quantity * unit_price_toman) STORED,
    item_condition VARCHAR(20) CHECK (item_condition IN ('سالم','خراب')) NOT NULL,
    loss_amount NUMERIC(14,2) DEFAULT 0
);

-- ---------------- کمکی ----------------
CREATE TABLE IF NOT EXISTS inventory_movements (
    id SERIAL PRIMARY KEY,
    product_code VARCHAR(50) NOT NULL,
    movement_type VARCHAR(20) CHECK (movement_type IN ('purchase','sale','return_ok','return_damaged')) NOT NULL,
    quantity NUMERIC(12,2) NOT NULL,
    reference_invoice VARCHAR(50),
    movement_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exchange_rate_log (
    id SERIAL PRIMARY KEY,
    yuan_rate NUMERIC(10,2) NOT NULL,
    profit_percent NUMERIC(5,2) NOT NULL,
    applied_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255),
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchase_items_code ON purchase_items(product_code);
CREATE INDEX IF NOT EXISTS idx_sales_items_code ON sales_items(product_code);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_date ON purchase_invoices(purchase_date);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_date ON sales_invoices(sales_date);

-- برای دیتابیس‌هایی که قبلاً ساخته شده‌اند (اجرای این خط بی‌خطر است، اگر ستون از قبل باشد رد می‌شود)
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC(14,2) DEFAULT 0;
