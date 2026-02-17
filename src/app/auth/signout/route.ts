import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { type NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
    const supabase = await createClient()

    // Check if a user's logged in
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (user) {
        await supabase.auth.signOut()
    }

    revalidatePath('/', 'layout')

    // Use the 'origin' header from the request (browser) to ensure we redirect to the correct domain/IP
    // falling back to req.url's origin if not present (server-side calls)
    const origin = req.headers.get('origin') || new URL(req.url).origin

    return NextResponse.redirect(`${origin}/login`, {
        status: 302,
    })
}
