"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function registerAttendance(unitId: string) {
    const supabase = await createClient();

    // Verify permissions (Admin/Operator only)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: actor } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

    if (!actor || (actor.role !== 'ADMIN' && actor.role !== 'OPERATOR')) {
        throw new Error("Forbidden: Permission denied");
    }

    // Insert (will fail if unique constraint violated, but we can ignore or handle)
    const { error } = await supabase
        .from("attendance_logs")
        .upsert({ unit_id: unitId }, { onConflict: 'unit_id' });

    if (error) {
        console.error("Error registering attendance:", error);
        return { success: false, message: error.message };
    }

    revalidatePath("/dashboard");
    return { success: true };
}

export async function removeAttendance(unitId: string) {
    const supabase = await createClient();

    // Verify permissions
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: actor } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

    if (!actor || (actor.role !== 'ADMIN' && actor.role !== 'OPERATOR')) {
        throw new Error("Forbidden: Permission denied");
    }

    const { error } = await supabase
        .from("attendance_logs")
        .delete()
        .eq("unit_id", unitId);

    if (error) {
        console.error("Error removing attendance:", error);
        return { success: false, message: error.message };
    }

    revalidatePath("/dashboard");
    return { success: true };
}

export async function registerAttendanceByDocument(documentNumber: string) {
    const supabase = await createClient();

    try {
        // Verify permissions
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, message: "No autenticado." };

        const { data: actor } = await supabase
            .from("users")
            .select("role")
            .eq("id", user.id)
            .single();

        if (!actor || (actor.role !== 'ADMIN' && actor.role !== 'OPERATOR')) {
            return { success: false, message: "No tienes permisos de Operador." };
        }

        // 1. Find User by Document Number (Simple Scalar Query)
        const { data: targetUser, error: userError } = await supabase
            .from("users")
            .select("id, full_name, role, unit_id")
            .eq("document_number", documentNumber)
            .single();

        if (userError || !targetUser) {
            console.warn(`Attendance failed: Document ${documentNumber} not found. Error:`, userError);
            return { success: false, message: `Usuario no encontrado (Doc: ${documentNumber}).` };
        }

        // 2. Validate Role (Only 'USER' - Asambleísta allowed)
        if (targetUser.role !== 'USER') {
            return { success: false, message: `El usuario ${targetUser.full_name} no es un Asambleísta (Rol: ${targetUser.role}).` };
        }

        // 3. Validate Unit (Explicit Fetch)
        if (!targetUser.unit_id) {
            return { success: false, message: `El usuario ${targetUser.full_name} no tiene unidad asignada (unit_id null).` };
        }

        const { data: unit, error: unitError } = await supabase
            .from("units")
            .select("id, number")
            .eq("id", targetUser.unit_id)
            .single();

        if (unitError || !unit) {
            console.warn("Unit fetch failed:", unitError);
            return { success: false, message: `Error al buscar la unidad ${targetUser.unit_id}.` };
        }

        // 4. Register Attendance
        const { error: attendanceError } = await supabase
            .from("attendance_logs")
            .upsert({ unit_id: unit.id }, { onConflict: 'unit_id' });

        if (attendanceError) {
            console.error("Error registering via document:", attendanceError);
            return { success: false, message: `Error BD: ${attendanceError.message}` };
        }

        revalidatePath("/dashboard");
        return {
            success: true,
            message: `Asistencia registrada: ${targetUser.full_name} (Unidad ${unit.number})`,
            data: {
                name: targetUser.full_name,
                unit: unit.number
            }
        };

    } catch (error: any) {
        console.error("Critical error in registerAttendanceByDocument:", error);
        return { success: false, message: `Error Interno: ${error.message || JSON.stringify(error)}` };
    }
}
