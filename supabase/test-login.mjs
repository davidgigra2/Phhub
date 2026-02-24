import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://itvssdpcsskelasrjgkm.supabase.co';
const ANON_KEY = 'sb_publishable_b0dO1gBfDWrw1GpjWr9jCw_MGtb_gAv';

const supabase = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false }
});

async function main() {
    console.log("Attempting login with superadmin123...");

    // Attempt with @phcore.local
    let res = await supabase.auth.signInWithPassword({
        email: 'superadmin@phcore.local',
        password: 'superadmin123'
    });
    console.log("Login @phcore.local:", res.error ? res.error.message : !!res.data.session);

    // Attempt with @phhub.com
    res = await supabase.auth.signInWithPassword({
        email: 'superadmin@phhub.com',
        password: 'superadmin123'
    });
    console.log("Login @phhub.com:", res.error ? res.error.message : !!res.data.session);
}

main();
