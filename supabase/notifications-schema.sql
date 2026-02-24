-- Create notification templates table
CREATE TABLE notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assembly_id UUID REFERENCES assemblies(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'WELCOME' or 'OTP_SIGN'
    channel VARCHAR(20) NOT NULL, -- 'EMAIL' or 'SMS'
    subject VARCHAR(255), -- Null for SMS
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(assembly_id, type, channel) -- Only one template per type/channel per assembly
);

-- Enable RLS
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

-- Policies
-- Super Admins can manage all templates
CREATE POLICY "Super Admins can manage all templates" ON notification_templates
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
        )
    );

-- Admins and Operators can view their own assembly's templates (optional, depending on who sends)
CREATE POLICY "Admins can view their assembly templates" ON notification_templates
    FOR SELECT
    TO authenticated
    USING (
        assembly_id IN (
            SELECT assembly_id FROM users WHERE id = auth.uid() AND (role = 'ADMIN' OR role = 'OPERATOR')
        )
    );

-- Trigger to update 'updated_at'
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_notification_templates_updated_at
BEFORE UPDATE ON notification_templates
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();
