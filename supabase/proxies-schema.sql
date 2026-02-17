-- Create proxies table
CREATE TABLE IF NOT EXISTS proxies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    principal_id UUID REFERENCES users(id) NOT NULL, -- The user GIVING the power
    representative_id UUID REFERENCES users(id), -- The user RECEIVING the power (nullable for external/pending)
    external_name TEXT, -- For external representatives not yet in system
    external_doc_number TEXT, -- For external representatives
    is_external BOOLEAN DEFAULT FALSE,
    type TEXT CHECK (type IN ('DIGITAL', 'PDF', 'OPERATOR')) NOT NULL,
    status TEXT CHECK (status IN ('PENDING', 'APPROVED', 'REVOKED', 'REJECTED')) DEFAULT 'PENDING',
    document_url TEXT, -- Path to signed PDF if applicable
    verification_code TEXT, -- OTP for digital signature
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT now(),
    valid_until TIMESTAMP WITH TIME ZONE,
    
    -- Request constraints
    CONSTRAINT unique_active_proxy UNIQUE (principal_id, status) 
        DEFERRABLE INITIALLY DEFERRED 
        -- This might be too strict if we keep history, better handle in logic or partial index
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_proxies_principal ON proxies(principal_id);
CREATE INDEX IF NOT EXISTS idx_proxies_representative ON proxies(representative_id);
CREATE INDEX IF NOT EXISTS idx_proxies_status ON proxies(status);

-- RLS Policies
ALTER TABLE proxies ENABLE ROW LEVEL SECURITY;

-- users can see proxies they created or where they are the representative
CREATE POLICY "Users can view their own proxies" ON proxies
    FOR SELECT
    USING (auth.uid() = principal_id OR auth.uid() = representative_id);

-- users can create proxies for themselves
CREATE POLICY "Users can insert their own proxies" ON proxies
    FOR INSERT
    WITH CHECK (auth.uid() = principal_id);

-- users can update (revoke) their own proxies
CREATE POLICY "Users can update their own proxies" ON proxies
    FOR UPDATE
    USING (auth.uid() = principal_id);

-- Operators and Admins can view/manage all proxies
CREATE POLICY "Operators and Admins can view all proxies" ON proxies
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('ADMIN', 'OPERATOR')
        )
    );

CREATE POLICY "Operators and Admins can update/insert all proxies" ON proxies
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('ADMIN', 'OPERATOR')
        )
    );
