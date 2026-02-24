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

        // 1. Find User by Document Number
        const { data: targetUser, error: userError } = await supabase
            .from("users")
            .select("id, full_name, role")
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

        // 3. Find All Units Represented by this User
        const { data: units, error: unitsError } = await supabase
            .from("units")
            .select("id, number")
            .eq("representative_id", targetUser.id);

        if (unitsError || !units || units.length === 0) {
            console.warn("Units fetch failed or empty:", unitsError);
            return { success: false, message: `El usuario ${targetUser.full_name} no representa ninguna unidad actualmente.` };
        }

        // 4. Register Attendance for ALL represented units
        const logsToInsert = units.map(u => ({ unit_id: u.id, user_id: targetUser.id }));

        const { error: attendanceError } = await supabase
            .from("attendance_logs")
            .upsert(logsToInsert, { onConflict: 'unit_id' });

        if (attendanceError) {
            console.error("Error registering via document:", attendanceError);
            return { success: false, message: `Error BD: ${attendanceError.message}` };
        }

        const unitNumbers = units.map(u => u.number).join(', ');

        revalidatePath("/dashboard");
        return {
            success: true,
            message: `Asistencia registrada: ${targetUser.full_name} (Unidades: ${unitNumbers})`,
            data: {
                name: targetUser.full_name,
                unit: unitNumbers
            }
        };

    } catch (error: any) {
        console.error("Critical error in registerAttendanceByDocument:", error);
        return { success: false, message: `Error Interno: ${error.message || JSON.stringify(error)}` };
    }
}
