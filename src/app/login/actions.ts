'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(prevState: any, formData: FormData) {
    const supabase = await createClient()

    const usernameInput = formData.get('username') as string
    const password = formData.get('password') as string

    // 1. Resolve username → email
    let emailToUse = usernameInput;
    if (!emailToUse.includes('@')) {
        const { data: emailData } = await supabase.rpc('get_email_by_username', {
            p_username: usernameInput
        });
        emailToUse = emailData || `${usernameInput}@phcore.local`;
    } else {
        // If it includes '@', it's already an email or an email-like username
        const { data: emailData } = await supabase.rpc('get_email_by_username', {
            p_username: usernameInput
        });
        emailToUse = emailData || usernameInput;
    }

    // 2. Sign in
    const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password,
    })

    if (error) {
        console.error("Login Error:", error.message)
        return { error: 'Usuario o contraseña incorrectos' }
    }

    // 3. Check role and redirect accordingly
    const userId = authData.user?.id
    if (userId) {
        const { data: profile } = await supabase
            .from('users')
            .select('role')
            .eq('id', userId)
            .single()

        revalidatePath('/', 'layout')
        if (profile?.role === 'SUPER_ADMIN') {
            redirect('/superadmin')
        }
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard')
}
