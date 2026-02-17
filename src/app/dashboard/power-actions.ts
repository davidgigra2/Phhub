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
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "No autenticado" };

    try {
        let representativeId = params.representativeId;

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
            principal_id: user.id,
            representative_id: representativeId,
            external_name: params.externalName,
            external_doc_number: params.externalDoc || params.representativeDoc,
            type: params.type,
            status: 'APPROVED', // Auto-approve for now, or PENDING if digital flow
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

    // 1. My Unit weight
    const { data: myUser } = await supabase
        .from("users")
        .select("*, units(coefficient)")
        .eq("id", userId)
        .single();

    const myWeight = myUser?.units?.coefficient || 0;

    // 2. Represented weights
    const { data: proxies } = await supabase
        .from("proxies")
        .select(`
            principal_id,
            users!proxies_principal_id_fkey (
                full_name,
                units (
                    coefficient,
                    number
                )
            )
        `)
        .eq("representative_id", userId)
        .eq("status", "APPROVED");

    let representedWeight = 0;
    const representedUnits: any[] = [];

    proxies?.forEach((p: any) => {
        const u = p.users;
        const coef = u.units?.coefficient || 0;
        representedWeight += coef;
        representedUnits.push({
            name: u.full_name,
            unit: u.units?.number,
            coefficient: coef
        });
    });

    return {
        ownWeight: myWeight,
        representedWeight,
        totalWeight: myWeight + representedWeight,
        representedUnits
    };
}
