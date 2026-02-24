const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    try {
        const rawSql = fs.readFileSync('supabase/notifications-schema.sql', 'utf8');

        // Supabase JS doesn't have a direct "run raw sql" unless you created an RPC function
        // for it beforehand (like `exec_sql(query text)`). 
        // Since we don't know if they have that, we'll try to check if the table exists
        // by selecting from it.

        console.log('Checking if table exists...');
        const { data: test, error: testErr } = await supabase.from('notification_templates').select('id').limit(1);

        if (testErr) {
            console.error('ERROR:', testErr.message);
            console.log('\n--- ATTENTION ---');
            console.log('Table "notification_templates" does NOT exist in the remote database.');
            console.log('You must run the contents of "supabase/notifications-schema.sql" in the Supabase SQL Editor manually.');
        } else {
            console.log('Table exists, no action needed.');
        }
    } catch (err) {
        console.error('Script Error:', err);
    }
}

run();
