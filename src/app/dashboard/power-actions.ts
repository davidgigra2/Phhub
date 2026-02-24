"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ProxyType = 'DIGITAL' | 'PDF' | 'OPERATOR';

export async function registerProxy(params: {
    representativeDoc?: string; // If known by document
    representativeId?: string;  // If selected from list
    type: ProxyType;
    externalName?: string;
    externalDoc?: string;
    ownerDoc?: string; // NEW: The owner of the unit (Principal)
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "No autenticado" };

    try {
        let representativeId = params.representativeId;
        let principalId = user.id; // Default is the user GIVING power

        // IF OPERATOR: principalId is NOT the actor, but the user identified by ownerDoc
        if (params.type === 'OPERATOR' && params.ownerDoc) {
            const { data: ownerUser } = await supabase
                .from("users")
                .select("id")
                .eq("document_number", params.ownerDoc)
                .single();

            if (!ownerUser) {
                return { success: false, message: `Propietario con documento '${params.ownerDoc}' no encontrado.` };
            }
            principalId = ownerUser.id;
        }

        // If doc number provided, find user
        if (!representativeId && params.representativeDoc) {
            const { data: repUser } = await supabase
                .from("users")
                .select("id")
                .eq("document_number", params.representativeDoc)
                .single();

            if (repUser) {
                representativeId = repUser.id;
            } else if (params.type === 'OPERATOR') {
                // Operator can maybe regsiter external? For now fail if not found unless specific logic
                // If External, we store just the text fields
            } else {
                return { success: false, message: "Representante no encontrado por documento." };
            }
        }

        if (representativeId === user.id) {
            return { success: false, message: "No puedes representarte a ti mismo como tercero." };
        }

        // Insert Proxy
        const { error } = await supabase.from("proxies").insert({
            principal_id: principalId,
            representative_id: representativeId,
            external_name: params.externalName,
            external_doc_number: params.externalDoc || params.representativeDoc,
            type: params.type,
            status: 'APPROVED',
            is_external: !representativeId
        });

        if (error) throw error;

        revalidatePath("/dashboard");
        return { success: true, message: "Poder registrado exitosamente." };

    } catch (error: any) {
        console.error("Error registering proxy:", error);
        return { success: false, message: error.message };
    }
}

export async function revokeProxy(proxyId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "No autenticado" };

    // Verify ownership
    const { error } = await supabase
        .from("proxies")
        .update({ status: 'REVOKED' })
        .eq("id", proxyId)
        .eq("principal_id", user.id); // Security check

    if (error) return { success: false, message: error.message };

    revalidatePath("/dashboard");
    return { success: true, message: "Poder revocado." };
}

export async function getMyPowerStats(userId: string) {
    const supabase = await createClient();

    // With the new 1:N schema, all units represented by the user are found where representative_id = userId
    const { data: representedUnitsData } = await supabase
        .from("units")
        .select("number, coefficient, owner_document_number")
        .eq("representative_id", userId);

    let totalWeight = 0;
    const representedUnits: any[] = [];

    // Assuming we can identify whether a unit is "owned" by them vs "proxied"
    // For now, ANY unit they represent adds to their weight.
    representedUnitsData?.forEach((u: any) => {
        const coef = u.coefficient || 0;
        totalWeight += coef;
        representedUnits.push({
            name: u.owner_document_number || "Usuario",
            unit: u.number,
            coefficient: coef
        });
    });

    return {
        ownWeight: totalWeight, // We unify this now since they simply represent a total pool of weight
        representedWeight: 0,   // Included in totalWeight
        totalWeight: totalWeight,
        representedUnits
    };
}
