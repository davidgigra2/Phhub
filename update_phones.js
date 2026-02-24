const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixPhones() {
    const phones = [
        { doc: '1001001', phone: '573226258229' },
        { doc: '2002002', phone: '573216668541' },
        { doc: '3003003', phone: '573053601190' },
        { doc: '9009009', phone: '573122630280' },
    ];

    for (const user of phones) {
        console.log(`Updating ${user.doc} with phone ${user.phone}`);
        const { error } = await supabase
            .from('units')
            .update({ owner_phone: user.phone })
            .eq('owner_document_number', user.doc);

        if (error) console.error(error);
    }
    console.log("Done");
}

fixPhones();
