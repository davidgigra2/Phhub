'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

function getServiceClient() {
    const { createClient: createSupabaseClient } = require('@supabase/supabase-js');
    return createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
    );
}

export async function createAssembly(prevState: any, formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autenticado' };

    const name = formData.get('name') as string;
    const address = formData.get('address') as string;
    const nit = formData.get('nit') as string;
    const city = formData.get('city') as string;
    const dateStr = formData.get('date') as string;

    if (!name?.trim()) return { error: 'El nombre es requerido' };

    const parsedDate = dateStr ? new Date(dateStr).toISOString() : new Date().toISOString();

    const admin = getServiceClient();
    const { data, error } = await admin
        .from('assemblies')
        .insert({
            name: name.trim(),
            address: address?.trim() || null,
            nit: nit?.trim() || null,
            city: city?.trim() || 'Bogotá',
            date: parsedDate,
            created_by: user.id
        })
        .select()
        .single();

    if (error) return { error: `Error: ${error.message}` };

    revalidatePath('/superadmin/assemblies');
    return { success: true, assembly: data };
}

export async function deleteAssembly(id: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autenticado' };

    const admin = getServiceClient();

    // Verify it's super admin
    const { data: adminUser } = await admin
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

    if (adminUser?.role !== 'SUPER_ADMIN') {
        return { error: 'No autorizado' };
    }

    // 1. Get all users belonging to this assembly
    const { data: usersToDelete } = await admin
        .from('users')
        .select('id')
        .eq('assembly_id', id);

    // 2. Before deleting users, clean up their proxies and signatures (FK constraints)
    if (usersToDelete && usersToDelete.length > 0) {
        const userIds = usersToDelete.map((u: any) => u.id);

        // Delete digital signatures that reference proxies of these users
        const { data: proxiesOfUsers } = await admin
            .from('proxies')
            .select('id')
            .in('principal_id', userIds);

        if (proxiesOfUsers && proxiesOfUsers.length > 0) {
            const proxyIds = proxiesOfUsers.map((p: any) => p.id);
            await admin.from('digital_signatures').delete().in('proxy_id', proxyIds);
        }

        // Delete all proxies where these users are principal or representative
        await admin.from('proxies').delete().in('principal_id', userIds);
        await admin.from('proxies').delete().in('representative_id', userIds);

        // Delete attendance logs for these users
        await admin.from('attendance_logs').delete().in('user_id', userIds);

        // Now delete from auth.users (cascades to public.users)
        // If auth deletion fails (e.g., because of dependent auth records), 
        // fall back to deleting from public.users directly
        for (const u of usersToDelete) {
            const { error: authErr } = await admin.auth.admin.deleteUser(u.id);
            if (authErr) {
                console.error(`Auth delete failed for ${u.id}, falling back to public.users delete:`, authErr.message);
                await admin.from('users').delete().eq('id', u.id);
            }
        }
    }

    // 3. Delete the assembly itself (Cascades to units, votes, options, ballots)
    const { error } = await admin.from('assemblies').delete().eq('id', id);
    if (error) return { error: error.message };

    revalidatePath('/superadmin/assemblies');
    return { success: true };
}

export async function editAssembly(prevState: any, formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autenticado' };

    const id = formData.get('id') as string;
    const name = formData.get('name') as string;
    const address = formData.get('address') as string;
    const nit = formData.get('nit') as string;
    const city = formData.get('city') as string;
    const dateStr = formData.get('date') as string;

    if (!id) return { error: 'ID de asamblea requerido' };
    if (!name?.trim()) return { error: 'El nombre es requerido' };

    const updates: any = {
        name: name.trim(),
        address: address?.trim() || null,
        nit: nit?.trim() || null,
        city: city?.trim() || 'Bogotá'
    };
    if (dateStr) {
        updates.date = new Date(dateStr).toISOString();
    }

    const admin = getServiceClient();
    const { data, error } = await admin
        .from('assemblies')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) return { error: `Error: ${error.message}` };

    revalidatePath('/superadmin/assemblies');
    revalidatePath(`/superadmin/assemblies/${id}`);
    return { success: true, assembly: data };
}

