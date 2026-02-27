const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testStats() {
    console.log('--- TEST for User 3003003 ---');
    const { data: currentUser } = await admin.from('users').select('id, document_number').eq('document_number', '3003003').single();
    if (!currentUser) return console.log('User not found');

    console.log('User ID:', currentUser.id);
    console.log('User Doc:', currentUser.document_number, 'Length:', String(currentUser.document_number).length);

    const { data: representedUnitsData } = await admin
        .from('units')
        .select('number, coefficient, owner_document_number, owner_name')
        .eq('representative_id', currentUser.id);

    console.log('Represented Units:', representedUnitsData);

    let ownWeight = 0;
    let representedWeight = 0;

    representedUnitsData?.forEach((u) => {
        const coef = u.coefficient || 0;
        const doc1 = String(u.owner_document_number || '').trim().toLowerCase();
        const doc2 = String(currentUser?.document_number || '').trim().toLowerCase();

        console.log(`Comparing '${doc1}' vs '${doc2}'`);

        const isOwner = doc1 === doc2 && doc1 !== '';
        console.log('isOwner:', isOwner);

        if (isOwner) ownWeight += coef;
        else representedWeight += coef;
    });

    console.log("Final Output:", { ownWeight, representedWeight });
}
testStats();
