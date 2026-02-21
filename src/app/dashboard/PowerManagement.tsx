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
    MessageSquare, Trash2, UploadCloud
} from "lucide-react";
import { registerProxy, revokeProxy, ProxyType } from "./power-actions";
import { cn } from "@/lib/utils";

interface PowerManagementProps {
    userId: string;
    userRole: string;
    givenProxy?: any;
    receivedProxies?: any[];
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
            setFile(selected);
            onFileChange(selected);
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
const CORRECT_OTP = "123456";
const RESEND_DELAY = 60;

function OTPInput({ onSuccess }: { onSuccess: () => void }) {
    const [digits, setDigits] = useState(Array(6).fill(""));
    const [otpError, setOtpError] = useState(false);
    const [otpVerified, setOtpVerified] = useState(false);
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
        inputs.current[0]?.focus();
    };

    const handleChange = (index: number, value: string) => {
        const digit = value.replace(/\D/g, "").slice(-1);
        const newDigits = [...digits];
        newDigits[index] = digit;
        setDigits(newDigits);
        setOtpError(false);
        if (digit && index < 5) inputs.current[index + 1]?.focus();
        if (newDigits.every((d) => d !== "")) {
            const code = newDigits.join("");
            if (code === CORRECT_OTP) { setOtpVerified(true); setTimeout(onSuccess, 800); }
            else { setOtpError(true); }
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace" && !digits[index] && index > 0) inputs.current[index - 1]?.focus();
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
        const newDigits = Array(6).fill("").map((_, i) => pasted[i] || "");
        setDigits(newDigits);
        if (pasted.length === 6) {
            if (pasted === CORRECT_OTP) { setOtpVerified(true); setTimeout(onSuccess, 800); }
            else { setOtpError(true); }
        }
        inputs.current[Math.min(pasted.length, 5)]?.focus();
    };

    return (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-300">
            <div className="text-center space-y-1">
                <p className="text-base font-semibold text-gray-200">
                    Ingresa el código que recibiste por mensaje de texto (SMS)
                </p>
                <p className="text-sm text-gray-500">Código de 6 dígitos</p>
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
                        onChange={(e) => handleChange(i, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(i, e)}
                        className={cn(
                            "w-12 h-16 text-center text-2xl font-bold rounded-xl border-2 bg-[#1E1E1E] text-white transition-all duration-200 outline-none focus:scale-105 shadow-sm",
                            otpVerified
                                ? "border-emerald-500 bg-emerald-900/20 text-emerald-300"
                                : otpError
                                    ? "border-red-500 bg-red-900/10 text-red-400 animate-pulse"
                                    : digit
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
                    <p className="text-base font-semibold">El código ingresado no es correcto</p>
                </div>
            )}

            {otpVerified && (
                <div className="flex items-center justify-center gap-2 text-emerald-400 animate-in fade-in duration-200">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <p className="text-base font-semibold">¡Código verificado correctamente!</p>
                </div>
            )}

            {!otpVerified && (
                <div className="text-center">
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
function SuccessScreen() {
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
        </div>
    );
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
export default function PowerManagement({ userId, userRole, givenProxy, receivedProxies = [] }: PowerManagementProps) {
    const isOperator = userRole === 'OPERATOR';
    const [isExpanded, setIsExpanded] = useState(!isOperator);

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [registered, setRegistered] = useState(false);

    const [repDoc, setRepDoc] = useState("");
    const [repName, setRepName] = useState("");
    const [method, setMethod] = useState<ProxyType | null>(null);

    // OTP flow
    const [otpSent, setOtpSent] = useState(false);
    const [otpVerified, setOtpVerified] = useState(false);
    const [sendingOtp, setSendingOtp] = useState(false);

    // PDF state
    const [pdfFile, setPdfFile] = useState<File | null>(null);

    const step1Complete = repDoc.trim().length > 0 && repName.trim().length > 0;
    const step3Complete = (method === 'DIGITAL' && otpVerified) || (method === 'PDF' && !!pdfFile);

    const handleSendOTP = () => {
        setSendingOtp(true);
        setTimeout(() => { setSendingOtp(false); setOtpSent(true); }, 1500);
    };

    const handleOtpSuccess = () => { setOtpVerified(true); };

    const handleGrant = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        try {
            const result = await registerProxy({
                type: method as ProxyType,
                representativeDoc: repDoc,
                externalName: repName,
            });
            if (result.success) {
                setRegistered(true);
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
        if (!confirm("¿Estás seguro de revocar este poder?")) return;
        setLoading(true);
        try {
            const result = await revokeProxy(proxyId);
            if (result.success) {
                setMessage({ type: 'success', text: "Poder revocado exitosamente." });
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

                    {/* ─── PANTALLA DE ÉXITO ─── */}
                    {registered ? (
                        <SuccessScreen />
                    ) : (
                        <>
                            <Tabs defaultValue="give" className="w-full">
                                <TabsList className="grid w-full grid-cols-2 bg-[#1A1A1A] h-12 rounded-xl">
                                    <TabsTrigger value="give" className="text-base rounded-lg">Otorgar Poder</TabsTrigger>
                                    {userRole === 'USER' && (
                                        <TabsTrigger value="receive" className="text-base rounded-lg">Poderes Recibidos</TabsTrigger>
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
                                            <Button
                                                onClick={() => handleRevoke(givenProxy.id)}
                                                disabled={loading}
                                                className="w-full h-14 text-base font-bold bg-red-900/20 hover:bg-red-900/40 text-red-400 border-2 border-red-900/50 rounded-xl"
                                            >
                                                {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <XCircle className="w-5 h-5 mr-2" />}
                                                Revocar Poder
                                            </Button>
                                        </div>
                                    ) : (
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
                                                            <Button
                                                                type="button"
                                                                onClick={handleSendOTP}
                                                                disabled={sendingOtp || !repDoc || !repName}
                                                                className="w-full h-16 text-base font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-40 flex items-center justify-center gap-3"
                                                            >
                                                                {sendingOtp ? (
                                                                    <><Loader2 className="w-6 h-6 animate-spin" /> Enviando...</>
                                                                ) : (
                                                                    <><MessageSquare className="w-6 h-6" /> ENVIAR CÓDIGO DE VERIFICACIÓN POR SMS</>
                                                                )}
                                                            </Button>
                                                            <p className="text-sm text-gray-500 text-center leading-relaxed">
                                                                📱 Recibirás un mensaje de texto en tu celular registrado<br />
                                                                con un código de 6 dígitos.
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <div className="p-5 rounded-2xl bg-[#181824] border border-indigo-500/20">
                                                            <OTPInput onSuccess={handleOtpSuccess} />
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
                                                {receivedProxies.map((proxy) => (
                                                    <div key={proxy.id} className="p-4 bg-[#1A1A1A] border border-white/10 rounded-xl flex justify-between items-center">
                                                        <div>
                                                            <p className="text-white font-semibold text-base">{proxy.principal?.full_name}</p>
                                                            <p className="text-sm text-gray-500 mt-0.5">
                                                                Unidad: {proxy.principal?.units?.number} | Coef: {Number(proxy.principal?.units?.coefficient).toFixed(4)}
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
                                                            {receivedProxies.reduce((acc, p) => acc + (p.principal?.units?.coefficient || 0), 0).toFixed(4)}
                                                        </span>{" "}
                                                        + Tu Coef.
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
                    )}
                </CardContent>
            )}
        </Card>
    );
}
