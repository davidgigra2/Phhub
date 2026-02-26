"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface QuorumCardProps {
    assemblyId?: string;
}

export default function QuorumCard({ assemblyId }: QuorumCardProps) {
    const [quorum, setQuorum] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    // Función para calcular el quórum total consultando la BD
    const fetchQuorum = async () => {
        if (!assemblyId) {
            setQuorum(0);
            setLoading(false);
            return;
        }

        try {
            // 1. Obtener todas las unidades de ESTA ASAMBLEA (para sus coeficientes)
            const { data: units, error: unitsError } = await supabase
                .from("units")
                .select("id, coefficient")
                .eq('assembly_id', assemblyId);

            if (unitsError) throw unitsError;

            // 2. Obtener registros de asistencia únicos (qué unidades están presentes)
            // Ya que filtramos los coeficientes de las unidades arriba, podemos traer todos los attendance de esas unidades
            const unitIds = units ? units.map(u => u.id) : [];
            if (unitIds.length === 0) {
                setQuorum(0);
                return;
            }

            const { data: attendance, error: attendanceError } = await supabase
                .from("attendance_logs")
                .select("unit_id")
                .in('unit_id', unitIds);

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
        if (!assemblyId) {
            setLoading(false);
            return;
        }

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
                    console.log("Attendance changed, checking quorum for assembly:", assemblyId);
                    fetchQuorum();
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    fetchQuorum(); // Fetch initial data on connect
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [assemblyId]);

    const percentage = Math.min(Math.max((quorum || 0) * 100, 0), 100);
    const hasQuorum = (quorum || 0) > 0.5;

    return (
        <Card className="bg-[#121212] border-white/5 h-full flex flex-col shadow-lg rounded-2xl">
            <CardHeader className="pb-2">
                <CardTitle className="text-gray-400 text-xs font-black uppercase tracking-widest">Quórum Presente</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-end">
                {loading ? (
                    <div className="flex justify-between text-sm mt-3 animate-pulse">
                        <div className="h-6 w-16 bg-white/10 rounded"></div>
                    </div>
                ) : (
                    <>
                        <div className={`text-4xl font-black tracking-tight ${hasQuorum ? "text-emerald-500" : "text-yellow-500"}`}>
                            {(quorum * 100).toFixed(2)}%
                        </div>
                        <div className="flex justify-between text-xs mt-3">
                            <span className="text-gray-500 font-medium">Req: &gt;50.00%</span>
                            <span className={`font-bold ${hasQuorum ? "text-emerald-400" : "text-yellow-400"}`}>
                                {hasQuorum ? "Quórum Alcanzado" : "Esperando Quórum"}
                            </span>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
