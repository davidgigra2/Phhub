const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function toggleAttendance() {
    const email = 'usuario@phhub.com';
    console.log(`🔄 Toggling attendance for ${email}...`);

    // 1. Get User and Unit
    const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, unit_id')
        .eq('email', email)
        .single();

    if (userError || !user) {
        console.error('User not found:', userError);
        return;
    }

    // 2. Check if present
    const { data: logs, error: logsError } = await supabase
        .from('attendance_logs')
        .select('id')
        .eq('unit_id', user.unit_id);

    if (logsError) {
        console.error('Error checking logs:', logsError);
        return;
    }

    if (logs.length > 0) {
        // Is present -> Remove (Check-out)
        console.log('User is present. Removing attendance...');
        await supabase.from('attendance_logs').delete().eq('unit_id', user.unit_id);
        console.log('✅ Checkout complete. Quorum should decrease.');
    } else {
        // Is absent -> Add (Check-in)
        console.log('User is absent. Adding attendance...');
        await supabase.from('attendance_logs').insert({
            unit_id: user.unit_id,
            user_id: user.id,
            check_in_time: new Date(),
            device_id: 'script-test'
        });
        console.log('✅ Checkin complete. Quorum should increase.');
    }
}

toggleAttendance();
