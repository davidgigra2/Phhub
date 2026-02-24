import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://itvssdpcsskelasrjgkm.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0dnNzZHBjc3NrZWxhc3JqZ2ttIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTEyNDA3MywiZXhwIjoyMDg2NzAwMDczfQ.4McQ_-Wui-zG2D3cIjJjZ_-QBPkkgxgtOFTqAuvJ7qA';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
});

async function main() {
    console.log("Listing auth users with 'superadmin'...");

    // Check auth users
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
        console.error("List error:", listError);
        return;
    }

    const superadmins = users.users.filter(u => u.email.includes('superadmin'));
    console.log("Superadmins found in auth:", superadmins.map(u => u.email));

    // Check public users
    const { data: pUsers, error: pError } = await supabase.from('users').select('*').eq('role', 'SUPER_ADMIN');
    if (pError) {
        console.error("Public users error:", pError);
    } else {
        console.log("Superadmins found in public.users:", pUsers.map(u => ({ email: u.email, username: u.username })));
    }

    // We want the auth and public user to be superadmin@phhub.com or superadmin@phcore.local?
    // Let's just create/update superadmin@phcore.local because actions.ts appends @phcore.local to usernames without @

    let targetEmail = 'superadmin@phcore.local';

    console.log(`Setting up ${targetEmail}...`);

    // Check if it exists in auth
    let userId;
    const existingParams = users.users.find(u => u.email === targetEmail);
    if (existingParams) {
        userId = existingParams.id;
        console.log(`User found in auth: ${userId}`);
        const { error: updError } = await supabase.auth.admin.updateUserById(userId, {
            password: 'superadmin123',
            email_confirm: true
        });
        if (updError) console.error("Update auth error:", updError);
        else console.log("Password set to superadmin123");
    } else {
        const { data: created, error: crError } = await supabase.auth.admin.createUser({
            email: targetEmail,
            password: 'superadmin123',
            email_confirm: true
        });
        if (crError) {
            console.error("Create auth error:", crError);
            return;
        }
        userId = created.user.id;
        console.log(`User created in auth: ${userId}`);
    }

    // Upsert in public.users
    const { error: upsError } = await supabase.from('users').upsert({
        id: userId,
        email: targetEmail,
        username: 'superadmin',
        full_name: 'Super Administrador',
        role: 'SUPER_ADMIN'
    });

    if (upsError) console.error("Upsert public error:", upsError);
    else console.log("Public user upserted.");

    console.log("Done.");
}

main();
