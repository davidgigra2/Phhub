"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function castVote(formData: FormData) {
    const supabase = await createClient();

    const vote_id = formData.get("vote_id") as string;
    const option_id = formData.get("option_id") as string;

    const proxied_username = formData.get("proxied_username") as string | null;

    // 1. Get Current User (Actor)
    const { data: { user: actor } } = await supabase.auth.getUser();
    if (!actor) return redirect("/login");

    // 2. Determine Target User (Voter)
    let targetUserId = actor.id;

    // If acting as proxy (Operator/Admin logic)
    if (proxied_username) {
        // Verify Actor Role
        const { data: actorProfile } = await supabase
            .from("users")
            .select("role")
            .eq("id", actor.id)
            .single();

        const canProxy = actorProfile?.role === 'OPERATOR' || actorProfile?.role === 'ADMIN';

        if (!canProxy) {
            throw new Error("No tienes permisos para votar por otros usuarios.");
        }

        // Find Target User by Username OR Document Number (Cedula)
        const { data: targetUser } = await supabase
            .from("users")
            .select("id")
            .or(`username.eq.${proxied_username},document_number.eq.${proxied_username}`)
            .single();

        if (!targetUser) {
            return { success: false, message: `Usuario con cédula/usuario '${proxied_username}' no encontrado.`, code: "USER_NOT_FOUND" };
        }

        targetUserId = targetUser.id;
    }

    // 3. Get Target User's Unit & Coefficient
    const { data: profile } = await supabase
        .from("users")
        .select("unit_id, units(coefficient)")
        .eq("id", targetUserId)
        .single();

    if (!profile?.unit_id) {
        return { success: false, message: "El usuario seleccionado no tiene una unidad asignada y no puede votar." };
    }

    // 4. Check if already voted
    const { data: existingVote } = await supabase
        .from("ballots")
        .select("id")
        .eq("vote_id", vote_id)
        .eq("user_id", targetUserId)
        .single();

    if (existingVote) {
        // Feedback only, no error error, but return code so UI can clear inputs
        return { success: false, message: "El usuario ya ha votado en esta pregunta.", code: "ALREADY_VOTED" };
    }

    // 5. Calculate Total Weight (Own + Proxies)
    const { data: proxies } = await supabase
        .from("proxies")
        .select(`
            principal:users!proxies_principal_id_fkey (
                units (coefficient)
            )
        `)
        .eq("representative_id", targetUserId)
        .eq("status", "APPROVED");

    const userUnit = profile.units as any;
    let totalWeight = Array.isArray(userUnit) ? userUnit[0]?.coefficient : userUnit?.coefficient || 0;

    // Add weight from proxies
    if (proxies && proxies.length > 0) {
        const proxyWeight = proxies.reduce((sum, p: any) => {
            const unit = p.principal?.units;
            const coef = Array.isArray(unit) ? unit[0]?.coefficient : unit?.coefficient;
            return sum + (coef || 0);
        }, 0);
        totalWeight += proxyWeight;
    }

    // 6. Cast Vote
    const { error } = await supabase.from("ballots").insert({
        vote_id,
        option_id,
        unit_id: profile.unit_id,
        user_id: targetUserId,
        weight: totalWeight
    });

    if (error) {
        console.error("Error casting vote:", error);
        return { success: false, message: "Error al registrar el voto: " + error.message };
    }

    // Also mark attendance for proxies? Optional but good practice.
    // For now we just record the vote weight.

    revalidatePath("/dashboard");
    return { success: true, message: `Voto registrado exitosamente. Peso total: ${Number(totalWeight).toFixed(4)}` };
}
