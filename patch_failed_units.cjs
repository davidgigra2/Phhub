const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const failedUnits = [
    { number: 'Manzana 8 Casa 27', coefficient: 0.2733, owner_name: 'Andrés Rodríguez Escudero', doc: '1087998601', email: '1087998601@phcore.local', phone: '3102643706' },
    { number: 'Torre 2 Apartamento 204', coefficient: 0.184, owner_name: 'Katerine Osorio Sánchez', doc: '1030563931', email: '1030563931@phcore.local', phone: '3154535483' },
    { number: 'Torre 3 Apartamento 102', coefficient: 0.184, owner_name: 'Leidy Susana Duque Becerra', doc: '52768372', email: '52768372@phcore.local', phone: '593978748603' },
    { number: 'Torre 6 Apartamento -201', coefficient: 0.184, owner_name: 'Maria Beatriz Duque Noreña', doc: '34053852', email: '34053852@phcore.local', phone: '3162804886' },
    { number: 'Torre 8 Apartamento 402', coefficient: 0.184, owner_name: 'Luis David Giraldo Grajales', doc: '1088021330', email: '1088021330@phcore.local', phone: '3226258229' },
];

async function patch() {
    const { data: assembly } = await admin.from('assemblies').select('id, name').limit(1).single();
    if (!assembly) { console.error('No assembly found'); return; }
    const assemblyId = assembly.id;
    console.log('Assembly:', assembly.name, assemblyId);

    for (const u of failedUnits) {
        console.log('\nProcessing:', u.number);
        let authUserId = null;

        // 1. Check public.users by document_number
        const { data: existingPub } = await admin.from('users').select('id').eq('document_number', u.doc).single();
        if (existingPub) {
            authUserId = existingPub.id;
            console.log('  -> found in public.users:', authUserId);
        } else {
            // 2. Create new auth user (skip if already exists — will handle separately)
            console.log('  -> creating auth user with email:', u.email);
            const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
                email: u.email,
                password: u.doc,
                email_confirm: true,
            });

            if (createErr) {
                console.error('  -> create error:', createErr.message);
                // Skip this one - needs SQL-level cleanup in Supabase
                continue;
            }

            authUserId = newUser.user.id;
            console.log('  -> created:', authUserId);

            // 3. Insert into public.users
            const { error: upsertErr } = await admin.from('users').upsert({
                id: authUserId, email: u.email, full_name: u.owner_name,
                role: 'USER', document_number: u.doc, assembly_id: assemblyId,
            }, { onConflict: 'id' });
            if (upsertErr) { console.error('  -> public.users error:', upsertErr.message); continue; }
        }

        // 4. Insert unit
        if (authUserId) {
            const { error: unitErr } = await admin.from('units').upsert({
                number: u.number, coefficient: u.coefficient, assembly_id: assemblyId,
                owner_name: u.owner_name, owner_document_number: u.doc,
                owner_email: u.email, owner_phone: u.phone, representative_id: authUserId,
            }, { onConflict: 'number' });
            if (unitErr) console.error('  -> unit error:', unitErr.message);
            else console.log('  -> unit inserted OK');
        }
    }
    console.log('\nDone.');
}

patch().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
