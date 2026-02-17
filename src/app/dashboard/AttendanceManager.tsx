"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, UserCheck, UserX, Users, Loader2 } from "lucide-react";
import { registerAttendance, removeAttendance } from "./attendance-actions";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Unit {
    id: string;
    unit_number: string;
    coefficient: number;
    users?: {
        username: string;
        document_number: string;
    }[];
}

interface AttendanceManagerProps {
    units: Unit[];
}

export default function AttendanceManager({ units }: AttendanceManagerProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [presentUnitIds, setPresentUnitIds] = useState<Set<string>>(new Set());
    const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
    const [initializing, setInitializing] = useState(true);
    const supabase = createClient();

    // Initialize: Fetch current attendance
    useEffect(() => {
        const fetchAttendance = async () => {
            const { data, error } = await supabase.from("attendance_logs").select("unit_id");
            if (data) {
                setPresentUnitIds(new Set(data.map(d => d.unit_id)));
            }
            setInitializing(false);
        };

        fetchAttendance();

        // Realtime Subscription
        const channel = supabase
            .channel("attendance-manager")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "attendance_logs" },
                (payload) => {
                    if (payload.eventType === "INSERT") {
                        setPresentUnitIds(prev => new Set(prev).add(payload.new.unit_id));
                    } else if (payload.eventType === "DELETE") {
                        setPresentUnitIds(prev => {
                            const next = new Set(prev);
                            next.delete(payload.old.unit_id);
                            return next;
                        });
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase]);

    const toggleAttendance = async (unitId: string) => {
        const isPresent = presentUnitIds.has(unitId);
        setLoadingMap(prev => ({ ...prev, [unitId]: true }));

        try {
            if (isPresent) {
                await removeAttendance(unitId);
                // Optimistic update handled by Realtime, but we can force it locally too for responsiveness
            } else {
                await registerAttendance(unitId);
            }
        } catch (error) {
            console.error("Failed to toggle attendance:", error);
        } finally {
            setLoadingMap(prev => ({ ...prev, [unitId]: false }));
        }
    };

    // Filter units
    const filteredUnits = useMemo(() => {
        if (!searchQuery) return units;
        const lowerQ = searchQuery.toLowerCase();
        return units.filter(u =>
            u.unit_number.toLowerCase().includes(lowerQ) ||
            u.users?.[0]?.username.toLowerCase().includes(lowerQ) ||
            u.users?.[0]?.document_number?.includes(lowerQ)
        );
    }, [units, searchQuery]);

    // Stats
    const totalCoefficient = units.reduce((acc, u) => acc + Number(u.coefficient), 0);
    const presentCoefficient = units
        .filter(u => presentUnitIds.has(u.id))
        .reduce((acc, u) => acc + Number(u.coefficient), 0);
    const quorumPercentage = totalCoefficient > 0 ? (presentCoefficient / totalCoefficient) * 100 : 0;

    if (initializing) return <div className="p-8 text-center text-gray-500">Cargando asistencia...</div>;

    return (
        <Card className="bg-[#121212] border-white/5 h-full flex flex-col">
            <CardHeader className="pb-3 border-b border-white/5">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                            <Users className="w-5 h-5 text-indigo-400" />
                            Control de Asistencia
                        </CardTitle>
                        <CardDescription className="text-gray-400 mt-1">
                            {presentUnitIds.size} de {units.length} unidades presentes
                        </CardDescription>
                    </div>
                    <div className="text-right">
                        <div className={`text-2xl font-bold font-mono ${quorumPercentage >= 51 ? "text-emerald-500" : "text-yellow-500"}`}>
                            {quorumPercentage.toFixed(2)}%
                        </div>
                        <div className="text-xs text-gray-500 uppercase tracking-wider">Quórum Actual</div>
                    </div>
                </div>
                <div className="mt-4 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input
                        placeholder="Buscar por unidad, nombre o documento..."
                        className="pl-9 bg-[#1A1A1A] border-white/10 text-white placeholder:text-gray-600 focus:border-indigo-500"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden">
                <ScrollArea className="h-[500px] p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {filteredUnits.length === 0 ? (
                            <div className="col-span-full text-center py-8 text-gray-500">
                                No se encontraron unidades
                            </div>
                        ) : (
                            filteredUnits.map((unit) => {
                                const isPresent = presentUnitIds.has(unit.id);
                                const isLoading = loadingMap[unit.id];
                                const user = unit.users?.[0]; // Assuming 1 user per unit for display

                                return (
                                    <div
                                        key={unit.id}
                                        onClick={() => !isLoading && toggleAttendance(unit.id)}
                                        className={`
                                            group cursor-pointer rounded-lg border p-3 transition-all duration-200 select-none
                                            flex items-center justify-between gap-3
                                            ${isPresent
                                                ? "bg-emerald-950/20 border-emerald-500/30 hover:bg-emerald-950/30"
                                                : "bg-[#1A1A1A] border-white/5 hover:border-white/10 hover:bg-[#202020]"}
                                        `}
                                    >
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className={`font-mono ${isPresent ? "border-emerald-500/50 text-emerald-400" : "border-white/10 text-gray-400"}`}>
                                                    {unit.unit_number}
                                                </Badge>
                                                <span className="text-xs text-gray-500 font-mono">
                                                    Coef: {Number(unit.coefficient).toFixed(4)}
                                                </span>
                                            </div>
                                            <div className={`text-sm mt-1 font-medium truncate ${isPresent ? "text-white" : "text-gray-400"}`}>
                                                {user?.username || "Sin Asignar"}
                                            </div>
                                            {user?.document_number && (
                                                <div className="text-xs text-gray-600 truncate">
                                                    CC: {user.document_number}
                                                </div>
                                            )}
                                        </div>

                                        <div className={`
                                            w-8 h-8 rounded-full flex items-center justify-center transition-colors
                                            ${isPresent
                                                ? "bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                                                : "bg-white/5 text-gray-600 group-hover:bg-white/10 group-hover:text-gray-400"}
                                        `}>
                                            {isLoading ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : isPresent ? (
                                                <UserCheck className="w-4 h-4" />
                                            ) : (
                                                <UserX className="w-4 h-4" />
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
