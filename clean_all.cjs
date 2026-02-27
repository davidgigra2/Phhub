const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env.local");
    process.exit(1);
}

const admin = createClient(supabaseUrl, supabaseKey);

async function cleanAll() {
    console.log("=== FULL DATABASE CLEANUP ===\n");

    // 1. Delete digital_signatures first (depends on proxies)
    console.log("1. Deleting all digital_signatures...");
    const { error: sigErr } = await admin.from('digital_signatures').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (sigErr) console.error("   Error:", sigErr.message);
    else console.log("   Done.");

    // 2. Delete all proxies
    console.log("2. Deleting all proxies...");
    const { error: proxyErr } = await admin.from('proxies').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (proxyErr) console.error("   Error:", proxyErr.message);
    else console.log("   Done.");

    // 3. Delete attendance_logs
    console.log("3. Deleting all attendance_logs...");
    const { error: attErr } = await admin.from('attendance_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (attErr) console.error("   Error:", attErr.message);
    else console.log("   Done.");

    // 4. Delete ballots
    console.log("4. Deleting all ballots...");
    const { error: ballotErr } = await admin.from('ballots').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (ballotErr) console.error("   Error:", ballotErr.message);
    else console.log("   Done.");

    // 5. Delete vote_options
    console.log("5. Deleting all vote_options...");
    const { error: optErr } = await admin.from('vote_options').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (optErr) console.error("   Error:", optErr.message);
    else console.log("   Done.");

    // 6. Delete votes
    console.log("6. Deleting all votes...");
    const { error: voteErr } = await admin.from('votes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (voteErr) console.error("   Error:", voteErr.message);
    else console.log("   Done.");

    // 7. Delete units
    console.log("7. Deleting all units...");
    const { error: unitErr } = await admin.from('units').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (unitErr) console.error("   Error:", unitErr.message);
    else console.log("   Done.");

    // 8. Delete all non-SUPER_ADMIN users from public.users table (then auth.users)
    console.log("8. Deleting all non-SUPER_ADMIN users from auth...");
    const { data: usersToDelete } = await admin
        .from('users')
        .select('id')
        .not('role', 'eq', 'SUPER_ADMIN');

    if (usersToDelete && usersToDelete.length > 0) {
        console.log(`   Found ${usersToDelete.length} users to delete...`);
        for (const u of usersToDelete) {
            const { error: delErr } = await admin.auth.admin.deleteUser(u.id);
            if (delErr) console.error(`   Error deleting user ${u.id}:`, delErr.message);
        }
        console.log(`   Done.`);
    } else {
        console.log("   No non-admin users found.");
    }

    // 9. Delete assemblies
    console.log("9. Deleting all assemblies...");
    const { error: asmErr } = await admin.from('assemblies').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (asmErr) console.error("   Error:", asmErr.message);
    else console.log("   Done.");

    console.log("\n=== CLEANUP COMPLETE ===");
    console.log("The database is now empty and ready for fresh testing.");
}

cleanAll();
