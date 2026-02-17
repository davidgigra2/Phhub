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

    // 5. Cast Vote
    const { error } = await supabase.from("ballots").insert({
        vote_id,
        option_id,
        unit_id: profile.unit_id,
        user_id: targetUserId,
        // @ts-ignore: Supabase types for joined tables
        weight: Array.isArray(profile.units) ? profile.units[0]?.coefficient : profile.units?.coefficient
    });

    if (error) {
        console.error("Error casting vote:", error);
        return { success: false, message: "Error al registrar el voto: " + error.message };
    }

    revalidatePath("/dashboard");
    return { success: true, message: "Voto registrado exitosamente." };
}
