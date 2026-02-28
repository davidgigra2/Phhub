"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateVoteStatus(voteId: string, newStatus: 'OPEN' | 'PAUSED' | 'CLOSED') {
    const supabase = await createClient();

    // Verify Admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'ADMIN') throw new Error("Forbidden");

    // Use service role client to bypass RLS for the update
    const { createClient: createAdminClient } = await import('@supabase/supabase-js');
    const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data, error } = await supabaseAdmin
        .from('votes')
        .update({
            status: newStatus,
            ...(newStatus === 'OPEN' ? { opened_at: new Date().toISOString() } : {}),
            ...(newStatus === 'CLOSED' ? { closed_at: new Date().toISOString() } : {})
        })
        .eq('id', voteId)
        .select();

    const count = data?.length || 0;

    console.log(`[updateVoteStatus] voteId: ${voteId}, newStatus: ${newStatus}, updatedRows: ${count}, error: ${error?.message}`);

    if (error) throw error;
    if (count === 0) throw new Error(`Vote update failed. No rows modified for id: ${voteId}`);

    revalidatePath('/dashboard');
    revalidatePath('/admin');
}

export async function getVotesForDashboard(assemblyId: string): Promise<any[]> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

    const isAdmin = profile?.role === 'ADMIN';

    let query = supabase
        .from('votes')
        .select('*, vote_options(*), ballots(user_id)')
        .eq('assembly_id', assemblyId)
        .order('created_at', { ascending: false });

    if (!isAdmin) {
        query = query.in('status', ['OPEN', 'CLOSED']);
    }

    const { data } = await query;
    return data || [];
}

export async function updateVoteDetails(voteId: string, title: string, description: string) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
    if (profile?.role !== 'ADMIN') throw new Error("Forbidden");

    const { createClient: createAdminClient } = await import('@supabase/supabase-js');
    const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { error } = await supabaseAdmin.from('votes').update({ title, description }).eq('id', voteId);
    if (error) throw error;
}

export async function deleteVote(voteId: string) {
    const supabase = await createClient();

    // Verify Admin (Standard Client)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'ADMIN') throw new Error("Forbidden");

    // Perform Deletion (Service Role Client to bypass RLS and handle cascade)
    // We need to import createClient from supabase-js, not the server util which uses cookies
    const { createClient: createAdminClient } = await import('@supabase/supabase-js');
    const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    );

    // 1. Force delete ballots (orphaned ballots preventing vote deletion)
    const { error: ballotError } = await supabaseAdmin
        .from('ballots')
        .delete()
        .eq('vote_id', voteId);

    if (ballotError) {
        console.error("Error deleting ballots:", ballotError);
        throw new Error("Failed to clear ballots: " + ballotError.message);
    }

    // 2. Delete Vote Options (Cascade should handle this usually, but good to be explicit if needed, though CASCADE ON options is enabled)
    // Actually schema has ON DELETE CASCADE for options, so we can skip explicit delete, 
    // but we MUST delete ballots because they DON'T have cascade.

    // 3. Delete Vote
    const { error, count } = await supabaseAdmin
        .from('votes')
        .delete({ count: 'exact' })
        .eq('id', voteId);

    if (error) {
        console.error("Error deleting vote:", error);
        throw error;
    }

    if (count === 0) {
        console.warn(`[deleteVote] Warning: No rows deleted for voteId: ${voteId}`);
    }

    revalidatePath('/dashboard');
}
