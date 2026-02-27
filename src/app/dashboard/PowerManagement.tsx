"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    FileText, Smartphone, UserPlus, XCircle, CheckCircle2,
    AlertCircle, Loader2, ChevronDown, ChevronUp, ShieldCheck,
    MessageSquare, Trash2, UploadCloud, Camera
} from "lucide-react";
import { registerProxy, revokeProxy, ProxyType, requestProxyOTP, verifyProxyOTP, getProxyDocumentContent } from "./power-actions";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface PowerManagementProps {
    userId: string;
    userRole: string;
    givenProxy?: any;
    receivedProxies?: any[];
    ownWeight?: number;
}

// ─────────────────────────────────────────────
// PDF Dropzone Component
// ─────────────────────────────────────────────
function PDFDropzone({ onFileChange }: { onFileChange: (file: File | null) => void }) {
    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFile = (selected: File | null) => {
        if (selected && selected.type === 'application/pdf') {
            const MAX_SIZE_MB = 10;
            if (selected.size > MAX_SIZE_MB * 1024 * 1024) {
                alert(`El archivo pesa demasiado (${formatSize(selected.size)}). El tamaño máximo permitido es de ${MAX_SIZE_MB}MB.`);
                setFile(null);
                onFileChange(null);
                if (inputRef.current) inputRef.current.value = '';
                return;
            }
            setFile(selected);
            onFileChange(selected);
        } else if (selected) {
            alert('Por favor selecciona únicamente un archivo PDF.');
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        handleFile(e.dataTransfer.files[0]);
    };

    const handleRemove = () => {
        setFile(null);
        onFileChange(null);
        if (inputRef.current) inputRef.current.value = '';
    };

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    if (file) {
        return (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 p-4 rounded-2xl bg-[#1A1A2E] border-2 border-indigo-500/30 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0">
                    <FileText className="w-7 h-7 text-indigo-400" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-base truncate">{file.name}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{formatSize(file.size)} · PDF</p>
                </div>
                <button
                    type="button"
                    onClick={handleRemove}
                    className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-900/40 text-sm font-semibold transition-all"
                >
                    <Trash2 className="w-4 h-4" />
                    Eliminar / Cambiar archivo
                </button>
            </div>
        );
    }

    return (
        <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={cn(
                "cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center gap-3 py-10 px-6 text-center select-none",
                isDragging
                    ? "border-indigo-500 bg-indigo-600/10 scale-[1.01]"
                    : "border-white/15 bg-[#1A1A1A] hover:border-indigo-500/60 hover:bg-indigo-900/10"
            )}
        >
            <div className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center transition-colors",
                isDragging ? "bg-indigo-500/30" : "bg-white/5"
            )}>
                <UploadCloud className={cn("w-9 h-9 transition-colors", isDragging ? "text-indigo-300" : "text-gray-400")} />
            </div>
            <div>
                <p className="text-base font-bold text-gray-200">Toca aquí para seleccionar tu PDF</p>
                <p className="text-sm text-gray-500 mt-1">o arrastra y suelta el archivo aquí</p>
            </div>
            <span className="text-xs text-gray-600 border border-white/10 px-3 py-1 rounded-full">Solo archivos .PDF</span>
            <input
                ref={inputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0] || null)}
            />
        </div>
    );
}

// ─────────────────────────────────────────────
// OTP Component
// ─────────────────────────────────────────────
const RESEND_DELAY = 60;

