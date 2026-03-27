-- PostgreSQL initialization script
-- This script runs automatically on first container start

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE admin_pro TO admin_pro;

-- Create schema for future extensions
CREATE SCHEMA IF NOT EXISTS admin_pro_audit;
GRANT USAGE ON SCHEMA admin_pro_audit TO admin_pro;
GRANT CREATE ON SCHEMA admin_pro_audit TO admin_pro;

-- Create indexes for better performance
-- These will be applied when tables are created by Prisma

-- Create audit log table
CREATE TABLE IF NOT EXISTS admin_pro_audit.audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(255) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    old_data JSONB,
    new_data JSONB,
    user_id UUID,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_log_table ON admin_pro_audit.audit_log(table_name);
CREATE INDEX idx_audit_log_record ON admin_pro_audit.audit_log(record_id);
CREATE INDEX idx_audit_log_created ON admin_pro_audit.audit_log(created_at);
CREATE INDEX idx_audit_log_user ON admin_pro_audit.audit_log(user_id);

-- Create function for automatic timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
