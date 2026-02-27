const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env.local");
    process.exit(1);
}

const admin = createClient(supabaseUrl, supabaseKey);

async function repairGhostUnits() {
    console.log("Scanning for units with ghost representatives (representative_id != owner_id, but no active proxy exists)...");

    // 1. Get all users to map document_number to user.id
    const { data: users, error: userErr } = await admin.from('users').select('id, document_number');
    if (userErr) {
        console.error("Error fetching users:", userErr);
        return;
    }

    const userMap = {}; // { '3003003': 'user-uuid' }
    users.forEach(u => {
        if (u.document_number) userMap[String(u.document_number).trim().toLowerCase()] = u.id;
    });

    // 2. Get all units where representative_id might be out of sync
    const { data: units, error: unitErr } = await admin.from('units').select('id, number, owner_document_number, representative_id');
    if (unitErr) {
        console.error("Error fetching units:", unitErr);
        return;
    }

    let repairedCount = 0;

    for (const unit of units) {
        const cleanDoc = String(unit.owner_document_number || '').trim().toLowerCase();
        const ownerId = userMap[cleanDoc];

        if (!ownerId) {
            // Owner hasn't registered yet, or document number is mismatched and couldn't be mapped
            continue;
        }

        if (unit.representative_id !== ownerId) {
            // This unit is represented by someone else. Let's verify if there is an active proxy.
            const { data: activeProxies } = await admin
                .from('proxies')
                .select('id')
                .eq('principal_id', ownerId)
                .eq('representative_id', unit.representative_id)
                .eq('status', 'APPROVED');

            if (!activeProxies || activeProxies.length === 0) {
                console.log(`- Ghost link found: Unit ${unit.number} (Owner: ${cleanDoc}). Representative is ${unit.representative_id} but no active proxy exists!`);
                console.log(`  -> Restoring representative_id to owner (${ownerId})`);

                const { error: updateErr } = await admin
                    .from('units')
                    .update({ representative_id: ownerId })
                    .eq('id', unit.id);

                if (updateErr) {
                    console.error(`     Failed to restore unit ${unit.id}:`, updateErr);
                } else {
                    console.log(`     Restored successfully.`);
                    repairedCount++;
                }
            }
        }
    }

    console.log(`\nScan complete. Repaired ${repairedCount} ghost units.`);
}

repairGhostUnits();
