require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const { data, error } = await supabase.from('users').select('*').in('role', ['ADMIN', 'OPERATOR']);
    console.log("Users:", JSON.stringify(data, null, 2));
    if(error) console.error(error);
}
run();
