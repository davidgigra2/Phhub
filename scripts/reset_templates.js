const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    try {
        console.log('Deleting saved templates to force new defaults...');
        // Delete all rows in notification_templates
        const { data, error } = await supabase.from('notification_templates').delete().neq('id', '00000000-0000-0000-0000-000000000000');

        if (error) {
            console.error('ERROR deleting templates:', error.message);
        } else {
            console.log('Templates deleted successfully. The UI will now load the latest defaults.');
        }
    } catch (err) {
        console.error('Script Error:', err);
    }
}

run();
