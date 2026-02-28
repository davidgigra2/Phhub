import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
    const admin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
    );

    // 1. Crear usuario en Auth con contraseña correcta
    const { data: authUser, error: authError } = await admin.auth.admin.createUser({
        email: '18609483@phcore.local',
        password: '18609483',
        email_confirm: true,
        user_metadata: { full_name: 'Alexander Ospina' }
    });

    if (authError) {
        return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const newId = authUser.user.id;

    // 2. Crear perfil en tabla users
    const { error: profileError } = await admin.from('users').insert({
        id: newId,
        full_name: 'Alexander Ospina',
        document_number: '18609483',
        email: '18609483@phcore.local',
        assembly_id: 'c4b8b7f8-d317-4a4c-958e-e9686ffcdc06',
        role: 'USER'
    });

    if (profileError) {
        return NextResponse.json({ authCreated: true, newId, profileError: profileError.message }, { status: 207 });
    }

    // 3. Actualizar la unidad con el nuevo representative_id
    const { error: unitError } = await admin.from('units')
        .update({
            owner_document_number: '18609483',
            owner_name: 'Alexander Ospina',
            representative_id: newId
        })
        .eq('id', 'e817ba0e-8658-4be7-93c9-86fe7daab293');

    return NextResponse.json({
        success: true,
        newId,
        unitUpdated: !unitError,
        unitError: unitError?.message
    });
}
