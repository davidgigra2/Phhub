require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log("Fetching ADMIN role users...");
    const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, username, assembly_id, assemblies(name)')
        .eq('role', 'ADMIN')
        .order('full_name');
    console.log("Data:", JSON.stringify(data, null, 2));
    if(error) console.error("Error:", error);
}
run();
