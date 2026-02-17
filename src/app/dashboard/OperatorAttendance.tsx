"use client";

import { useEffect, useState, useRef } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CheckCircle2, AlertCircle, Loader2, ChevronDown, ChevronUp, Scan, Keyboard } from "lucide-react";
import { registerAttendanceByDocument } from "./attendance-actions";
import { cn } from "@/lib/utils";

export default function OperatorAttendance() {
    // UI State
    const [isExpanded, setIsExpanded] = useState(true); // Default open
    const [showScanner, setShowScanner] = useState(false);

    // Logic State
    const [scanResult, setScanResult] = useState<{ success: boolean; message: string; data?: any } | null>(null);
    const [manualDoc, setManualDoc] = useState("");
    const [loading, setLoading] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    // Initialize/Cleanup Scanner based on showScanner state
    useEffect(() => {
        if (showScanner && isExpanded) {
            setCameraError(null);

            // Check for Secure Context (HTTPS or localhost)
            const isSecure = typeof window !== 'undefined' && (
                window.isSecureContext ||
                window.location.protocol === 'https:' ||
                window.location.hostname === 'localhost' ||
                window.location.hostname === '127.0.0.1'
            );

            if (!isSecure) {
                setCameraError("La cámara requiere conexión segura (HTTPS). En red local (192.168.x.x) los navegadores bloquean la cámara. Use localhost o configure SSL.");
                // We don't return here to allow trying anyway, but the error visual is important
            }

            // Give time for div to render
            const timer = setTimeout(() => {
                const element = document.getElementById("reader");
                if (element && !scannerRef.current) {
                    try {
                        const scanner = new Html5QrcodeScanner(
                            "reader",
                            {
                                fps: 10,
                                qrbox: { width: 250, height: 250 },
                                aspectRatio: 1.0,
                                showTorchButtonIfSupported: true
                            },
                            /* verbose= */ false
                        );

                        scanner.render(onScanSuccess, (errorMessage) => {
                            if (errorMessage?.includes("permission") || errorMessage?.includes("Access denied")) {
                                setCameraError("Permiso de cámara denegado. Verifique su navegador.");
                            }
                        });
                        scannerRef.current = scanner;
                    } catch (e: any) {
                        console.error("Scanner init error", e);
                        setCameraError("Error al iniciar cámara: " + (e.message || "Desconocido"));
                    }
                }
            }, 100);
            return () => clearTimeout(timer);
        } else {
            // Cleanup if hidden
            if (scannerRef.current) {
                try {
                    scannerRef.current.clear().catch(console.error);
                } catch (e) { console.error(e); }
                scannerRef.current = null;
            }
        }

        return () => {
            if (scannerRef.current) {
                try {
                    scannerRef.current.clear().catch(console.error);
                } catch (e) {
                    // ignore
                }
                scannerRef.current = null;
            }
        };
    }, [showScanner, isExpanded]);

    const onScanSuccess = async (decodedText: string, decodedResult: any) => {
        if (loading) return;
        await handleRegister(decodedText);
        // Pause briefly
        if (scannerRef.current) {
            scannerRef.current.pause();
            setTimeout(() => {
                if (scannerRef.current) scannerRef.current.resume();
            }, 2000);
        }
    };

    const onScanFailure = (error: any) => {
        // console.warn(`Code scan error = ${error}`);
    };

    const handleRegister = async (docNumber: string) => {
        setLoading(true);
        setScanResult(null);

        try {
            const result = await registerAttendanceByDocument(docNumber);
            setScanResult(result);
        } catch (error: any) {
            console.error("Scan processing error:", error);
            setScanResult({ success: false, message: "Error de conexión o servidor." });
        } finally {
            setLoading(false);
        }
    };

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualDoc.trim()) return;
        await handleRegister(manualDoc);
        setManualDoc("");
    };

    return (
        <Card className="bg-[#121212] border-white/5 overflow-hidden transition-all duration-300">
            <CardHeader className="pb-3 cursor-pointer select-none" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-white flex items-center gap-2 text-lg">
                        <Keyboard className="w-5 h-5 text-indigo-400" />
                        Registro de Asistencia
                    </CardTitle>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-white">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                </div>
                {!isExpanded && <CardDescription>Haga clic para desplegar el control de asistencia.</CardDescription>}
            </CardHeader>

            {isExpanded && (
                <CardContent className="animate-in slide-in-from-top-2 duration-200">
                    <div className="space-y-6">
                        {/* Manual Entry Form - Primary Interface */}
                        <form onSubmit={handleManualSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="doc" className="text-gray-300">Documento / ID</Label>
                                <Input
                                    id="doc"
                                    placeholder="Ingrese número..."
                                    className="bg-[#1A1A1A] border-white/10 text-white text-lg h-12"
                                    value={manualDoc}
                                    onChange={(e) => setManualDoc(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div className="flex gap-3">
                                <Button
                                    type="submit"
                                    disabled={loading || !manualDoc}
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white h-12 text-base font-medium transition-all"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                                    Registrar
                                </Button>

                                <Button
                                    type="button"
                                    onClick={() => setShowScanner(!showScanner)}
                                    className={cn(
                                        "h-12 w-16 shrink-0 transition-colors border",
                                        showScanner
                                            ? "bg-amber-500/20 text-amber-500 border-amber-500/50 hover:bg-amber-500/30"
                                            : "bg-[#252525] text-white border-white/10 hover:bg-[#333]"
                                    )}
                                    title={showScanner ? "Ocultar Escáner" : "Abrir Escáner"}
                                >
                                    <Scan className="w-6 h-6" />
                                </Button>
                            </div>
                        </form>

                        {/* Scanner Area (Collapsible) */}
                        {showScanner && (
                            <div className="rounded-lg overflow-hidden bg-black border border-white/10 animate-in fade-in zoom-in-95 duration-200">
                                {cameraError ? (
                                    <div className="p-6 text-center text-red-400 bg-red-950/20">
                                        <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                                        <p className="font-semibold">Error de Cámara</p>
                                        <p className="text-sm opacity-80 mt-1">{cameraError}</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="p-2 bg-white/5 mb-1 text-center">
                                            <p className="text-xs text-gray-400">Cámara Activa</p>
                                        </div>
                                        <div id="reader" className="w-full" />
                                    </>
                                )}
                            </div>
                        )}

                        {/* Feedback Area */}
                        {scanResult && (
                            <div className={`p-4 rounded-lg border ${scanResult.success ? "bg-emerald-950/30 border-emerald-500/30" : "bg-red-950/30 border-red-500/30"} animate-in fade-in slide-in-from-bottom-2`}>
                                <div className="flex items-start gap-3">
                                    {scanResult.success ? (
                                        <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />
                                    ) : (
                                        <AlertCircle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
                                    )}
                                    <div>
                                        <h4 className={`font-bold ${scanResult.success ? "text-emerald-400" : "text-red-400"}`}>
                                            {scanResult.success ? "Registro Exitoso" : "Error"}
                                        </h4>
                                        <p className="text-sm text-gray-300 mt-1">{scanResult.message}</p>
                                        {scanResult.success && scanResult.data && (
                                            <p className="text-xs text-gray-500 mt-1">Unidad: {scanResult.data.unit}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            )}
        </Card>
    );
}
