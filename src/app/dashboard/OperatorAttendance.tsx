"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import jsQR from "jsqr";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CheckCircle2, AlertCircle, Loader2, ChevronDown, ChevronUp, Scan, Keyboard, X, UserCheck, AlertTriangle } from "lucide-react";
import { registerAttendanceByDocument } from "./attendance-actions";
import { cn } from "@/lib/utils";

type ScanStatus = "success" | "already_registered" | "invalid" | null;

type ScanResult = {
    status: ScanStatus;
    message: string;
    name?: string;
    unit?: string;
} | null;

// Countdown ring component
function CountdownRing({ duration }: { duration: number }) {
    const r = 16;
    const circ = 2 * Math.PI * r;
    return (
        <svg className="absolute top-3 right-3 w-10 h-10 -rotate-90" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r={r} fill="none" stroke="white" strokeOpacity="0.15" strokeWidth="3" />
            <circle
                cx="20" cy="20" r={r}
                fill="none" stroke="white" strokeOpacity="0.7" strokeWidth="3"
                strokeDasharray={circ}
                strokeDashoffset="0"
                strokeLinecap="round"
                style={{
                    animation: `countdown-ring ${duration}ms linear forwards`,
                }}
            />
        </svg>
    );
}

const FEEDBACK_DURATION = 2000;

interface OperatorAttendanceProps {
    assemblyId?: string;
    onAttendanceSuccess?: () => void;
}

