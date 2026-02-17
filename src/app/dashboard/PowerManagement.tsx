"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Smartphone, UserPlus, XCircle, CheckCircle2, AlertCircle, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { registerProxy, revokeProxy, ProxyType } from "./power-actions"; // We will create this
import { cn } from "@/lib/utils";

interface PowerManagementProps {
    userId: string;
    userRole: string; // Added userRole
    // We could pass initial data here or fetch it inside
    givenProxy?: any;
    receivedProxies?: any[];
}

export default function PowerManagement({ userId, userRole, givenProxy, receivedProxies = [] }: PowerManagementProps) {
    // Only collapsible/hidden by default for Operators
    const isOperator = userRole === 'OPERATOR';
    const [isExpanded, setIsExpanded] = useState(!isOperator);

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Form Stats
    const [repDoc, setRepDoc] = useState("");
    const [repName, setRepName] = useState(""); // New: Name
    const [otpCode, setOtpCode] = useState(""); // New: OTP
    const [method, setMethod] = useState<ProxyType>('DIGITAL');
    const [otpSent, setOtpSent] = useState(false); // Mock OTP state

    const handleSendOTP = () => {
        if (!repDoc) {
            setMessage({ type: 'error', text: "Ingrese el documento primero." });
            return;
        }
        setLoading(true);
        // Mock Send
        setTimeout(() => {
            setLoading(false);
            setOtpSent(true);
            setMessage({ type: 'success', text: "Código enviado al usuario (Simulado: 1234)" });
        }, 1500);
    };

    const handleGrant = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            const result = await registerProxy({
                type: method,
                representativeDoc: repDoc,
                externalName: repName, // Pass name
                // otpCode: otpCode // We would pass this to verify
            });

            if (result.success) {
                setMessage({ type: 'success', text: result.message });
                setRepDoc("");
                setRepName("");
                setOtpCode("");
                setOtpSent(false);
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

    return (
        <Card className="bg-[#121212] border-white/5 transition-all duration-300">
            <CardHeader className="pb-3 cursor-pointer select-none" onClick={() => isOperator && setIsExpanded(!isExpanded)}>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-gray-200 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-indigo-400" />
                        {isOperator ? "Validar Poder" : "Gestión de Poderes"}
                    </CardTitle>
                    {isOperator && (
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-white">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                    )}
                </div>
                {(isExpanded || !isOperator) && (
                    <CardDescription>
                        {isOperator
                            ? "Registre o valide poderes presentados físicamente."
                            : "Otorga tu voto a un tercero o administra los poderes recibidos."}
                    </CardDescription>
                )}
            </CardHeader>

            {isExpanded && (
                <CardContent className="animate-in slide-in-from-top-2 duration-200">
                    <Tabs defaultValue="give" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 bg-[#1A1A1A]">
                            <TabsTrigger value="give">Otorgar Poder</TabsTrigger>
                            {userRole === 'USER' && (
                                <TabsTrigger value="receive">Poderes Recibidos</TabsTrigger>
                            )}
                        </TabsList>

                        {/* GRANT POWER TAB */}
                        <TabsContent value="give" className="space-y-4 pt-4">
                            {givenProxy ? (
                                <div className="p-4 rounded-lg bg-indigo-950/20 border border-indigo-500/20 space-y-3">
                                    <div className="flex items-center gap-3">
                                        <CheckCircle2 className="w-6 h-6 text-indigo-400" />
                                        <div>
                                            <h4 className="font-semibold text-indigo-300">Poder Activo</h4>
                                            <p className="text-sm text-gray-400">
                                                Has otorgado tu poder de voto a: <br />
                                                <span className="text-white font-medium">
                                                    {givenProxy.representative?.full_name || givenProxy.external_name || givenProxy.representative_doc_number}
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => handleRevoke(givenProxy.id)}
                                        disabled={loading}
                                        className="w-full bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-900/50"
                                    >
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
                                        Revocar Poder
                                    </Button>
                                </div>
                            ) : (
                                <form onSubmit={handleGrant} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-gray-300">Método de Representación</Label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div
                                                onClick={() => setMethod('DIGITAL')}
                                                className={cn(
                                                    "cursor-pointer p-3 rounded-lg border flex flex-col items-center gap-2 transition-all",
                                                    method === 'DIGITAL'
                                                        ? "bg-indigo-600/20 border-indigo-500 text-indigo-300"
                                                        : "bg-[#1A1A1A] border-white/10 text-gray-500 hover:bg-[#222]"
                                                )}
                                            >
                                                <Smartphone className="w-6 h-6" />
                                                <span className="text-xs font-medium">Digital (App)</span>
                                            </div>
                                            <div
                                                onClick={() => setMethod('PDF')}
                                                className={cn(
                                                    "cursor-pointer p-3 rounded-lg border flex flex-col items-center gap-2 transition-all",
                                                    method === 'PDF'
                                                        ? "bg-indigo-600/20 border-indigo-500 text-indigo-300"
                                                        : "bg-[#1A1A1A] border-white/10 text-gray-500 hover:bg-[#222]"
                                                )}
                                            >
                                                <FileText className="w-6 h-6" />
                                                <span className="text-xs font-medium">Subir PDF</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Common Fields */}
                                    <div className="space-y-2">
                                        <Label htmlFor="repDoc" className="text-gray-300">Número de Identificación</Label>
                                        <Input
                                            id="repDoc"
                                            placeholder="Cédula / ID"
                                            value={repDoc}
                                            onChange={(e) => setRepDoc(e.target.value)}
                                            className="bg-[#1A1A1A] border-white/10 text-white"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="repName" className="text-gray-300">Nombre Completo</Label>
                                        <Input
                                            id="repName"
                                            placeholder="Nombre del Apoderado"
                                            value={repName}
                                            onChange={(e) => setRepName(e.target.value)}
                                            className="bg-[#1A1A1A] border-white/10 text-white"
                                        />
                                    </div>

                                    {method === 'DIGITAL' ? (
                                        <div className="space-y-2">
                                            <Label htmlFor="otp" className="text-gray-300">Código OTP</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    id="otp"
                                                    placeholder="Código de verificación"
                                                    value={otpCode}
                                                    onChange={(e) => setOtpCode(e.target.value)}
                                                    className="bg-[#1A1A1A] border-white/10 text-white"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="secondary"
                                                    onClick={handleSendOTP}
                                                    disabled={loading || otpSent || !repDoc}
                                                    className="shrink-0"
                                                >
                                                    {otpSent ? "Enviado" : "Enviar Código"}
                                                </Button>
                                            </div>
                                            <p className="text-xs text-gray-500">Se enviará un código al contacto del usuario.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2 animate-in fade-in">
                                            <Label htmlFor="pdf" className="text-gray-300">Subir Poder Firmado (PDF)</Label>
                                            <Input
                                                id="pdf"
                                                type="file"
                                                accept=".pdf"
                                                className="bg-[#1A1A1A] border-white/10 text-gray-300 file:bg-indigo-600 file:text-white file:border-0 file:rounded-md file:px-2 file:py-1 file:mr-3 file:text-sm file:font-medium hover:file:bg-indigo-500"
                                            />
                                        </div>
                                    )}

                                    <Button
                                        type="submit"
                                        disabled={loading || !repDoc || !repName || (method === 'DIGITAL' && !otpCode)}
                                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white mt-2"
                                    >
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                                        Registrar Poder
                                    </Button>
                                </form>
                            )}
                        </TabsContent>

                        {/* RECEIVED POWERS TAB - Only for USER role */}
                        {userRole === 'USER' && (
                            <TabsContent value="receive" className="pt-4">
                                {receivedProxies.length > 0 ? (
                                    <div className="space-y-3">
                                        <p className="text-sm text-gray-400 mb-2">
                                            Estás representando a {receivedProxies.length} unidades:
                                        </p>
                                        {receivedProxies.map((proxy) => (
                                            <div key={proxy.id} className="p-3 bg-[#1A1A1A] border border-white/10 rounded-lg flex justify-between items-center">
                                                <div>
                                                    <p className="text-white font-medium">{proxy.principal?.full_name}</p>
                                                    <p className="text-xs text-gray-500">
                                                        Unidad: {proxy.principal?.units?.number} | Coef: {Number(proxy.principal?.units?.coefficient).toFixed(4)}
                                                    </p>
                                                </div>
                                                <div className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded border border-emerald-500/20">
                                                    Activo
                                                </div>
                                            </div>
                                        ))}
                                        <div className="p-3 bg-indigo-900/10 border border-indigo-500/20 rounded-lg mt-4">
                                            <p className="text-sm text-indigo-300 text-center">
                                                Tu voto ahora vale: <span className="font-bold text-white">
                                                    {(
                                                        receivedProxies.reduce((acc, p) => acc + (p.principal?.units?.coefficient || 0), 0)
                                                    ).toFixed(4)} + Tu Coef.
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-500">
                                        <p>No has recibido poderes de otros usuarios.</p>
                                    </div>
                                )}
                            </TabsContent>
                        )}
                    </Tabs>

                    {message && (
                        <div className={cn(
                            "mt-4 p-3 rounded-lg text-sm flex items-center gap-2",
                            message.type === 'success' ? "bg-emerald-900/20 text-emerald-400" : "bg-red-900/20 text-red-400"
                        )}>
                            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                            {message.text}
                        </div>
                    )}
                </CardContent>
            )}
        </Card>
    );
}
