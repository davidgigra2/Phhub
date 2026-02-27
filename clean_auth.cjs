const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(supabaseUrl, supabaseKey);

async function cleanAuthUsers() {
    console.log("=== CLEANING AUTH.USERS ===\n");

    // List ALL auth users
    const { data: { users }, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
    if (listErr) {
        console.error("Error listing auth users:", listErr.message);
        return;
    }

    console.log(`Found ${users.length} total users in auth.`);

    for (const u of users) {
        // Skip super admins
        const { data: pub } = await admin.from('users').select('role').eq('id', u.id).single();
        if (pub?.role === 'SUPER_ADMIN') {
            console.log(`Skipping SUPER_ADMIN: ${u.email}`);
            continue;
        }

        console.log(`Deleting auth user: ${u.email} (${u.id})`);
        const { error } = await admin.auth.admin.deleteUser(u.id);
        if (error) {
            console.error(`  Auth delete failed: ${error.message}`);
            // Force delete from public.users table as fallback
            const { error: pubErr } = await admin.from('users').delete().eq('id', u.id);
            if (pubErr) console.error(`  Public delete also failed: ${pubErr.message}`);
            else console.log(`  Removed from public.users as fallback.`);
        } else {
            console.log(`  Deleted successfully.`);
        }
    }

    console.log("\n=== AUTH CLEANUP COMPLETE ===");
}

cleanAuthUsers();
