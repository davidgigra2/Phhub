"use server";

import { createClient } from "@/lib/supabase/server";

export async function getAttendanceReport() {
    const supabase = await createClient();

    // Get all units that are PRESENT
    const { data: attendance } = await supabase
        .from("attendance_logs")
        .select(`
            created_at,
            units (
                number,
                coefficient,
                users (full_name, document_number)
            )
        `)
        .order("created_at", { ascending: false });

    // Calculate total coefficient
    let totalCoefficient = 0;
    const reportData = attendance?.map((item: any) => {
        const coef = item.units?.coefficient || 0;
        totalCoefficient += coef;
        return {
            unit: item.units?.number,
            coefficient: coef,
            representative: item.units?.users?.[0]?.full_name || "Sin Asignar", // Assuming 1 user per unit for simplicity, or grab first
            checkInTime: new Date(item.created_at).toLocaleString()
        };
    }) || [];

    return { data: reportData, totalCoefficient };
}

export async function getAbsenceReport() {
    const supabase = await createClient();

    // Get ALL units
    const { data: allUnits } = await supabase
        .from("units")
        .select("id, number, coefficient, users(full_name)");

    // Get PRESENT unit IDs
    const { data: presentLogs } = await supabase
        .from("attendance_logs")
        .select("unit_id");

    const presentIds = new Set(presentLogs?.map((l: any) => l.unit_id));

    // Filter ABSENT
    const absentUnits = allUnits?.filter((u: any) => !presentIds.has(u.id)) || [];

    let totalAbsentCoefficient = 0;
    const reportData = absentUnits.map((u: any) => {
        const coef = u.coefficient || 0;
        totalAbsentCoefficient += coef;
        return {
            unit: u.number,
            coefficient: coef,
            representative: u.users?.[0]?.full_name || "Sin Asignar"
        };
    });

    return { data: reportData, totalAbsentCoefficient };
}

export async function getVotesReport() {
    const supabase = await createClient();

    // Get all votes with options
    const { data: votes } = await supabase
        .from("votes")
        .select("*, vote_options(*)")
        .order("created_at", { ascending: false });

    // For each vote, get results (this might be heavy with many votes, better to fetch on demand per vote, but user asked for "Results report")
    // We'll return the list of votes, and maybe the client fetches details, OR we fetch refined summaries here.
    // Let's do a summary here.

    const reports = [];

    if (votes) {
        for (const vote of votes) {
            // Get ballots for this vote
            const { data: ballots } = await supabase
                .from("ballots")
                .select("option_id, weight, units(number)") // We track who voted for what? Or just totals? "Resultados detallados" usually implies who voted what is secret? 
                // Creating a simplified result: Option | Votes | Weight | %
                .eq("vote_id", vote.id);

            const results: Record<string, { count: number, weight: number, name: string }> = {};

            // Init options
            vote.vote_options?.forEach((opt: any) => {
                results[opt.id] = { count: 0, weight: 0, name: opt.option_text };
            });

            // Tally
            let totalVoteWeight = 0;
            ballots?.forEach((b: any) => {
                if (results[b.option_id]) {
                    results[b.option_id].count++;
                    results[b.option_id].weight += (b.weight || 0);
                    totalVoteWeight += (b.weight || 0);
                }
            });

            reports.push({
                id: vote.id,
                title: vote.title,
                status: vote.status,
                totalWeight: totalVoteWeight,
                results: Object.values(results).map(r => ({
                    option: r.name,
                    count: r.count,
                    weight: r.weight,
                    percentage: totalVoteWeight > 0 ? (r.weight / totalVoteWeight) * 100 : 0
                }))
            });
        }
    }

    return reports;
}

export async function getProxiesReport() {
    const supabase = await createClient();

    const { data: proxies } = await supabase
        .from("proxies")
        .select(`
            *,
            principal:users!proxies_principal_id_fkey(full_name, document_number, units(number, coefficient)),
            representative:users!proxies_representative_id_fkey(full_name, document_number)
        `)
        .order("created_at", { ascending: false });

    return proxies?.map((p: any) => ({
        id: p.id,
        type: p.type,
        status: p.status,
        principal: p.principal?.full_name,
        principalUnit: p.principal?.units?.number,
        principalCoef: p.principal?.units?.coefficient,
        representative: p.representative?.full_name || p.external_name || "Desconocido",
        representativeDoc: p.representative?.document_number || p.external_doc_number,
        date: new Date(p.created_at).toLocaleDateString()
    })) || [];
}
