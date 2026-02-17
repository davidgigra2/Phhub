const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkData() {
    console.log('🔎 Checking data integrity...');

    // 1. Get Auth User
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
        console.error('Auth Error:', authError);
        return;
    }

    const apto101 = users.find(u => u.email === 'usuario@phhub.com');

    if (!apto101) {
        console.error('❌ User usuario@phhub.com NOT found in Auth!');
        return;
    }

    console.log(`✅ Auth User Found: ${apto101.id} (${apto101.email})`);

    // 2. Check Public Profile
    const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*, units(id, number, coefficient)')
        .eq('id', apto101.id)
        .single();

    if (profileError) {
        console.error('❌ Public Profile Error:', profileError);
    } else if (!profile) {
        console.error('❌ Public Profile NOT found for this ID!');
    } else {
        console.log('✅ Public Profile Found:', profile);
        if (profile.units) {
            console.log('✅ Unit Linked:', profile.units);
        } else {
            console.warn('⚠️ Unit NOT linked or not found.');
        }
    }
}

checkData();
