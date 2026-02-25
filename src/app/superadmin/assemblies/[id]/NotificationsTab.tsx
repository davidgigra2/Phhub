"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, Smartphone, Save, CheckCircle2, Send } from "lucide-react";
import Image from "next/image";
import { getTemplate, saveTemplate, sendWelcomeNotifications, NotificationType, NotificationChannel, NotificationTemplate } from "./notifications/actions";

function VisualIframeEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const isInternalChange = useRef(false);

    useEffect(() => {
        const iframe = iframeRef.current;
        if (!iframe) return;

        const doc = iframe.contentDocument;
        if (!doc) return;

        if (!isInternalChange.current) {
            // Replace {{appUrl}} with local origin so preview images load
            const previewValue = value.replace(/\{\{appUrl\}\}/g, window.location.origin);

            doc.open();
            doc.write(previewValue);
            doc.close();
            doc.designMode = "on";

            const style = doc.createElement("style");
            style.innerHTML = "a { pointer-events: none; } body { cursor: text; font-family: sans-serif; }";
            doc.head.appendChild(style);

            const handleInput = () => {
                isInternalChange.current = true;
                // Convert origin back to {{appUrl}} for saving
                let innerHtml = doc.documentElement.innerHTML;
                innerHtml = innerHtml.replace(new RegExp(window.location.origin, 'g'), '{{appUrl}}');

                const newHtml = `<!DOCTYPE html>\n<html lang="es">\n${innerHtml}\n</html>`;
                onChange(newHtml);
                setTimeout(() => { isInternalChange.current = false; }, 50);
            };

            doc.addEventListener("input", handleInput);
            doc.addEventListener("keyup", handleInput);
        }
    }, [value, onChange]);

    return (
        <iframe
            ref={iframeRef}
            className="w-full bg-white min-h-[600px] border-none rounded-b-xl"
            title="Visual Editor"
        />
    );
}

interface NotificationsTabProps {
    assemblyId: string;
}