export interface UnitRow {
    number: string;
    coefficient: number;
    owner_name: string;
    document_number?: string;
    email?: string;
    owner_phone?: string;
}

export async function bulkUploadUnits(assemblyId: string, rows: UnitRow[]) {
    const admin = getServiceClient();

    const results = { created: 0, errors: [] as string[] };
    const userMap = new Map<string, string>();

    for (const row of rows) {
        let authUserId: string | null = null;
        let ownerDoc = row.document_number?.trim() || null;

        // Skip if there's no document number
        if (!ownerDoc) {
            results.errors.push(`Unidad ${row.number}: Documento de propietario requerido`);
            continue;
        }

        authUserId = userMap.get(ownerDoc) || null;

        if (!authUserId) {
            // First check public.users
            const { data: existingUser } = await admin.from('users').select('id').eq('document_number', ownerDoc).single();
            if (existingUser) {
                authUserId = existingUser.id;
            } else {
                // Create auth user for representative
                const authEmail = `${ownerDoc}@phcore.local`;
                const tempPassword = ownerDoc;

                const { data: newUser, error: authErr } = await admin.auth.admin.createUser({
                    email: authEmail,
                    password: tempPassword,
                    email_confirm: true,
                });

                if (authErr) {
                    if (authErr.message.includes('already registered')) {
                        const { data: existingUsers } = await admin.auth.admin.listUsers();
                        const existing = existingUsers?.users?.find((u: any) => u.email === authEmail);
                        if (existing) authUserId = existing.id;
                    } else {
                        results.errors.push(`Auth para ${ownerDoc}: ${authErr.message}`);
                        continue;
                    }
                } else {
                    authUserId = newUser.user!.id;
                }

                // Upsert public.users
                if (authUserId) {
                    await admin.from('users').upsert({
                        id: authUserId,
                        email: row.email?.trim() || authEmail,
                        full_name: row.owner_name,
                        role: 'USER',
                        document_number: ownerDoc,
                        assembly_id: assemblyId, // Scope del usuario a la asamblea
                    }, { onConflict: 'id' });
                }
            }
            if (authUserId) {
                userMap.set(ownerDoc, authUserId);
            }
        }

        // Insert unit WITH owner data and representative_id
        const { error: unitError } = await admin
            .from('units')
            .upsert(
                {
                    number: row.number,
                    coefficient: row.coefficient,
                    assembly_id: assemblyId,
                    owner_name: row.owner_name,
                    owner_document_number: ownerDoc,
                    owner_email: row.email?.trim() || null,
                    owner_phone: row.owner_phone?.trim() || null,
                    representative_id: authUserId // This establishes the 1:N relationship
                },
                { onConflict: 'number' }
            );

        if (unitError) {
            results.errors.push(`Unidad ${row.number}: ${unitError.message}`);
            continue;
        }

        results.created++;
    }

    // Update total_units count
    await admin
        .from('assemblies')
        .update({ total_units: results.created })
        .eq('id', assemblyId);

    revalidatePath(`/superadmin/assemblies/${assemblyId}`);
    return results;
}

export async function getAssemblyDetail(assemblyId: string) {
    const admin = getServiceClient();
    const { data: assembly } = await admin.from('assemblies').select('*').eq('id', assemblyId).single();
    const { data: units } = await admin.from('units').select('*, representative:users!units_representative_id_fkey(full_name, email, document_number)').eq('assembly_id', assemblyId).order('number');
    const { data: admins } = await admin.from('users').select('id, full_name, email').eq('assembly_id', assemblyId).eq('role', 'ADMIN');
    const { data: operators } = await admin.from('users').select('id, full_name, email').eq('assembly_id', assemblyId).eq('role', 'OPERATOR');
    return { assembly, units: units || [], admins: admins || [], operators: operators || [] };
}