export default function OperatorAttendance({ assemblyId: _assemblyId, onAttendanceSuccess }: OperatorAttendanceProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [scanResult, setScanResult] = useState<ScanResult>(null);
    const [manualDoc, setManualDoc] = useState("");
    const [loading, setLoading] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [isCameraReady, setIsCameraReady] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const animFrameRef = useRef<number | null>(null);
    const isScanningPaused = useRef(false);
    const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const stopCamera = useCallback(() => {
        if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current);
            animFrameRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        setIsCameraReady(false);
    }, []);

    const clearResult = useCallback(() => {
        setScanResult(null);
        isScanningPaused.current = false;
    }, []);

    const showFeedback = useCallback((result: ScanResult) => {
        setScanResult(result);
        if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
        resultTimerRef.current = setTimeout(clearResult, FEEDBACK_DURATION);
    }, [clearResult]);

    const processDocument = useCallback(async (docNumber: string) => {
        setLoading(true);
        try {
            const raw = await registerAttendanceByDocument(docNumber);

            let status: ScanStatus;
            if (raw.success) {
                status = "success";
                onAttendanceSuccess?.();
            } else if ((raw as any).alreadyRegistered) {
                status = "already_registered";
            } else {
                status = "invalid";
            }

            showFeedback({
                status,
                message: raw.message,
                name: raw.data?.name,
                unit: raw.data?.unit,
            });
        } catch {
            showFeedback({ status: "invalid", message: "Error de conexión o servidor." });
        } finally {
            setLoading(false);
        }
    }, [showFeedback, onAttendanceSuccess]);

    const handleScanSuccess = useCallback(async (decodedText: string) => {
        if (isScanningPaused.current || loading) return;
        isScanningPaused.current = true;
        await processDocument(decodedText);
    }, [loading, processDocument]);

    const startScanLoop = useCallback(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;

        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;

        const tick = () => {
            if (video.readyState === video.HAVE_ENOUGH_DATA) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height, {
                    inversionAttempts: "dontInvert",
                });
                if (code && !isScanningPaused.current) {
                    handleScanSuccess(code.data);
                }
            }
            animFrameRef.current = requestAnimationFrame(tick);
        };
        animFrameRef.current = requestAnimationFrame(tick);
    }, [handleScanSuccess]);

    useEffect(() => {
        if (!showScanner || !isExpanded) {
            stopCamera();
            return;
        }

        setCameraError(null);
        setIsCameraReady(false);

        const isSecure =
            typeof window !== "undefined" &&
            (window.isSecureContext ||
                window.location.hostname === "localhost" ||
                window.location.hostname === "127.0.0.1");

        if (!isSecure) {
            setCameraError("La cámara requiere conexión segura (HTTPS). En red local, acceda desde localhost.");
            return;
        }

        navigator.mediaDevices
            .getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } } })
            .then((stream) => {
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.onloadedmetadata = () => {
                        videoRef.current?.play();
                        setIsCameraReady(true);
                        startScanLoop();
                    };
                }
            })
            .catch((err) => {
                console.error("Camera error:", err);
                if (err.name === "NotAllowedError") {
                    setCameraError("Permiso de cámara denegado. Habilítalo en la configuración del navegador.");
                } else if (err.name === "NotFoundError") {
                    setCameraError("No se encontró una cámara disponible.");
                } else {
                    setCameraError("Error al iniciar cámara: " + err.message);
                }
            });

        return () => stopCamera();
    }, [showScanner, isExpanded, startScanLoop, stopCamera]);

    const handleCloseScanner = () => {
        setShowScanner(false);
        setScanResult(null);
        if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
        isScanningPaused.current = false;
    };

    const handleRegisterManual = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualDoc.trim()) return;
        setLoading(true);
        setScanResult(null);
        try {
            await processDocument(manualDoc);
        } finally {
            setLoading(false);
            setManualDoc("");
        }
    };

    // Feedback config per status
    const feedbackConfig = scanResult ? {
        success: {
            bg: "bg-emerald-500",
            icon: <CheckCircle2 className="w-14 h-14 text-white drop-shadow-lg" />,
            title: "¡Asistencia Registrada!",
            titleClass: "text-white",
            msgClass: "text-emerald-50",
        },
        already_registered: {
            bg: "bg-amber-500",
            icon: <UserCheck className="w-14 h-14 text-white drop-shadow-lg" />,
            title: "Ya Estaba Registrado",
            titleClass: "text-white",
            msgClass: "text-amber-50",
        },
        invalid: {
            bg: "bg-red-600",
            icon: <AlertTriangle className="w-14 h-14 text-white drop-shadow-lg" />,
            title: "QR No Válido",
            titleClass: "text-white",
            msgClass: "text-red-100",
        },
    }[scanResult.status!] : null;

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
                    <div className="space-y-4">
                        {/* Manual Entry */}
                        {!showScanner && (
                            <form onSubmit={handleRegisterManual} className="space-y-4">
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
                                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white h-12 text-base font-medium"
                                    >
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                                        Registrar
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={() => { setShowScanner(true); setScanResult(null); }}
                                        className="h-12 px-4 shrink-0 bg-[#252525] text-white border border-white/10 hover:bg-[#333] gap-2"
                                    >
                                        <Scan className="w-5 h-5" />
                                        Leer QR
                                    </Button>
                                </div>
                            </form>
                        )}

                        {/* Feedback for manual entry */}
                        {!showScanner && scanResult && feedbackConfig && (
                            <div className={cn(
                                "p-4 rounded-xl border animate-in fade-in slide-in-from-bottom-2 duration-300 flex items-start gap-3",
                                scanResult.status === "success"
                                    ? "bg-emerald-950/40 border-emerald-500/40"
                                    : scanResult.status === "already_registered"
                                        ? "bg-amber-950/40 border-amber-500/40"
                                        : "bg-red-950/40 border-red-500/40"
                            )}>
                                <div className="shrink-0 mt-0.5">
                                    {scanResult.status === "success" && <CheckCircle2 className="w-6 h-6 text-emerald-400" />}
                                    {scanResult.status === "already_registered" && <UserCheck className="w-6 h-6 text-amber-400" />}
                                    {scanResult.status === "invalid" && <AlertTriangle className="w-6 h-6 text-red-400" />}
                                </div>
                                <div>
                                    <p className={cn("font-semibold text-sm",
                                        scanResult.status === "success" ? "text-emerald-300"
                                            : scanResult.status === "already_registered" ? "text-amber-300"
                                                : "text-red-300"
                                    )}>
                                        {feedbackConfig.title}
                                    </p>
                                    <p className="text-sm text-gray-300 mt-0.5">{scanResult.message}</p>
                                </div>
                            </div>
                        )}

                        {/* Camera Scanner */}
                        {showScanner && (
                            <div className="rounded-xl overflow-hidden border border-white/10 bg-black animate-in fade-in zoom-in-95 duration-200">
                                {/* Scanner Header */}
                                <div className="flex items-center justify-between px-4 py-2 bg-white/5">
                                    <p className="text-sm text-gray-300 font-medium flex items-center gap-2">
                                        <Scan className="w-4 h-4 text-indigo-400" />
                                        Apunte la cámara al código QR
                                    </p>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 text-gray-400 hover:text-white hover:bg-white/10 rounded-full"
                                        onClick={handleCloseScanner}
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>

                                {cameraError ? (
                                    <div className="p-6 text-center text-red-400 bg-red-950/20">
                                        <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                                        <p className="font-semibold">Error de Cámara</p>
                                        <p className="text-sm opacity-80 mt-1">{cameraError}</p>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        {/* Camera loading spinner */}
                                        {!isCameraReady && (
                                            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black min-h-[240px]">
                                                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                                            </div>
                                        )}

                                        {/* Video feed */}
                                        <video
                                            ref={videoRef}
                                            className="w-full block"
                                            muted
                                            playsInline
                                            style={{ minHeight: isCameraReady ? undefined : "240px" }}
                                        />

                                        {/* Scanning overlay (corner brackets + scanline) */}
                                        {isCameraReady && !scanResult && (
                                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                                <div className="relative w-56 h-56">
                                                    <span className="absolute top-0 left-0 w-8 h-8 border-t-[3px] border-l-[3px] border-indigo-400 rounded-tl-sm" />
                                                    <span className="absolute top-0 right-0 w-8 h-8 border-t-[3px] border-r-[3px] border-indigo-400 rounded-tr-sm" />
                                                    <span className="absolute bottom-0 left-0 w-8 h-8 border-b-[3px] border-l-[3px] border-indigo-400 rounded-bl-sm" />
                                                    <span className="absolute bottom-0 right-0 w-8 h-8 border-b-[3px] border-r-[3px] border-indigo-400 rounded-br-sm" />
                                                    <div
                                                        className="absolute left-2 right-2 h-0.5 bg-indigo-400/70"
                                                        style={{ animation: "scanline 2s linear infinite" }}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Processing overlay */}
                                        {loading && (
                                            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-3 z-20">
                                                <Loader2 className="w-12 h-12 text-indigo-400 animate-spin" />
                                                <p className="text-white text-sm font-medium">Verificando...</p>
                                            </div>
                                        )}

                                        {/* Full-screen feedback overlay */}
                                        {!loading && scanResult && feedbackConfig && (
                                            <div
                                                className={cn(
                                                    "absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 px-6 text-center",
                                                    "animate-in fade-in zoom-in-95 duration-200",
                                                    feedbackConfig.bg,
                                                )}
                                            >
                                                {/* Countdown ring */}
                                                <CountdownRing duration={FEEDBACK_DURATION} />

                                                {feedbackConfig.icon}

                                                <div className="space-y-1">
                                                    <h3 className={cn("text-xl font-bold leading-tight", feedbackConfig.titleClass)}>
                                                        {feedbackConfig.title}
                                                    </h3>
                                                    {scanResult.name && (
                                                        <p className={cn("text-base font-semibold", feedbackConfig.msgClass)}>
                                                            {scanResult.name}
                                                        </p>
                                                    )}
                                                    {scanResult.unit && (
                                                        <p className={cn("text-sm opacity-90", feedbackConfig.msgClass)}>
                                                            Unidad {scanResult.unit}
                                                        </p>
                                                    )}
                                                    {!scanResult.name && (
                                                        <p className={cn("text-sm opacity-90", feedbackConfig.msgClass)}>
                                                            {scanResult.message}
                                                        </p>
                                                    )}
                                                </div>

                                                <p className="text-white/60 text-xs mt-2">Volviendo al escáner...</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Canvas (hidden, for QR decoding) */}
                                <canvas ref={canvasRef} className="hidden" />
                            </div>
                        )}
                    </div>
                </CardContent>
            )}

            <style jsx>{`
                @keyframes scanline {
                    0%   { top: 8px; opacity: 1; }
                    50%  { opacity: 0.5; }
                    100% { top: calc(100% - 8px); opacity: 1; }
                }
                @keyframes countdown-ring {
                    from { stroke-dashoffset: 0; }
                    to   { stroke-dashoffset: ${2 * Math.PI * 16}px; }
                }
            `}</style>
        </Card>
    );
}
