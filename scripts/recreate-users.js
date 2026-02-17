const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const users = [
    {
        email: 'admin@phhub.com',
        password: 'password123',
        role: 'ADMIN',
        username: 'admin',
        full_name: 'Admin Principal'
    },
    {
        email: 'operador@phhub.com',
        password: 'password123',
        role: 'OPERATOR',
        username: 'operador',
        full_name: 'Operador Logístico'
    },
    {
        email: 'usuario@phhub.com',
        password: 'password123',
        role: 'USER',
        username: 'apto101',
        full_name: 'Juan Pérez',
        unit_number: 'APT-101' // Special handling for unit
    }
];

async function recreateUsers() {
    console.log('🔄 Starting user recreation process...');

    for (const user of users) {
        console.log(`\nProcessing user: ${user.email} (${user.username})...`);

        // 1. Check if user exists in Auth
        const { data: { users: existingUsers }, error: findError } = await supabase.auth.admin.listUsers({ perPage: 1000 });

        if (findError) {
            console.error('Error listing users:', findError);
            continue;
        }

        console.log(`Debug: Found ${existingUsers.length} total users in Auth.`);
        // console.log('Debug: Emails found:', existingUsers.map(u => u.email).join(', '));

        const existingUser = existingUsers.find(u => u.email?.toLowerCase() === user.email.toLowerCase());
        let userId = existingUser?.id;

        if (existingUser) {
            console.log(`Debug: User ${user.email} found in list with ID ${existingUser.id}. Deleting to recreate clean...`);
            const { error: deleteError } = await supabase.auth.admin.deleteUser(existingUser.id);
            if (deleteError) {
                console.error(`Error deleting user ${user.email}:`, deleteError.message);
                // If delete fails, maybe we can't recreate, but let's try updating?
                userId = existingUser.id;
            } else {
                console.log(`User ${user.email} deleted successfully.`);
                userId = null; // Force recreation
            }
        } else {
            console.log(`Debug: User ${user.email} NOT found in Auth list. Will attempt create.`);
        }

        // 2. Create or Update
        if (userId) {
            console.log(`User exists (ID: ${userId}). Updating password...`);
            const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
                password: user.password,
                email_confirm: true,
                user_metadata: { role: user.role } // Store role in metadata too
            });

            if (updateError) {
                console.error(`Error updating user ${user.email}:`, updateError.message);
            } else {
                console.log(`Unknown Password updated.`);
            }
        } else {
            console.log(`User does not exist. Creating...`);
            const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
                email: user.email,
                password: user.password,
                email_confirm: true,
                user_metadata: { role: user.role }
            });

            if (createError) {
                console.error(`Error creating user ${user.email}:`, createError.message);
                continue;
            }
            userId = newUser.user.id;
            console.log(`User created with ID: ${userId}`);
        }

        // 3. Sync with Public Table (Upsert)
        // First resolve Unit ID if needed
        let unitId = null;
        if (user.unit_number) {
            const { data: unitData, error: unitError } = await supabase
                .from('units')
                .select('id')
                .eq('number', user.unit_number)
                .single();

            if (unitData) unitId = unitData.id;
            else console.warn(`Unit ${user.unit_number} not found. Skipping unit link.`);
        }

        const { error: publicError } = await supabase
            .from('users')
            .upsert({
                id: userId,
                email: user.email,
                username: user.username,
                full_name: user.full_name,
                role: user.role,
                unit_id: unitId
            });

        if (publicError) {
            console.error(`Error syncing public profile for ${user.email}:`, publicError.message);
        } else {
            console.log(`Public profile synced for ${user.username}.`);
        }
    }

    console.log('\n✅ User recreation completed.');
}

recreateUsers();
