'use server';

import { revalidatePath } from 'next/cache';

function getServiceClient() {
    const { createClient } = require('@supabase/supabase-js');
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
    );
}

interface CreateUserInput {
    fullName: string;
    email: string;
    password: string;
    assemblyId: string;
    role: 'ADMIN' | 'OPERATOR';
    username?: string;
}

export async function createManagedUser(prevState: any, formData: FormData) {
    const role = formData.get('role') as 'ADMIN' | 'OPERATOR';
    const fullName = (formData.get('fullName') as string)?.trim();
    const email = (formData.get('email') as string)?.trim();
    const password = (formData.get('password') as string)?.trim();
    const assemblyId = (formData.get('assemblyId') as string)?.trim();
    const username = (formData.get('username') as string)?.trim();

    if (!fullName || !email || !password || !assemblyId || !username) {
        return { error: 'Todos los campos marcados con * son requeridos' };
    }

    if (password.length < 6) {
        return { error: 'La contraseña debe tener al menos 6 caracteres' };
    }

    const admin = getServiceClient();

    // 1. Create auth user with username email
    const authEmail = `${username}@phcore.local`;

    const { data: newAuthUser, error: authError } = await admin.auth.admin.createUser({
        email: authEmail,
        password,
        email_confirm: true,
    });

    if (authError) {
        return { error: `Error creando usuario de autenticación: ${authError.message}` };
    }

    const authId = newAuthUser.user!.id;

    // 2. Create public.users record saving the REAL email
    const { error: profileError } = await admin.from('users').insert({
        id: authId,
        email: email, // save the real business email here
        full_name: fullName,
        role,
        assembly_id: assemblyId,
        username: username,
    });

    if (profileError) {
        // Rollback auth user
        await admin.auth.admin.deleteUser(authId);

        let errorMessage = profileError.message;
        if (errorMessage.includes('users_username_key')) {
            errorMessage = 'El nombre de usuario ya está en uso. Por favor, elige otro o déjalo en blanco.';
        }

        return { error: `Error creando perfil: ${errorMessage}` };
    }

    revalidatePath('/superadmin/users');
    revalidatePath('/superadmin/operators');
    revalidatePath(`/superadmin/assemblies/${assemblyId}`);
    return { success: true, message: `${role === 'ADMIN' ? 'Administrador' : 'Operador'} creado exitosamente` };
}

export async function getAllAssemblies() {
    const admin = getServiceClient();
    const { data } = await admin.from('assemblies').select('id, name').order('name');
    return data || [];
}

export async function getManagedUsers(role: 'ADMIN' | 'OPERATOR') {
    const admin = getServiceClient();
    const { data } = await admin
        .from('users')
        .select('id, full_name, email, username, assembly_id, assemblies!users_assembly_id_fkey(name)')
        .eq('role', role)
        .order('full_name');
    return data || [];
}

export async function deleteManagedUser(userId: string) {
    const admin = getServiceClient();
    // Delete public profile first
    await admin.from('users').delete().eq('id', userId);
    // Delete auth user
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) return { error: error.message };
    revalidatePath('/superadmin/users');
    revalidatePath('/superadmin/operators');
    return { success: true };
}

export async function updateManagedUser(prevState: any, formData: FormData) {
    const id = formData.get('id') as string;
    const role = formData.get('role') as 'ADMIN' | 'OPERATOR';
    const fullName = (formData.get('fullName') as string)?.trim();
    const email = (formData.get('email') as string)?.trim();
    const password = (formData.get('password') as string)?.trim();
    const assemblyId = (formData.get('assemblyId') as string)?.trim();
    const username = (formData.get('username') as string)?.trim();

    if (!id || !fullName || !email || !assemblyId || !username) {
        return { error: 'Todos los campos marcados con * son requeridos' };
    }

    const admin = getServiceClient();
    const authEmail = `${username}@phcore.local`;

    // 1. Update auth user if username or password changed
    const authUpdates: any = { email: authEmail };
    if (password) {
        if (password.length < 6) {
            return { error: 'La nueva contraseña debe tener al menos 6 caracteres' };
        }
        authUpdates.password = password;
    }

    const { error: authError } = await admin.auth.admin.updateUserById(id, authUpdates);

    if (authError && !authError.message.includes('same')) {
        return { error: `Error actualizando credenciales: ${authError.message}` };
    }

    // 2. Update public.users record
    const { error: profileError } = await admin.from('users').update({
        email: email, // save the real business email here
        full_name: fullName,
        assembly_id: assemblyId,
        username: username,
    }).eq('id', id);

    if (profileError) {
        let errorMessage = profileError.message;
        if (errorMessage.includes('users_username_key')) {
            errorMessage = 'El nombre de usuario ya está en uso. Por favor, elige otro o déjalo en blanco.';
        }
        return { error: `Error actualizando perfil: ${errorMessage}` };
    }

    revalidatePath('/superadmin/users');
    revalidatePath('/superadmin/operators');
    revalidatePath(`/superadmin/assemblies/${assemblyId}`);
    return { success: true, message: `${role === 'ADMIN' ? 'Administrador' : 'Operador'} actualizado exitosamente` };
}