export default function NotificationsTab({ assemblyId }: NotificationsTabProps) {
    const [activeType, setActiveType] = useState<NotificationType>("WELCOME");
    const [activeChannel, setActiveChannel] = useState<NotificationChannel>("EMAIL");

    const [template, setTemplate] = useState<NotificationTemplate | null>(null);
    const [editorMode, setEditorMode] = useState<"visual" | "code">("visual");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [sending, setSending] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const loadTemplate = async (type: NotificationType, channel: NotificationChannel) => {
        setLoading(true);
        setMessage(null);
        try {
            const data = await getTemplate(assemblyId, type, channel);
            setTemplate(data);
        } catch (error) {
            console.error("Error loading template:", error);
            setMessage({ type: 'error', text: "Error al cargar plantilla" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTemplate(activeType, activeChannel);
    }, [activeType, activeChannel, assemblyId]);

    const handleSave = async () => {
        if (!template) return;
        setSaving(true);
        setMessage(null);
        try {
            const result = await saveTemplate(template);
            if (result.success) {
                setMessage({ type: 'success', text: "Plantilla actualizada correctamente." });
                setTimeout(() => setMessage(null), 3000);
            } else {
                setMessage({ type: 'error', text: result.message || "Error al guardar." });
            }
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || "Error desconocido" });
        } finally {
            setSaving(false);
        }
    };

    const handleSend = async () => {
        if (!confirm("¿Está seguro de enviar las notificaciones de Bienvenida a TODOS los representantes registrados? Asegúrese de haber guardado la plantilla primero.")) return;

        setSending(true);
        setMessage(null);
        try {
            const res = await sendWelcomeNotifications(assemblyId);
            if (res.success) {
                setMessage({ type: 'success', text: res.message || "Notificaciones en proceso de envío" });
            } else {
                setMessage({ type: 'error', text: res.message || "Error al enviar notificaciones" });
            }
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || "Error desconocido" });
        } finally {
            setSending(false);
        }
    };

    const getVariablesHint = () => {
        if (activeType === "WELCOME") {
            return ["{{name}}", "{{doc_number}}", "{{password}}", "{{appUrl}}", "{{assembly_name}}"];
        }
        if (activeType === "PROXY_DOCUMENT") {
            return ["{{NOMBRE_PODERDANTE}}", "{{CEDULA_PODERDANTE}}", "{{NOMBRE_APODERADO}}", "{{CEDULA_APODERADO}}", "{{FECHA_ASAMBLEA}}", "{{CIUDAD}}", "{{DIA}}", "{{MES}}", "{{ANIO}}", "{{OTP}}", "{{TIMESTAMP}}"];
        }
        return ["{{name}}", "{{units}}", "{{coef}}", "{{otp_code}}", "{{appUrl}}", "{{assembly_name}}"];
    };

    return (
        <Card className="bg-[#121212] border-white/5 mt-6">
            <CardHeader>
                <CardTitle className="text-gray-200">Personalización de Mensajes y Notificaciones</CardTitle>
                <CardDescription>
                    Configure exactamente qué textos recibirán los usuarios de esta asamblea.
                    Puede usar variables entre llaves doble para personalizar cada mensaje automáticamente.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {/* Left Sidebar: Type Selector */}
                    <div className="space-y-2 md:border-r border-white/10 md:pr-4">
                        <Label className="text-gray-300 text-xs uppercase font-bold tracking-wider mb-2 block">Tipo de Evento</Label>
                        <Button
                            variant="ghost"
                            className={`w-full justify-start transition-colors ${activeType === 'WELCOME' ? 'bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 hover:text-indigo-200' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                            onClick={() => setActiveType('WELCOME')}
                        >
                            Bienvenida y Credenciales
                        </Button>
                        <Button
                            variant="ghost"
                            className={`w-full justify-start transition-colors ${activeType === 'OTP_SIGN' ? 'bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 hover:text-indigo-200' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                            onClick={() => { setActiveType('OTP_SIGN'); setActiveChannel('EMAIL'); }}
                        >
                            Firma de Poderes (OTP)
                            <span className="ml-auto text-[10px] bg-indigo-500/20 text-indigo-400 px-1.5 rounded">Pronto</span>
                        </Button>
                        <Button
                            variant="ghost"
                            className={`w-full justify-start transition-colors ${activeType === 'PROXY_DOCUMENT' ? 'bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 hover:text-indigo-200' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                            onClick={() => { setActiveType('PROXY_DOCUMENT'); setActiveChannel('EMAIL'); }}
                        >
                            Plantilla de Poder (PDF)
                        </Button>
                    </div>

                    {/* Right Content: Channel & Editor */}
                    <div className="md:col-span-3 space-y-4">
                        <Tabs value={activeChannel} onValueChange={(v) => setActiveChannel(v as NotificationChannel)}>
                            <TabsList className="bg-[#1A1A1A] w-full justify-start border-b border-white/10 rounded-none h-auto p-0 pb-px">
                                <TabsTrigger value="EMAIL" className="rounded-none data-[state=active]:bg-transparent data-[state=active]:text-indigo-400 data-[state=active]:border-b-2 data-[state=active]:border-indigo-500 py-3 px-6 text-gray-400 hover:text-gray-200">
                                    <Mail className="w-4 h-4 mr-2" /> {activeType === 'PROXY_DOCUMENT' ? 'Documento / Plantilla' : 'Correo (Email)'}
                                </TabsTrigger>
                                {activeType !== 'PROXY_DOCUMENT' && (
                                    <TabsTrigger value="SMS" className="rounded-none data-[state=active]:bg-transparent data-[state=active]:text-indigo-400 data-[state=active]:border-b-2 data-[state=active]:border-indigo-500 py-3 px-6 text-gray-400 hover:text-gray-200">
                                        <Smartphone className="w-4 h-4 mr-2" /> Celular (SMS)
                                    </TabsTrigger>
                                )}
                            </TabsList>
                        </Tabs>

                        {loading ? (
                            <div className="h-48 flex items-center justify-center">
                                <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
                            </div>
                        ) : template ? (
                            <div className="space-y-4 animate-in fade-in pt-4">
                                {activeChannel === "EMAIL" && (
                                    <div className="space-y-2">
                                        <Label htmlFor="subject" className="text-gray-200">Asunto del Correo</Label>
                                        <Input
                                            id="subject"
                                            value={template.subject || ''}
                                            onChange={e => setTemplate({ ...template, subject: e.target.value })}
                                            className="bg-[#1A1A1A] border-white/10 text-white placeholder:text-gray-500"
                                            placeholder="Escriba el asunto del correo..."
                                        />
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <Label htmlFor="body" className="text-gray-200">Cuerpo del Mensaje {activeChannel === 'SMS' && '(Recomendado max 160 caracteres)'}</Label>

                                    {activeChannel === 'EMAIL' ? (
                                        <div className="rounded-xl overflow-hidden shadow-lg mt-4 w-full border border-white/10">
                                            <div className="bg-[#1A1A1A] px-3 py-2 border-b border-white/10 flex justify-between items-center">
                                                <Tabs value={editorMode} onValueChange={(v) => setEditorMode(v as "visual" | "code")} className="w-[300px]">
                                                    <TabsList className="bg-black text-gray-400">
                                                        <TabsTrigger value="visual" className="text-xs">Vista Previa Editable</TabsTrigger>
                                                        <TabsTrigger value="code" className="text-xs">Código HTML</TabsTrigger>
                                                    </TabsList>
                                                </Tabs>
                                                <div className="flex gap-1.5 flex-wrap justify-end max-w-[50%]">
                                                    {getVariablesHint().map(v => (
                                                        <span
                                                            key={v}
                                                            className="bg-white/5 text-gray-300 px-1.5 py-0.5 text-[10px] uppercase tracking-wider rounded cursor-pointer hover:bg-white/10 border border-white/5"
                                                            onClick={() => {
                                                                if (editorMode === "code") {
                                                                    const textarea = document.getElementById('body') as HTMLTextAreaElement;
                                                                    if (textarea) {
                                                                        const start = textarea.selectionStart;
                                                                        const end = textarea.selectionEnd;
                                                                        const newValue = template.body.substring(0, start) + v + template.body.substring(end);
                                                                        setTemplate({ ...template, body: newValue });
                                                                        setTimeout(() => textarea.setSelectionRange(start + v.length, start + v.length), 0);
                                                                    }
                                                                } else {
                                                                    // Append to the end of the visual editor's body
                                                                    const newValue = template.body.replace("</body>", `  ${v}\n</body>`);
                                                                    setTemplate({ ...template, body: newValue });
                                                                }
                                                            }}
                                                        >
                                                            {v}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            {editorMode === "code" ? (
                                                <Textarea
                                                    id="body"
                                                    value={template.body}
                                                    onChange={e => setTemplate({ ...template, body: e.target.value })}
                                                    className="bg-[#0A0A0A] border-0 focus-visible:ring-1 focus-visible:ring-indigo-500 text-green-400 font-mono text-[11px] leading-relaxed resize-y min-h-[500px] p-4 shadow-none break-all rounded-none"
                                                    spellCheck={false}
                                                />
                                            ) : (
                                                <VisualIframeEditor
                                                    value={template.body}
                                                    onChange={newHtml => setTemplate({ ...template, body: newHtml })}
                                                />
                                            )}
                                        </div>
                                    ) : (
                                        <Textarea
                                            id="body"
                                            value={template.body}
                                            onChange={e => setTemplate({ ...template, body: e.target.value })}
                                            className="bg-[#1A1A1A] border-white/10 min-h-[150px] font-mono text-sm leading-relaxed resize-y text-white placeholder:text-gray-500 mt-2"
                                        />
                                    )}
                                </div>

                                <div className="p-3 bg-indigo-950/20 border border-indigo-500/20 rounded-lg">
                                    <p className="text-xs text-indigo-300 font-medium mb-1">Variables Dinámicas Mágicas (Haz clic para copiar):</p>
                                    <div className="flex flex-wrap gap-2">
                                        {getVariablesHint().map(v => (
                                            <code key={v} className="text-xs bg-indigo-900/40 text-indigo-200 px-2 py-1 rounded cursor-pointer hover:bg-indigo-700/50 transition-colors" title="Copiar y pegar en el cuerpo">
                                                {v}
                                            </code>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-gray-500 mt-2">NOTA: No modifique los corchetes dobles {"{{}}"}.</p>
                                </div>

                                {message && (
                                    <div className={`p-3 rounded-md text-sm flex items-center gap-2 ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                        <CheckCircle2 className="w-4 h-4" />
                                        {message.text}
                                    </div>
                                )}

                                <div className="flex justify-between items-center pt-4">
                                    <div className="flex gap-2">
                                        {activeType === 'WELCOME' && (
                                            <Button
                                                onClick={handleSend}
                                                disabled={sending || saving || activeType !== 'WELCOME'}
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[120px]"
                                            >
                                                {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                                                Enviar a Todos
                                            </Button>
                                        )}
                                    </div>
                                    <Button
                                        onClick={handleSave}
                                        disabled={saving || sending}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[120px]"
                                    >
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                        Guardar Plantilla
                                    </Button>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
