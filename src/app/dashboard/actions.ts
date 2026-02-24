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

    // 3. Get Target User's Units & Coefficients
    const { data: userUnits } = await supabase
        .from("units")
        .select("id, coefficient")
        .eq("representative_id", targetUserId);

    if (!userUnits || userUnits.length === 0) {
        return { success: false, message: "El usuario seleccionado no representa ninguna unidad y no puede votar." };
    }

    // 4. For each unit the user represents, check if it already voted and cast the vote
    let totalWeightCasted = 0;
    let newBallotsCasted = 0;

    for (const unit of userUnits) {
        // Check if this specific unit already voted
        const { data: existingVote } = await supabase
            .from("ballots")
            .select("id")
            .eq("vote_id", vote_id)
            .eq("unit_id", unit.id)
            .single();

        if (existingVote) continue; // Skip units that already voted

        // Cast Vote for this unit
        const { error } = await supabase.from("ballots").insert({
            vote_id,
            option_id,
            unit_id: unit.id,
            user_id: targetUserId,
            weight: unit.coefficient
        });

        if (error) {
            console.error(`Error casting vote for unit ${unit.id}:`, error);
            continue; // Continue with other units even if one fails
        }

        totalWeightCasted += Number(unit.coefficient);
        newBallotsCasted++;
    }

    if (newBallotsCasted === 0) {
        return { success: false, message: "Todas las unidades representadas por este usuario ya han votado.", code: "ALREADY_VOTED" };
    }

    revalidatePath("/dashboard");
    return { success: true, message: `Voto registrado exitosamente para ${newBallotsCasted} unidades. Peso total sumado: ${totalWeightCasted.toFixed(4)}` };
}
