"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileBarChart, Download, Users, UserX, Gavel, FileText, RefreshCw, Loader2 } from "lucide-react";
import { getAttendanceReport, getAbsenceReport, getVotesReport, getProxiesReport } from "./reports-actions";

export default function AdminReports({ assemblyId }: { assemblyId?: string }) {
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("attendance");

    const [attendanceData, setAttendanceData] = useState<any>(null);
    const [absenceData, setAbsenceData] = useState<any>(null);
    const [votesData, setVotesData] = useState<any>(null);
    const [proxiesData, setProxiesData] = useState<any>(null);

    const loadData = async (tab: string) => {
        setLoading(true);
        try {
            if (tab === "attendance") {
                const data = await getAttendanceReport(assemblyId);
                setAttendanceData(data);
            } else if (tab === "absence") {
                const data = await getAbsenceReport(assemblyId);
                setAbsenceData(data);
            } else if (tab === "votes") {
                const data = await getVotesReport(assemblyId);
                setVotesData(data);
            } else if (tab === "proxies") {
                const data = await getProxiesReport(assemblyId);
                setProxiesData(data);
            }
        } catch (error) {
            console.error("Error loading report:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData(activeTab);
    }, [activeTab]);

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between print:hidden">
                <h2 className="text-3xl font-bold text-white">Informes y Estadísticas</h2>
                <Button variant="outline" onClick={() => window.location.href = assemblyId ? `/superadmin/assemblies/${assemblyId}` : '/dashboard'} className="border-white/10 text-gray-500 hover:text-white hover:bg-white/10">
                    ← Volver
                </Button>
            </div>

            <Card className="bg-[#121212] border-white/5 print:border-0 print:shadow-none">
                <CardHeader className="print:hidden">
                    <CardTitle className="text-gray-200 flex items-center gap-2">
                        <FileBarChart className="w-5 h-5 text-indigo-400" />
                        Panel de Reportes
                    </CardTitle>
                    <CardDescription>
                        Visualice y exporte los registros del sistema.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <div className="flex justify-between items-center mb-4 print:hidden">
                            <TabsList className="bg-[#1A1A1A]">
                                <TabsTrigger value="attendance"><Users className="w-4 h-4 mr-2" /> Asistencia</TabsTrigger>
                                <TabsTrigger value="absence"><UserX className="w-4 h-4 mr-2" /> Inasistencia</TabsTrigger>
                                <TabsTrigger value="votes"><Gavel className="w-4 h-4 mr-2" /> Votaciones</TabsTrigger>
                                <TabsTrigger value="proxies"><FileText className="w-4 h-4 mr-2" /> Poderes</TabsTrigger>
                            </TabsList>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => loadData(activeTab)} disabled={loading}>
                                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                                </Button>
                                <Button variant="outline" size="sm" onClick={handlePrint}>
                                    <Download className="w-4 h-4 mr-2" /> Imprimir / PDF
                                </Button>
                            </div>
                        </div>

                        {/* ATTENDANCE REPORT */}
                        <TabsContent value="attendance" className="space-y-4">
                            {attendanceData ? (
                                <>
                                    <div className="p-4 bg-emerald-950/20 border border-emerald-500/20 rounded-lg flex justify-between items-center">
                                        <span className="text-emerald-400 font-medium">Total Coeficiente Presente:</span>
                                        <span className="text-2xl font-bold text-white">{Number(attendanceData.totalCoefficient).toFixed(4)}</span>
                                    </div>
                                    <div className="rounded-md border border-white/10 overflow-hidden">
                                        <Table>
                                            <TableHeader className="bg-[#1A1A1A]">
                                                <TableRow>
                                                    <TableHead className="text-gray-300">Unidad</TableHead>
                                                    <TableHead className="text-gray-300">Representante</TableHead>
                                                    <TableHead className="text-right text-gray-300">Coeficiente</TableHead>
                                                    <TableHead className="text-right text-gray-300">Hora Registro</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {attendanceData.data.map((row: any, i: number) => (
                                                    <TableRow key={i} className="border-white/5 hover:bg-white/5">
                                                        <TableCell className="font-medium text-white">{row.unit}</TableCell>
                                                        <TableCell className="text-gray-400">{row.representative}</TableCell>
                                                        <TableCell className="text-right text-gray-300">{Number(row.coefficient).toFixed(4)}</TableCell>
                                                        <TableCell className="text-right text-sm text-gray-500">{row.checkInTime}</TableCell>
                                                    </TableRow>
                                                ))}
                                                {attendanceData.data.length === 0 && (
                                                    <TableRow>
                                                        <TableCell colSpan={4} className="text-center py-8 text-gray-500">No hay registros de asistencia.</TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </>
                            ) : <div className="py-10 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500" /></div>}
                        </TabsContent>

                        {/* ABSENCE REPORT */}
                        <TabsContent value="absence" className="space-y-4">
                            {absenceData ? (
                                <>
                                    <div className="p-4 bg-red-950/20 border border-red-500/20 rounded-lg flex justify-between items-center">
                                        <span className="text-red-400 font-medium">Total Coeficiente Ausente:</span>
                                        <span className="text-2xl font-bold text-white">{Number(absenceData.totalAbsentCoefficient).toFixed(4)}</span>
                                    </div>
                                    <div className="rounded-md border border-white/10 overflow-hidden">
                                        <Table>
                                            <TableHeader className="bg-[#1A1A1A]">
                                                <TableRow>
                                                    <TableHead className="text-gray-300">Unidad</TableHead>
                                                    <TableHead className="text-gray-300">Propietario</TableHead>
                                                    <TableHead className="text-right text-gray-300">Coeficiente</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {absenceData.data.map((row: any, i: number) => (
                                                    <TableRow key={i} className="border-white/5 hover:bg-white/5">
                                                        <TableCell className="font-medium text-white">{row.unit}</TableCell>
                                                        <TableCell className="text-gray-400">{row.representative}</TableCell>
                                                        <TableCell className="text-right text-gray-300">{Number(row.coefficient).toFixed(4)}</TableCell>
                                                    </TableRow>
                                                ))}
                                                {absenceData.data.length === 0 && (
                                                    <TableRow>
                                                        <TableCell colSpan={3} className="text-center py-8 text-emerald-500">¡Todos presentes!</TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </>
                            ) : <div className="py-10 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500" /></div>}
                        </TabsContent>

                        {/* VOTES REPORT */}
                        <TabsContent value="votes" className="space-y-6">
                            {votesData ? votesData.map((vote: any) => (
                                <div key={vote.id} className="border border-white/10 rounded-lg overflow-hidden">
                                    <div className="bg-[#1A1A1A] p-4 flex justify-between items-center">
                                        <div>
                                            <h3 className="text-white font-semibold">{vote.title}</h3>
                                            <p className="text-xs text-gray-500">Estado: {vote.status} | Total Peso: {Number(vote.totalWeight).toFixed(4)}</p>
                                        </div>
                                    </div>
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="border-white/5">
                                                <TableHead>Opción</TableHead>
                                                <TableHead className="text-right">Votos</TableHead>
                                                <TableHead className="text-right">Peso</TableHead>
                                                <TableHead className="text-right">%</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {vote.results.map((r: any, i: number) => (
                                                <TableRow key={i} className="border-white/5">
                                                    <TableCell className="text-gray-300">{r.option}</TableCell>
                                                    <TableCell className="text-right text-gray-400">{r.count}</TableCell>
                                                    <TableCell className="text-right text-gray-400">{Number(r.weight).toFixed(4)}</TableCell>
                                                    <TableCell className="text-right text-indigo-400 font-bold">{Number(r.percentage).toFixed(1)}%</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )) : <div className="py-10 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500" /></div>}
                            {votesData && votesData.length === 0 && <p className="text-center text-gray-500">No hay votaciones registradas.</p>}
                        </TabsContent>

                        {/* PROXIES REPORT */}
                        <TabsContent value="proxies" className="space-y-4">
                            {proxiesData ? (
                                <div className="rounded-md border border-white/10 overflow-hidden">
                                    <Table>
                                        <TableHeader className="bg-[#1A1A1A]">
                                            <TableRow>
                                                <TableHead className="text-gray-300">Poderdante (Unidad)</TableHead>
                                                <TableHead className="text-gray-300">Apoderado</TableHead>
                                                <TableHead className="text-gray-300">Tipo</TableHead>
                                                <TableHead className="text-right text-gray-300">Coef</TableHead>
                                                <TableHead className="text-right text-gray-300">Fecha</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {proxiesData.map((row: any, i: number) => (
                                                <TableRow key={i} className="border-white/5 hover:bg-white/5">
                                                    <TableCell className="font-medium text-white">
                                                        {row.principal} <span className="text-gray-500 text-xs">({row.principalUnit})</span>
                                                    </TableCell>
                                                    <TableCell className="text-gray-400">
                                                        {row.representative}
                                                        <br />
                                                        <span className="text-xs text-gray-600">{row.representativeDoc}</span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="px-2 py-0.5 rounded text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                                            {row.type}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-right text-gray-300">{Number(row.principalCoef).toFixed(4)}</TableCell>
                                                    <TableCell className="text-right text-sm text-gray-500">{row.date}</TableCell>
                                                </TableRow>
                                            ))}
                                            {proxiesData.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">No hay poderes registrados.</TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            ) : <div className="py-10 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500" /></div>}
                        </TabsContent>

                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
