import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanDB() {
    console.log("Cleaning Database Units and Asambleistas...");

    await admin.from('attendance_logs').delete().not('id', 'is', null);
    await admin.from('ballots').delete().not('id', 'is', null);
    await admin.from('vote_options').delete().not('id', 'is', null);
    await admin.from('votes').delete().not('id', 'is', null);
    await admin.from('proxies').delete().not('id', 'is', null);
    await admin.from('units').delete().not('id', 'is', null);

    // Delete public users where role = 'USER'
    const { data: users } = await admin.from('users').select('id').eq('role', 'USER');
    if (users && users.length > 0) {
        const ids = users.map(u => u.id);
        console.log(`Found ${ids.length} Asambleistas to delete.`);
        await admin.from('users').delete().in('id', ids);

        // Delete auth.users
        let deletedAuth = 0;
        for (const id of ids) {
            const { error } = await admin.auth.admin.deleteUser(id);
            if (!error) deletedAuth++;
        }
        console.log(`Deleted ${deletedAuth} Auth users.`);
    }

    // Reset assembly unit counts
    await admin.from('assemblies').update({ total_units: 0 }).not('id', 'is', null);

    console.log("DB Clean completed successfully.");
}

cleanDB();
