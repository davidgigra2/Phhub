import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://itvssdpcsskelasrjgkm.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0dnNzZHBjc3NrZWxhc3JqZ2ttIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTEyNDA3MywiZXhwIjoyMDg2NzAwMDczfQ.4McQ_-Wui-zG2D3cIjJjZ_-QBPkkgxgtOFTqAuvJ7qA';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
});

async function main() {
    console.log("Fetching users from public.users...");
    const { data: users, error } = await supabase.from('users').select('id, email, username, full_name, role, document_number');
    if (error) {
        console.error("Error fetching users:", error);
        return;
    }

    console.table(users.map(u => ({
        Role: u.role,
        Username: u.username,
        Document: u.document_number,
        Email: u.email,
        Name: u.full_name
    })));
}

main();