function OTPInput({ onVerify, onResend, phoneEnd }: { onVerify: (code: string) => Promise<boolean>, onResend: () => void, phoneEnd?: string | null }) {
    const [digits, setDigits] = useState(Array(6).fill(""));
    const [otpError, setOtpError] = useState(false);
    const [otpVerified, setOtpVerified] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [countdown, setCountdown] = useState(RESEND_DELAY);
    const [canResend, setCanResend] = useState(false);
    const inputs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        if (countdown <= 0) { setCanResend(true); return; }
        const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [countdown]);

    const handleResend = () => {
        setDigits(Array(6).fill(""));
        setOtpError(false);
        setCanResend(false);
        setCountdown(RESEND_DELAY);
        onResend();
        inputs.current[0]?.focus();
    };

    const attemptVerification = async (code: string) => {
        setVerifying(true);
        setOtpError(false);
        const success = await onVerify(code);
        setVerifying(false);
        if (success) {
            setOtpVerified(true);
        } else {
            setOtpError(true);
        }
    };

    const handleChange = (index: number, value: string) => {
        if (verifying || otpVerified) return;
        const digit = value.replace(/\D/g, "").slice(-1);
        const newDigits = [...digits];
        newDigits[index] = digit;
        setDigits(newDigits);
        setOtpError(false);
        if (digit && index < 5) inputs.current[index + 1]?.focus();

        if (newDigits.every((d) => d !== "")) {
            attemptVerification(newDigits.join(""));
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace" && !digits[index] && index > 0) inputs.current[index - 1]?.focus();
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        if (verifying || otpVerified) return;
        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
        const newDigits = Array(6).fill("").map((_, i) => pasted[i] || "");
        setDigits(newDigits);
        if (pasted.length === 6) {
            attemptVerification(pasted);
        } else {
            inputs.current[Math.min(pasted.length, 5)]?.focus();
        }
    };

    return (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-300">
            <div className="text-center space-y-1">
                <p className="text-base font-semibold text-gray-200">
                    Ingresa el código que recibiste SMS
                </p>
                <p className="text-sm text-gray-500">
                    {phoneEnd ? `Enviado al  *** *** ${phoneEnd}` : 'Código de 6 dígitos'}
                </p>
            </div>

            <div className="flex justify-center gap-3" onPaste={handlePaste}>
                {digits.map((digit, i) => (
                    <input
                        key={i}
                        ref={(el) => { inputs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        disabled={verifying || otpVerified}
                        onChange={(e) => handleChange(i, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(i, e)}
                        className={cn(
                            "w-12 h-16 text-center text-2xl font-bold rounded-xl border-2 bg-[#1E1E1E] text-white transition-all duration-200 outline-none focus:scale-105 shadow-sm",
                            otpVerified
                                ? "border-emerald-500 bg-emerald-900/20 text-emerald-300"
                                : otpError
                                    ? "border-red-500 bg-red-900/10 text-red-400 animate-pulse"
                                    : digit || verifying
                                        ? "border-indigo-500 bg-indigo-900/20"
                                        : "border-white/15 focus:border-indigo-400"
                        )}
                        autoFocus={i === 0}
                    />
                ))}
            </div>

            {otpError && !otpVerified && (
                <div className="flex items-center justify-center gap-2 text-red-400 animate-in fade-in duration-200">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p className="text-base font-semibold">El código es incorrecto o expiró.</p>
                </div>
            )}

            {verifying && (
                <div className="flex items-center justify-center gap-2 text-indigo-400 animate-in fade-in duration-200">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <p className="text-base font-semibold">Validando firma digital...</p>
                </div>
            )}

            {otpVerified && (
                <div className="flex items-center justify-center gap-2 text-emerald-400 animate-in fade-in duration-200">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <p className="text-base font-semibold">Firma validada correctamente.</p>
                </div>
            )}

            {!otpVerified && !verifying && (
                <div className="text-center mt-2">
                    {canResend ? (
                        <button
                            type="button"
                            onClick={handleResend}
                            className="text-indigo-400 hover:text-indigo-300 text-base font-semibold underline underline-offset-2 transition-colors"
                        >
                            Reenviar código
                        </button>
                    ) : (
                        <p className="text-sm text-gray-500">
                            ¿No recibiste el código?{" "}
                            <span className="text-gray-400 font-semibold">Reenviar en {countdown}s</span>
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────
// Success Screen Component
// ─────────────────────────────────────────────
function SuccessScreen({ proxyId, userId }: { proxyId?: string | null, userId: string }) {
    const [loadingSigned, setLoadingSigned] = useState(false);
    const [signedHtml, setSignedHtml] = useState<string | null>(null);
    const [pdfUploaded, setPdfUploaded] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const uploadStartedRef = useRef(false);

    useEffect(() => {
        const generateAndUploadPdf = async () => {
            if (!proxyId || pdfUploaded || uploadStartedRef.current) return;
            uploadStartedRef.current = true;
            try {
                const { getProxyDocumentContent } = await import("./power-actions");
                const res = await getProxyDocumentContent({ proxyId });
                if (!res.success || !res.html) {
                    setUploadError(`Error al obtener el documento: ${res.message || 'desconocido'}`);
                    return;
                }
                const response = await fetch('/api/proxy-pdf', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ html: res.html, fileName: `proxy-${proxyId}.pdf` })
                });

                if (!response.ok) {
                    const err = await response.text();
                    setUploadError(`Error generando PDF: ${err.slice(0, 200)}`);
                    return;
                }

                const pdfBlob = await response.blob();

                if (userId) {
                    const { createClient } = await import("@/lib/supabase/client");
                    const supabase = createClient();
                    const fileName = `${Date.now()}-digital-proxy.pdf`;
                    const filePath = `${userId}/${fileName}`;

                    const { error: storageErr } = await supabase.storage
                        .from('proxies')
                        .upload(filePath, pdfBlob, { contentType: 'application/pdf' });

                    if (!storageErr) {
                        const { data: publicUrlData } = supabase.storage.from('proxies').getPublicUrl(filePath);
                        const { linkGeneratedProxyPDF } = await import("./power-actions");
                        const linkRes = await linkGeneratedProxyPDF(proxyId, publicUrlData.publicUrl);
                        if (linkRes.success) {
                            setPdfUploaded(true);
                        } else {
                            setUploadError(`Error al vincular PDF: ${linkRes.message}`);
                        }
                    } else {
                        setUploadError(`Error al subir a Storage: ${storageErr.message}`);
                    }
                }
            } catch (e: any) {
                setUploadError(`Error inesperado: ${e.message}`);
                console.error("Auto PDF upload error:", e);
            }
        };
        generateAndUploadPdf();
    }, [proxyId, pdfUploaded]);

    const fetchSignedDocument = async () => {
        if (!proxyId) return;
        setLoadingSigned(true);
        try {
            const { getProxyDocumentContent } = await import("./power-actions");
            const res = await getProxyDocumentContent({ proxyId });
            if (res.success && res.html) {
                setSignedHtml(res.html);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingSigned(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center py-14 gap-6 animate-in fade-in zoom-in-95 duration-500">
            <div className="relative">
                <div className="w-32 h-32 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <div className="w-22 h-22 rounded-full bg-emerald-500/20 flex items-center justify-center p-4">
                        <CheckCircle2 className="w-14 h-14 text-emerald-400" strokeWidth={1.5} />
                    </div>
                </div>
                <div className="absolute inset-0 rounded-full border-2 border-emerald-500/30 animate-ping" />
            </div>

            <div className="text-center space-y-3 max-w-xs">
                <h3 className="text-2xl font-extrabold text-white leading-tight">
                    ¡Poder registrado exitosamente!
                </h3>
                <p className="text-lg text-gray-300 leading-relaxed">
                    Tu representante ha sido autorizado.
                </p>
            </div>

            <div className="w-full p-4 rounded-2xl bg-emerald-900/15 border border-emerald-500/20 text-center">
                <p className="text-sm text-emerald-400 font-medium">
                    ✅ El poder quedó registrado en el sistema de la asamblea.
                </p>
            </div>

            {uploadError && (
                <div className="w-full p-3 rounded-xl bg-red-900/30 border border-red-500/50 text-center">
                    <p className="text-xs text-red-400 font-mono break-all">{uploadError}</p>
                </div>
            )}

            {proxyId && (
                <div className="w-full max-w-xs mt-2">
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button
                                variant="outline"
                                onClick={fetchSignedDocument}
                                className="w-full h-12 border-indigo-500/30 text-indigo-300 hover:bg-indigo-900/20 hover:text-indigo-200"
                            >
                                {loadingSigned ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileText className="w-4 h-4 mr-2" />}
                                Ver Poder Firmado
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[70vw] w-[95vw] h-[85vh] flex flex-col bg-[#121212] border-white/10 p-0 overflow-hidden">
                            <DialogHeader className="p-6 pb-2 border-b border-white/5">
                                <DialogTitle className="text-xl text-white">Documento Digital Firmado</DialogTitle>
                            </DialogHeader>
                            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/5">
                                {loadingSigned ? (
                                    <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-indigo-400" /></div>
                                ) : signedHtml ? (
                                    <div className="bg-white text-black p-8 rounded-xl shadow-lg m-auto max-w-3xl" dangerouslySetInnerHTML={{ __html: signedHtml }} />
                                ) : (
                                    <div className="text-center text-gray-400 mt-20">Contenido no disponible</div>
                                )}
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
export default function PowerManagement({ userId, userRole, givenProxy, receivedProxies = [], ownWeight = 0 }: PowerManagementProps) {
    const isOperator = userRole === 'OPERATOR';
    const router = useRouter();
    const [isExpanded, setIsExpanded] = useState(!isOperator);
    const [showRevokeDialog, setShowRevokeDialog] = useState(false);
    const [activeTab, setActiveTab] = useState((userRole === 'USER' && ownWeight === 0 && !givenProxy) ? "receive" : "give");

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [registered, setRegistered] = useState(false);

    const [repDoc, setRepDoc] = useState("");
    const [repName, setRepName] = useState("");
    const [ownerDoc, setOwnerDoc] = useState(""); // Para el Operador: cédula del propietario
    const [method, setMethod] = useState<ProxyType | null>(null);

    // Operator camera state
    const [isCaptured, setIsCaptured] = useState(false);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Stop camera on unmount
    useEffect(() => {
        return () => {
            if (videoRef.current && videoRef.current.srcObject) {
                const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
                tracks.forEach(track => track.stop());
            }
        };
    }, []);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" },
                audio: false
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Error accessing camera:", err);
            setMessage({ type: 'error', text: "No se pudo acceder a la cámara. Verifica los permisos del navegador." });
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
            tracks.forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
    };

    const takePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            if (context) {
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg');
                setCapturedImage(dataUrl);
                setIsCaptured(true);
                stopCamera();
            }
        }
    };

    // OTP flow
    const [otpSent, setOtpSent] = useState(false);
    const [otpVerified, setOtpVerified] = useState(false);
    const [sendingOtp, setSendingOtp] = useState(false);
    const [signatureId, setSignatureId] = useState<string | null>(null);
    const [phoneMask, setPhoneMask] = useState<string | null>(null);

    // PDF state
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [proxyPreviewHtml, setProxyPreviewHtml] = useState<string | null>(null);
    const [registeredProxyId, setRegisteredProxyId] = useState<string | null>(null);
    const [loadingSigned, setLoadingSigned] = useState(false);
    const [signedHtml, setSignedHtml] = useState<string | null>(null);

    const step1Complete = repDoc.trim().length > 0 && repName.trim().length > 0;
    const step1OperatorComplete = ownerDoc.trim().length > 0 && repDoc.trim().length > 0 && repName.trim().length > 0;
    const step3Complete = (method === 'DIGITAL' && otpVerified) || (method === 'PDF' && !!pdfFile);

    const handleSendOTP = async () => {
        setSendingOtp(true);
        setMessage(null);
        try {
            const res = await requestProxyOTP({ representativeDoc: repDoc, externalName: repName });
            if (res.success) {
                setSignatureId(res.signatureId!);
                setPhoneMask(res.phoneEnd!);
                setOtpSent(true);
            } else {
                setMessage({ type: 'error', text: res.message });
            }
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setSendingOtp(false);
        }
    };

    const handleVerifyOTP = async (code: string) => {
        if (!signatureId) return false;
        try {
            const res = await verifyProxyOTP(signatureId, code);
            if (res.success) {
                setOtpVerified(true);
                setRegisteredProxyId(res.proxyId || null);
                // The proxy is already verified and activated by verifyProxyOTP
                setRegistered(true);
                router.refresh();
                return true;
            } else {
                setMessage({ type: 'error', text: res.message });
                return false;
            }
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || "Error desconocido" });
            return false;
        }
    };

    const handleGrant = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        try {
            let documentUrl = undefined;
            if (method === 'PDF' && pdfFile) {
                const supabase = createClient();
                const fileExt = pdfFile.name.split('.').pop() || 'pdf';
                const fileName = `${Date.now()}-${repDoc}.${fileExt}`;
                const filePath = `${userId}/${fileName}`;

                setMessage({ type: 'success', text: "Subiendo documento..." });
                const { error: uploadError } = await supabase.storage
                    .from('proxies')
                    .upload(filePath, pdfFile);

                if (uploadError) {
                    throw new Error("Error al subir el archivo PDF: " + uploadError.message);
                }

                const { data: publicUrlData } = supabase.storage
                    .from('proxies')
                    .getPublicUrl(filePath);

                documentUrl = publicUrlData.publicUrl;
                setMessage(null); // Clear loading message
            }

            const result = await registerProxy({
                type: method as ProxyType,
                representativeDoc: repDoc,
                externalName: repName,
                documentUrl,
            });
            if (result.success) {
                setRegistered(true);
                router.refresh();
            } else {
                setMessage({ type: 'error', text: result.message || "Error al registrar poder." });
            }
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setLoading(false);
        }
    };

    const handleRevoke = async (proxyId: string) => {
        setLoading(true);
        try {
            const result = await revokeProxy(proxyId);
            if (result.success) {
                setMessage({ type: 'success', text: "Poder revocado exitosamente." });
                setTimeout(() => {
                    router.refresh();
                }, 1000); // Wait 1 second before forcing Server Component refresh
            } else {
                setMessage({ type: 'error', text: result.message });
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleMethodChange = (newMethod: ProxyType) => {
        setMethod(newMethod);
        setOtpSent(false);
        setOtpVerified(false);
        setPdfFile(null);
        setProxyPreviewHtml(null);
    };

    const fetchPreview = async () => {
        if (!repDoc || !repName) return;
        setLoadingPreview(true);
        try {
            const res = await getProxyDocumentContent({ representativeDoc: repDoc, representativeName: repName, isPreview: true });
            if (res.success && res.html) {
                setProxyPreviewHtml(res.html);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingPreview(false);
        }
    };

    return (
        <Card className="bg-[#121212] border-white/5 transition-all duration-300">
            <CardHeader
                className="pb-3 cursor-pointer select-none"
                onClick={() => isOperator && setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center justify-between">
                    <CardTitle className="text-gray-200 flex items-center gap-2 text-xl">
                        <ShieldCheck className="w-6 h-6 text-indigo-400" />
                        {isOperator ? "Validar Poder" : "Gestión de Poderes"}
                    </CardTitle>
                    {isOperator && (
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-white">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                    )}
                </div>
                {(isExpanded || !isOperator) && (
                    <CardDescription className="text-base mt-1">
                        {isOperator
                            ? "Registre o valide poderes presentados físicamente."
                            : "Otorga tu voto a un tercero o administra los poderes recibidos."}
                    </CardDescription>
                )}
            </CardHeader>

            {isExpanded && (
                <CardContent className="animate-in slide-in-from-top-2 duration-200">

                    {/* ─── OPERADOR: flujo con cédula propietario + cámara ─── */}
                    {isOperator ? (
                        registered ? (
                            <div className="flex flex-col items-center justify-center py-14 gap-6 animate-in fade-in zoom-in-95 duration-500">
                                <div className="relative">
                                    <div className="w-32 h-32 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                        <div className="w-22 h-22 rounded-full bg-emerald-500/20 flex items-center justify-center p-4">
                                            <CheckCircle2 className="w-14 h-14 text-emerald-400" strokeWidth={1.5} />
                                        </div>
                                    </div>
                                    <div className="absolute inset-0 rounded-full border-2 border-emerald-500/30 animate-ping" />
                                </div>
                                <div className="text-center space-y-3 max-w-xs">
                                    <h3 className="text-2xl font-extrabold text-white leading-tight">¡Poder registrado exitosamente!</h3>
                                    <p className="text-lg text-gray-300 leading-relaxed">El representante ha sido autorizado.</p>
                                </div>
                                <div className="w-full p-4 rounded-2xl bg-emerald-900/15 border border-emerald-500/20 text-center">
                                    <p className="text-sm text-emerald-400 font-medium">✅ El poder quedó registrado en el sistema de la asamblea.</p>
                                </div>
                                <Button
                                    onClick={() => {
                                        setRegistered(false);
                                        setOwnerDoc(""); setRepDoc(""); setRepName("");
                                        setCapturedImage(null); setIsCaptured(false); setIsCameraActive(false);
                                        setMessage(null);
                                    }}
                                    className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-12 px-8"
                                >
                                    Registrar otro poder
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-8 py-2">
                                {/* PASO 1: Datos del propietario y apoderado */}
                                <div className="space-y-5">
                                    <div className="space-y-3">
                                        <Label htmlFor="ownerDoc" className="text-gray-200 text-base font-semibold block">
                                            Número de Cédula del Propietario
                                        </Label>
                                        <Input
                                            id="ownerDoc"
                                            placeholder="Ej: 80123456"
                                            value={ownerDoc}
                                            onChange={(e) => setOwnerDoc(e.target.value)}
                                            className="h-14 text-lg bg-[#1E1E1E] border-2 border-white/15 text-white placeholder:text-gray-500 focus:border-indigo-500 rounded-xl px-4 transition-colors"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <Label htmlFor="repDocOp" className="text-gray-200 text-base font-semibold block">
                                            Número de Cédula del Apoderado
                                        </Label>
                                        <Input
                                            id="repDocOp"
                                            placeholder="Ej: 12345678"
                                            value={repDoc}
                                            onChange={(e) => setRepDoc(e.target.value)}
                                            className="h-14 text-lg bg-[#1E1E1E] border-2 border-white/15 text-white placeholder:text-gray-500 focus:border-indigo-500 rounded-xl px-4 transition-colors"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <Label htmlFor="repNameOp" className="text-gray-200 text-base font-semibold block">
                                            Nombre Completo del Apoderado
                                        </Label>
                                        <Input
                                            id="repNameOp"
                                            placeholder="Ej: Juan Pérez"
                                            value={repName}
                                            onChange={(e) => setRepName(e.target.value)}
                                            className="h-14 text-lg bg-[#1E1E1E] border-2 border-white/15 text-white placeholder:text-gray-500 focus:border-indigo-500 rounded-xl px-4 transition-colors"
                                        />
                                    </div>
                                </div>

                                {/* PASO 2: Cámara */}
                                {step1OperatorComplete && !capturedImage && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                                        <p className="text-gray-200 text-base font-semibold">Captura del Documento Físico</p>
                                        {!isCameraActive ? (
                                            <Button
                                                onClick={() => { setIsCameraActive(true); setTimeout(startCamera, 100); }}
                                                className="w-full h-24 text-xl font-bold rounded-3xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-2xl flex items-center justify-center gap-4"
                                            >
                                                <Camera className="w-8 h-8" />
                                                Abrir Cámara para tomar foto al Poder
                                            </Button>
                                        ) : (
                                            <div className="space-y-4">
                                                <div className="relative aspect-[4/3] rounded-3xl overflow-hidden bg-[#1A1A1A] border-4 border-white/5 shadow-2xl">
                                                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                                                    <div className="absolute inset-0 pointer-events-none border-[40px] border-black/40 flex items-center justify-center">
                                                        <div className="w-full h-full border-2 border-dashed border-white/30 rounded-xl" />
                                                    </div>
                                                    <div className="absolute top-6 left-6 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                                        <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">En Vivo</span>
                                                    </div>
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <button
                                                            onClick={takePhoto}
                                                            className="group/shutter flex flex-col items-center gap-3 transition-transform active:scale-95"
                                                        >
                                                            <div className="w-24 h-24 rounded-full border-4 border-white flex items-center justify-center bg-black/20 backdrop-blur-sm hover:bg-black/40 transition-colors">
                                                                <div className="w-16 h-16 rounded-full bg-white shadow-lg" />
                                                            </div>
                                                            <span className="bg-black/80 backdrop-blur-md text-white text-sm font-black px-4 py-2 rounded-xl uppercase tracking-widest shadow-xl">
                                                                Tomar foto
                                                            </span>
                                                        </button>
                                                    </div>
                                                </div>
                                                <canvas ref={canvasRef} className="hidden" />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Vista previa */}
                                {capturedImage && (
                                    <div className="space-y-4 animate-in zoom-in-95 duration-300">
                                        <p className="text-gray-200 text-base font-semibold">Previsualización de la Captura</p>
                                        <div className="relative aspect-[4/3] rounded-3xl overflow-hidden border-4 border-emerald-500/30 shadow-2xl">
                                            <img src={capturedImage} alt="Vista previa" className="w-full h-full object-cover" />
                                            <div className="absolute bottom-4 right-4 bg-emerald-500/90 text-white px-3 py-1.5 rounded-full flex items-center gap-2 text-sm font-bold shadow-lg">
                                                <CheckCircle2 className="w-4 h-4" />
                                                Capturado
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            onClick={() => { setIsCaptured(false); setCapturedImage(null); setIsCameraActive(true); setTimeout(startCamera, 100); }}
                                            className="w-full h-14 rounded-2xl bg-red-900/10 border-2 border-red-500/20 text-red-400 hover:bg-red-900/20 hover:text-red-300 flex items-center justify-center gap-3"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                            Descartar y volver a tomar foto
                                        </Button>
                                    </div>
                                )}

                                {/* PASO 3: Finalizar */}
                                {capturedImage && (
                                    <div className="animate-in fade-in zoom-in-95 duration-500 pt-4 space-y-3">
                                        {message && message.type === 'success' && (
                                            <div className="p-3 rounded-xl bg-indigo-900/20 border border-indigo-500/20 text-indigo-300 text-sm flex items-center gap-2">
                                                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                                                {message.text}
                                            </div>
                                        )}
                                        <Button
                                            onClick={async () => {
                                                setLoading(true);
                                                setMessage(null);
                                                try {
                                                    // 1. Convertir foto a PDF vía /api/proxy-pdf
                                                    setMessage({ type: 'success', text: "Convirtiendo foto a PDF..." });
                                                    const html = `<!DOCTYPE html><html><head><style>*{margin:0;padding:0;box-sizing:border-box;}body{background:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px;}img{max-width:100%;max-height:95vh;object-fit:contain;border-radius:4px;}</style></head><body><img src="${capturedImage}" /></body></html>`;

                                                    const pdfResponse = await fetch('/api/proxy-pdf', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ html })
                                                    });

                                                    let documentUrl: string | undefined = undefined;

                                                    if (pdfResponse.ok) {
                                                        // 2. Subir PDF a Supabase storage (bucket 'proxies')
                                                        setMessage({ type: 'success', text: "Subiendo documento a la nube..." });
                                                        const pdfBlob = await pdfResponse.blob();
                                                        const { createClient: createSupabaseClient } = await import('@/lib/supabase/client');
                                                        const supabase = createSupabaseClient();
                                                        const fileName = `${Date.now()}-operator-proxy.pdf`;
                                                        const filePath = `${userId}/${fileName}`;

                                                        const { error: uploadError } = await supabase.storage
                                                            .from('proxies')
                                                            .upload(filePath, pdfBlob, { contentType: 'application/pdf' });

                                                        if (!uploadError) {
                                                            const { data: publicUrlData } = supabase.storage.from('proxies').getPublicUrl(filePath);
                                                            documentUrl = publicUrlData.publicUrl;
                                                        } else {
                                                            console.error("Error subiendo PDF:", uploadError.message);
                                                        }
                                                    } else {
                                                        console.error("Error convirtiendo a PDF:", await pdfResponse.text());
                                                    }

                                                    // 3. Registrar el poder con el PDF vinculado
                                                    setMessage({ type: 'success', text: "Registrando poder..." });
                                                    const result = await registerProxy({
                                                        type: 'OPERATOR',
                                                        representativeDoc: repDoc,
                                                        externalName: repName,
                                                        externalDoc: ownerDoc,
                                                        documentUrl,
                                                    });
                                                    if (result.success) {
                                                        setRegistered(true);
                                                        setMessage(null);
                                                    } else {
                                                        setMessage({ type: 'error', text: result.message || "Error al registrar poder." });
                                                    }
                                                } catch (err: any) {
                                                    setMessage({ type: 'error', text: err.message });
                                                } finally {
                                                    setLoading(false);
                                                }
                                            }}
                                            disabled={loading}
                                            className="w-full h-20 text-xl font-extrabold tracking-wide bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-2xl shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-3"
                                        >
                                            {loading ? <><Loader2 className="w-7 h-7 animate-spin" /> Procesando...</> : <><CheckCircle2 className="w-7 h-7" /> FINALIZAR Y REGISTRAR PODER</>}
                                        </Button>
                                    </div>
                                )}

                                {message && message.type === 'error' && (
                                    <div className="p-4 rounded-xl text-base flex items-center gap-3 font-medium bg-red-900/20 text-red-400 border border-red-500/20">
                                        <AlertCircle className="w-5 h-5 shrink-0" />
                                        {message.text}
                                    </div>
                                )}
                            </div>
                        )
                    ) : (
                        /* ─── USUARIO / ADMIN: flujo existente ─── */
                        registered ? (
                            <SuccessScreen proxyId={registeredProxyId} userId={userId} />
                        ) : (
                            <>
                                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                    <TabsList className={cn(
                                        "grid w-full bg-[#1A1A1A] rounded-xl p-1 gap-1 min-h-[48px] h-auto",
                                        userRole === 'USER' && (ownWeight > 0 || givenProxy) ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"
                                    )}>
                                        {!(userRole === 'USER' && ownWeight === 0 && !givenProxy) && (
                                            <TabsTrigger value="give" className="text-sm sm:text-base rounded-lg py-2 h-full whitespace-normal leading-tight break-words">Otorgar Poder</TabsTrigger>
                                        )}
                                        {userRole === 'USER' && (
                                            <TabsTrigger value="receive" className="text-sm sm:text-base rounded-lg py-2 h-full whitespace-normal leading-tight break-words">Poderes Recibidos</TabsTrigger>
                                        )}
                                    </TabsList>

                                    {/* GRANT POWER TAB */}
                                    <TabsContent value="give" className="space-y-6 pt-6">
                                        {givenProxy ? (
                                            <div className="p-5 rounded-2xl bg-indigo-950/20 border-2 border-indigo-500/30 space-y-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0">
                                                        <CheckCircle2 className="w-7 h-7 text-indigo-400" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-lg font-bold text-indigo-300">✅ Poder Activo</h4>
                                                        <p className="text-base text-gray-300 mt-0.5">
                                                            Has otorgado tu poder de voto a:{" "}
                                                            <span className="text-white font-semibold">
                                                                {givenProxy.representative?.full_name || givenProxy.external_name || givenProxy.representative_doc_number}
                                                            </span>
                                                        </p>
                                                    </div>
                                                </div>

                                                {givenProxy.type === 'DIGITAL' && (
                                                    <Dialog>
                                                        <DialogTrigger asChild>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                onClick={async () => {
                                                                    setLoadingSigned(true);
                                                                    const { getProxyDocumentContent } = await import("./power-actions");
                                                                    const res = await getProxyDocumentContent({ proxyId: givenProxy.id });
                                                                    if (res.success && res.html) setSignedHtml(res.html);
                                                                    setLoadingSigned(false);
                                                                }}
                                                                className="w-full h-12 border-indigo-500/30 text-indigo-300 hover:bg-indigo-900/20 hover:text-indigo-200"
                                                            >
                                                                {loadingSigned ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileText className="w-4 h-4 mr-2" />}
                                                                Ver Poder Firmado
                                                            </Button>
                                                        </DialogTrigger>
                                                        <DialogContent className="sm:max-w-[70vw] w-[95vw] h-[85vh] flex flex-col bg-[#121212] border-white/10 p-0 overflow-hidden">
                                                            <DialogHeader className="p-6 pb-2 border-b border-white/5">
                                                                <DialogTitle className="text-xl text-white">Documento Digital Firmado</DialogTitle>
                                                            </DialogHeader>
                                                            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/5">
                                                                {loadingSigned ? (
                                                                    <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-indigo-400" /></div>
                                                                ) : signedHtml ? (
                                                                    <div className="bg-white text-black p-8 rounded-xl shadow-lg m-auto max-w-3xl" dangerouslySetInnerHTML={{ __html: signedHtml }} />
                                                                ) : (
                                                                    <div className="text-center text-gray-400 mt-20">Contenido no disponible</div>
                                                                )}
                                                            </div>
                                                        </DialogContent>
                                                    </Dialog>
                                                )}

                                                <Dialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
                                                    <DialogTrigger asChild>
                                                        <Button
                                                            disabled={loading}
                                                            className="w-full h-14 text-base font-bold bg-red-900/20 hover:bg-red-900/40 text-red-400 border-2 border-red-900/50 rounded-xl"
                                                        >
                                                            {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <XCircle className="w-5 h-5 mr-2" />}
                                                            Revocar Poder
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="sm:max-w-md bg-[#1E1E1E] border-white/10 text-white rounded-2xl mx-auto w-[90vw]">
                                                        <DialogHeader className="p-6 pb-0">
                                                            <DialogTitle className="text-xl flex items-center gap-2 text-red-400">
                                                                <AlertCircle className="w-6 h-6" />
                                                                Confirmar Revocación
                                                            </DialogTitle>
                                                        </DialogHeader>
                                                        <div className="p-6 space-y-4">
                                                            <p className="text-gray-300 text-base leading-relaxed">
                                                                ¿Estás seguro que deseas revocar este poder de representación?
                                                                Esta acción anulará el código de verificación o documento actual.
                                                            </p>
                                                            <div className="flex gap-3 justify-end pt-4">
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    onClick={() => setShowRevokeDialog(false)}
                                                                    className="text-gray-400 hover:text-white"
                                                                >
                                                                    Cancelar
                                                                </Button>
                                                                <Button
                                                                    type="button"
                                                                    disabled={loading}
                                                                    onClick={() => {
                                                                        handleRevoke(givenProxy.id);
                                                                        setShowRevokeDialog(false);
                                                                    }}
                                                                    className="bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20"
                                                                >
                                                                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                                                    Continuar y Revocar
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </DialogContent>
                                                </Dialog>
                                            </div>
                                        ) : ownWeight > 0 || isOperator ? (
                                            <form onSubmit={handleGrant} className="space-y-6">

                                                {/* Campos grandes */}
                                                <div className="space-y-3">
                                                    <Label htmlFor="repDoc" className="text-gray-200 text-base font-semibold block">
                                                        Número de Cédula del Apoderado
                                                    </Label>
                                                    <Input
                                                        id="repDoc"
                                                        placeholder="Ej: 123456789"
                                                        value={repDoc}
                                                        onChange={(e) => { setRepDoc(e.target.value); setOtpSent(false); setOtpVerified(false); }}
                                                        className="h-14 text-lg bg-[#1E1E1E] border-2 border-white/15 text-white placeholder:text-gray-500 focus:border-indigo-500 rounded-xl px-4 transition-colors"
                                                    />
                                                </div>

                                                <div className="space-y-3">
                                                    <Label htmlFor="repName" className="text-gray-200 text-base font-semibold block">
                                                        Nombre Completo del Apoderado
                                                    </Label>
                                                    <Input
                                                        id="repName"
                                                        placeholder="Ej: María García López"
                                                        value={repName}
                                                        onChange={(e) => setRepName(e.target.value)}
                                                        className="h-14 text-lg bg-[#1E1E1E] border-2 border-white/15 text-white placeholder:text-gray-500 focus:border-indigo-500 rounded-xl px-4 transition-colors"
                                                    />
                                                </div>

                                                {/* PASO 2: Selección de método */}
                                                {step1Complete && (
                                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500 fill-mode-both">
                                                        <p className="text-gray-200 text-base font-semibold">
                                                            ¿Cómo deseas presentar tu poder?
                                                        </p>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                            {/* Tarjeta A */}
                                                            <button
                                                                type="button"
                                                                onClick={() => handleMethodChange('DIGITAL')}
                                                                className={cn(
                                                                    "relative w-full p-5 rounded-2xl border-2 transition-all duration-200 flex flex-col items-center gap-3 cursor-pointer group",
                                                                    method === 'DIGITAL'
                                                                        ? "bg-indigo-600/20 border-indigo-500 shadow-lg shadow-indigo-500/20 scale-[1.02]"
                                                                        : "bg-[#1A1A1A] border-white/10 hover:border-white/30 hover:bg-[#222]"
                                                                )}
                                                            >
                                                                {method === 'DIGITAL' && (
                                                                    <div className="absolute top-3 right-3 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
                                                                        <CheckCircle2 className="w-4 h-4 text-white" />
                                                                    </div>
                                                                )}
                                                                <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center transition-colors", method === 'DIGITAL' ? "bg-indigo-500/30" : "bg-white/5 group-hover:bg-white/10")}>
                                                                    <Smartphone className={cn("w-9 h-9 transition-colors", method === 'DIGITAL' ? "text-indigo-300" : "text-gray-400")} />
                                                                </div>
                                                                <div className="text-center">
                                                                    <p className={cn("text-base font-bold transition-colors", method === 'DIGITAL' ? "text-indigo-200" : "text-gray-300")}>
                                                                        Firmar con código al celular
                                                                    </p>
                                                                    <p className={cn("text-sm mt-1 transition-colors", method === 'DIGITAL' ? "text-indigo-400" : "text-gray-500")}>
                                                                        Recibirás un código de verificación
                                                                    </p>
                                                                </div>
                                                            </button>

                                                            {/* Tarjeta B */}
                                                            <button
                                                                type="button"
                                                                onClick={() => handleMethodChange('PDF')}
                                                                className={cn(
                                                                    "relative w-full p-5 rounded-2xl border-2 transition-all duration-200 flex flex-col items-center gap-3 cursor-pointer group",
                                                                    method === 'PDF'
                                                                        ? "bg-indigo-600/20 border-indigo-500 shadow-lg shadow-indigo-500/20 scale-[1.02]"
                                                                        : "bg-[#1A1A1A] border-white/10 hover:border-white/30 hover:bg-[#222]"
                                                                )}
                                                            >
                                                                {method === 'PDF' && (
                                                                    <div className="absolute top-3 right-3 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
                                                                        <CheckCircle2 className="w-4 h-4 text-white" />
                                                                    </div>
                                                                )}
                                                                <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center transition-colors", method === 'PDF' ? "bg-indigo-500/30" : "bg-white/5 group-hover:bg-white/10")}>
                                                                    <FileText className={cn("w-9 h-9 transition-colors", method === 'PDF' ? "text-indigo-300" : "text-gray-400")} />
                                                                </div>
                                                                <div className="text-center">
                                                                    <p className={cn("text-base font-bold transition-colors", method === 'PDF' ? "text-indigo-200" : "text-gray-300")}>
                                                                        Subir documento en PDF
                                                                    </p>
                                                                    <p className={cn("text-sm mt-1 transition-colors", method === 'PDF' ? "text-indigo-400" : "text-gray-500")}>
                                                                        Adjunta el poder firmado
                                                                    </p>
                                                                </div>
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* PASO 3: Lógica específica */}
                                                {method === 'DIGITAL' && (
                                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500 fill-mode-both">
                                                        {!otpSent ? (
                                                            <div className="space-y-3">
                                                                <Dialog>
                                                                    <DialogTrigger asChild>
                                                                        <Button
                                                                            type="button"
                                                                            variant="outline"
                                                                            onClick={fetchPreview}
                                                                            className="w-full h-12 border-indigo-500/30 bg-indigo-900/10 text-indigo-300 hover:bg-indigo-900/20 hover:text-indigo-200"
                                                                        >
                                                                            {loadingPreview ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileText className="w-4 h-4 mr-2" />}
                                                                            Vista Previa de Poder a Firmar
                                                                        </Button>
                                                                    </DialogTrigger>
                                                                    <DialogContent className="sm:max-w-[70vw] w-[95vw] h-[85vh] flex flex-col bg-[#121212] border-white/10 p-0 overflow-hidden">
                                                                        <DialogHeader className="p-6 pb-2 border-b border-white/5">
                                                                            <DialogTitle className="text-xl text-white">Vista Previa de Poder</DialogTitle>
                                                                        </DialogHeader>
                                                                        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/5">
                                                                            {loadingPreview ? (
                                                                                <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-indigo-400" /></div>
                                                                            ) : proxyPreviewHtml ? (
                                                                                <div className="bg-white text-black p-8 rounded-xl shadow-lg m-auto max-w-3xl" dangerouslySetInnerHTML={{ __html: proxyPreviewHtml }} />
                                                                            ) : (
                                                                                <div className="text-center text-gray-400 mt-20">Haz clic nuevamente para previsualizar</div>
                                                                            )}
                                                                        </div>
                                                                    </DialogContent>
                                                                </Dialog>
                                                                <Button
                                                                    type="button"
                                                                    onClick={handleSendOTP}
                                                                    disabled={sendingOtp || !repDoc || !repName}
                                                                    className="w-full min-h-[3.5rem] h-auto py-3 px-4 text-xs sm:text-sm md:text-base font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-40 flex flex-row items-center justify-center gap-3"
                                                                >
                                                                    {sendingOtp ? (
                                                                        <>
                                                                            <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                                                                            <span className="whitespace-normal text-left sm:text-center flex-1 leading-snug break-words">
                                                                                Enviando...
                                                                            </span>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <MessageSquare className="w-5 h-5 md:w-6 md:h-6 shrink-0" />
                                                                            <span className="whitespace-normal text-left sm:text-center flex-1 leading-snug break-words">
                                                                                ENVIAR CÓDIGO DE VERIFICACIÓN POR SMS
                                                                            </span>
                                                                        </>
                                                                    )}
                                                                </Button>
                                                                <p className="text-sm text-gray-500 text-center leading-relaxed">
                                                                    📱 Recibirás un mensaje de texto en tu celular registrado<br />
                                                                    con un código de 6 dígitos.
                                                                </p>
                                                            </div>
                                                        ) : (
                                                            <div className="p-5 rounded-2xl bg-[#181824] border border-indigo-500/20">
                                                                <OTPInput
                                                                    onVerify={handleVerifyOTP}
                                                                    onResend={handleSendOTP}
                                                                    phoneEnd={phoneMask}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {method === 'PDF' && (
                                                    <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-500 fill-mode-both">
                                                        <p className="text-gray-200 text-base font-semibold">
                                                            Adjuntar Poder Firmado (PDF)
                                                        </p>
                                                        <PDFDropzone onFileChange={setPdfFile} />
                                                    </div>
                                                )}

                                                {/* PASO 4: Botón Final */}
                                                {step3Complete && (
                                                    <div className="animate-in fade-in zoom-in-95 duration-500 fill-mode-both">
                                                        <Button
                                                            type="submit"
                                                            disabled={loading}
                                                            className="w-full h-16 text-lg font-extrabold tracking-wide bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-2xl shadow-xl shadow-emerald-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                                                        >
                                                            {loading ? (
                                                                <><Loader2 className="w-6 h-6 animate-spin" /> Procesando...</>
                                                            ) : (
                                                                <><CheckCircle2 className="w-6 h-6" /> FINALIZAR Y REGISTRAR PODER</>
                                                            )}
                                                        </Button>
                                                    </div>
                                                )}

                                                {/* Error banner */}
                                                {message && message.type === 'error' && (
                                                    <div className="p-4 rounded-xl text-base flex items-center gap-3 font-medium bg-red-900/20 text-red-400 border border-red-500/20">
                                                        <AlertCircle className="w-5 h-5 shrink-0" />
                                                        {message.text}
                                                    </div>
                                                )}
                                            </form>
                                        ) : (
                                            <div className="text-center py-10 space-y-4 animate-in fade-in duration-500">
                                                <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                                    <ShieldCheck className="w-8 h-8 text-gray-500" />
                                                </div>
                                                <h3 className="text-xl font-bold text-gray-200">Acción Restringida</h3>
                                                <p className="text-gray-400 max-w-sm mx-auto">
                                                    No puedes otorgar poderes a terceros dado que actualmente no registras propiedades a tu nombre nativamente en este sistema.
                                                    Los apoderados o delegados no pueden transferir nuevamente sus votos de acuerdo al reglamento.
                                                </p>
                                            </div>
                                        )}
                                    </TabsContent>

                                    {/* RECEIVED POWERS TAB */}
                                    {userRole === 'USER' && (
                                        <TabsContent value="receive" className="pt-4">
                                            {receivedProxies.length > 0 ? (
                                                <div className="space-y-3">
                                                    <p className="text-base text-gray-300 mb-4">
                                                        Estás representando a{" "}
                                                        <span className="font-bold text-white">{receivedProxies.length}</span> unidades:
                                                    </p>
                                                    {receivedProxies.map((proxy, idx) => (
                                                        <div key={idx} className="p-4 bg-[#1A1A1A] border border-white/10 rounded-xl flex justify-between items-center">
                                                            <div>
                                                                <p className="text-white font-semibold text-base">{proxy.name}</p>
                                                                <p className="text-sm text-gray-500 mt-0.5">
                                                                    Unidad: {proxy.unit} | Coef: {Number(proxy.coefficient).toFixed(4)}
                                                                </p>
                                                            </div>
                                                            <div className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 text-sm font-medium rounded-lg border border-emerald-500/20">
                                                                Activo
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <div className="p-4 bg-indigo-900/10 border border-indigo-500/20 rounded-xl mt-4">
                                                        <p className="text-base text-indigo-300 text-center">
                                                            Tu voto ahora vale:{" "}
                                                            <span className="font-bold text-white text-lg">
                                                                {ownWeight > 0
                                                                    ? (ownWeight + receivedProxies.reduce((acc, p) => acc + (Number(p.coefficient) || 0), 0)).toFixed(4)
                                                                    : receivedProxies.reduce((acc, p) => acc + (Number(p.coefficient) || 0), 0).toFixed(4)}
                                                            </span>
                                                            {ownWeight > 0 && <span className="text-sm ml-1 text-indigo-400">(Tus {ownWeight.toFixed(4)} + Poderes)</span>}
                                                        </p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-center py-12 text-gray-500">
                                                    <ShieldCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                                    <p className="text-base">No has recibido poderes de otros usuarios.</p>
                                                </div>
                                            )}
                                        </TabsContent>
                                    )}
                                </Tabs>
                            </>
                        )
                    )}
                </CardContent>
            )}
        </Card>
    );
}
