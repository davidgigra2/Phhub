"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function QuorumCard() {
    const [quorum, setQuorum] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    // Función para calcular el quórum total consultando la BD
    const fetchQuorum = async () => {
        try {
            // 1. Obtener todas las unidades (para sus coeficientes)
            const { data: units, error: unitsError } = await supabase
                .from("units")
                .select("id, coefficient");

            if (unitsError) throw unitsError;

            // 2. Obtener registros de asistencia únicos (qué unidades están presentes)
            const { data: attendance, error: attendanceError } = await supabase
                .from("attendance_logs")
                .select("unit_id");

            if (attendanceError) throw attendanceError;

            // 3. Filtrar unidades únicas presentes
            const presentUnitIds = new Set(attendance.map((a) => a.unit_id));

            // 4. Sumar coeficientes
            let totalCoefficient = 0;
            units.forEach((unit) => {
                if (presentUnitIds.has(unit.id)) {
                    totalCoefficient += Number(unit.coefficient);
                }
            });

            setQuorum(totalCoefficient);
        } catch (error) {
            console.error("Error calculating quorum:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQuorum();

        // Suscribirse a cambios en la tabla de asistencia
        const channel = supabase
            .channel("realtime_quorum")
            .on(
                "postgres_changes",
                {
                    event: "*", // Insert, Update, Delete
                    schema: "public",
                    table: "attendance_logs",
                },
                () => {
                    console.log("Attendance changed, updating quorum...");
                    fetchQuorum();
                }
            )
            .subscribe((status) => {
                console.log("Realtime Subscription Status:", status);
                if (status === 'SUBSCRIBED') {
                    fetchQuorum(); // Fetch initial data on connect
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    return (
        <Card className="bg-[#121212] border-white/5">
            <CardHeader>
                <CardTitle className="text-gray-200">Quórum Presente</CardTitle>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="text-xl text-gray-500">Calculando...</div>
                ) : (
                    <>
                        <div className={`text-3xl font-bold ${quorum >= 0.51 ? "text-emerald-500" : "text-yellow-500"}`}>
                            {(quorum * 100).toFixed(2)}%
                        </div>
                        <p className="text-sm text-gray-500 mt-2">
                            Necesario: 51.00%
                        </p>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
