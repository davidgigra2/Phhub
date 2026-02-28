"use server";

import { createClient } from "@/lib/supabase/server";

function getServiceClient() {
    const { createClient: createSupabaseClient } = require('@supabase/supabase-js');
    return createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
    );
}

// Helper function to resolve the target assembly ID for the report
async function getTargetAssemblyId(supabase: any, requestedAssemblyId?: string) {
    if (requestedAssemblyId) return requestedAssemblyId;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: userProfile } = await supabase
        .from("users")
        .select("assembly_id")
        .eq("id", user.id)
        .single();

    return userProfile?.assembly_id;
}

export async function getAttendanceReport(requestedAssemblyId?: string) {
    const supabase = await createClient();
    const assemblyId = await getTargetAssemblyId(supabase, requestedAssemblyId);
    if (!assemblyId) return { data: [], totalCoefficient: 0 };

    let query = supabase.from("attendance_logs").select(`
        check_in_time,
        units!inner (
            assembly_id,
            number,
            coefficient,
            owner_name
        )
    `);

    if (assemblyId) {
        query = query.eq('units.assembly_id', assemblyId);
    }

    const { data: attendance } = await query.order("check_in_time", { ascending: false });

    let totalCoefficient = 0;
    const reportData = attendance?.map((item: any) => {
        const coef = item.units?.coefficient || 0;
        totalCoefficient += coef;
        return {
            unit: item.units?.number,
            coefficient: coef,
            representative: item.units?.owner_name || "Sin Asignar",
            checkInTime: new Date(item.check_in_time).toLocaleString()
        };
    }) || [];

    return { data: reportData, totalCoefficient };
}

export async function getAbsenceReport(requestedAssemblyId?: string) {
    const supabase = await createClient();
    const assemblyId = await getTargetAssemblyId(supabase, requestedAssemblyId);
    if (!assemblyId) return { data: [], totalAbsentCoefficient: 0 };

    // Get ALL units for assembly
    const { data: allUnits } = await supabase
        .from("units")
        .select("id, number, coefficient, owner_name")
        .eq("assembly_id", assemblyId);

    // Get PRESENT unit IDs using the unit IDs already fetched for this assembly
    const assemblyUnitIds = allUnits?.map((u: any) => u.id) || [];
    const { data: presentLogs } = await supabase
        .from("attendance_logs")
        .select("unit_id")
        .in("unit_id", assemblyUnitIds);

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
            representative: u.owner_name || "Sin Asignar"
        };
    });

    return { data: reportData, totalAbsentCoefficient };
}

export async function getVotesReport(requestedAssemblyId?: string) {
    const supabase = await createClient();
    const assemblyId = await getTargetAssemblyId(supabase, requestedAssemblyId);
    if (!assemblyId) return [];

    const { data: votes } = await supabase
        .from("votes")
        .select("*, vote_options(*)")
        .eq("assembly_id", assemblyId)
        .order("created_at", { ascending: false });

    const reports = [];

    if (votes) {
        for (const vote of votes) {
            const { data: ballots } = await supabase
                .from("ballots")
                .select("option_id, weight, units(number)")
                .eq("vote_id", vote.id);

            const results: Record<string, { count: number, weight: number, name: string }> = {};

            vote.vote_options?.forEach((opt: any) => {
                results[opt.id] = { count: 0, weight: 0, name: opt.label };
            });

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

export async function getProxiesReport(requestedAssemblyId?: string) {
    const supabase = await createClient();
    const assemblyId = await getTargetAssemblyId(supabase, requestedAssemblyId);
    if (!assemblyId) return [];

    const admin = getServiceClient();
    const BATCH = 50;

    // 1. Todos los poderes APPROVED (son pocos, ~100 max)
    const { data: allProxies } = await admin
        .from('proxies')
        .select('id, type, status, created_at, external_name, external_doc_number, principal_id, representative_id, document_url')
        .eq('status', 'APPROVED')
        .order('created_at', { ascending: false });

    if (!allProxies || allProxies.length === 0) return [];

    // 2. Buscar usuarios principals en batches para evitar URL limit
    const allPrincipalIds = [...new Set(allProxies.map((p: any) => p.principal_id).filter(Boolean))] as string[];
    const principalUsers: any[] = [];
    for (let i = 0; i < allPrincipalIds.length; i += BATCH) {
        const { data } = await admin.from('users')
            .select('id, full_name, document_number, assembly_id')
            .in('id', allPrincipalIds.slice(i, i + BATCH));
        if (data) principalUsers.push(...data);
    }

    // 3. Filtrar solo los que pertenecen a esta asamblea
    const assemblyPrincipals = principalUsers.filter((u: any) => u.assembly_id === assemblyId);
    const assemblyPrincipalIds = new Set(assemblyPrincipals.map((u: any) => u.id));
    const assemblyProxies = allProxies.filter((p: any) => assemblyPrincipalIds.has(p.principal_id));

    if (assemblyProxies.length === 0) return [];

    // 4. Usuarios apoderados en batches
    const repIds = [...new Set(assemblyProxies.map((p: any) => p.representative_id).filter(Boolean))] as string[];
    const repUsers: any[] = [];
    for (let i = 0; i < repIds.length; i += BATCH) {
        const { data } = await admin.from('users')
            .select('id, full_name, document_number')
            .in('id', repIds.slice(i, i + BATCH));
        if (data) repUsers.push(...data);
    }

    // 5. Unidades por document_number del principal (en batches)
    const ownerDocs = assemblyPrincipals.map((u: any) => u.document_number).filter(Boolean) as string[];
    const unitsList: any[] = [];
    for (let i = 0; i < ownerDocs.length; i += BATCH) {
        const { data } = await admin.from('units')
            .select('number, coefficient, owner_document_number')
            .eq('assembly_id', assemblyId)
            .in('owner_document_number', ownerDocs.slice(i, i + BATCH));
        if (data) unitsList.push(...data);
    }

    // Mapas para lookup rápido
    const ownerMap = new Map(assemblyPrincipals.map((u: any) => [u.id, u]));
    const repMap = new Map(repUsers.map((u: any) => [u.id, u]));
    const unitsByOwnerDoc = new Map<string, any>();
    unitsList.forEach((u: any) => {
        if (u.owner_document_number && !unitsByOwnerDoc.has(u.owner_document_number)) {
            unitsByOwnerDoc.set(u.owner_document_number, u);
        }
    });

    return assemblyProxies.map((p: any) => {
        const principal = ownerMap.get(p.principal_id) as any;
        const representative = p.representative_id ? repMap.get(p.representative_id) as any : null;
        const principalUnit = principal ? unitsByOwnerDoc.get(principal.document_number) : null;
        return {
            id: p.id,
            type: p.type,
            status: p.status,
            principal: principal?.full_name || '—',
            principalDoc: principal?.document_number || '—',
            principalUnit: principalUnit?.number || '—',
            principalCoef: principalUnit?.coefficient || 0,
            representative: representative?.full_name || p.external_name || 'Desconocido',
            representativeDoc: representative?.document_number || p.external_doc_number || '—',
            date: new Date(p.created_at).toLocaleDateString(),
            documentUrl: p.document_url || null
        };
    });
}
