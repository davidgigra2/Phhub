"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, Send, ShieldCheck, UserCheck, CheckCircle2 } from "lucide-react";
import { castVote } from "./actions";

interface VoteInterfaceProps {
    vote: any;
    userRole: string;
    userId: string;
    onVoteSuccess?: () => void;
}

export default function VoteInterface({ vote, userRole, userId, onVoteSuccess }: VoteInterfaceProps) {
    const isOperator = userRole === 'OPERATOR';
    const [selectedOption, setSelectedOption] = useState<string>("");
    const [proxiedUsername, setProxiedUsername] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleVote = async () => {
        if (!selectedOption) return;

        if (isOperator && !proxiedUsername.trim()) {
            setErrorMessage("Debes ingresar la cédula/usuario del propietario.");
            return;
        }

        setLoading(true);
        setSuccessMessage(null);
        setErrorMessage(null);

        try {
            const formData = new FormData();
            formData.append("vote_id", vote.id);
            formData.append("option_id", selectedOption);
            if (isOperator) {
                formData.append("proxied_username", proxiedUsername);
            }

            const result = await castVote(formData);

            if (!result.success) {
                // Show info/warning message (not acceptable error, just feedback)
                setErrorMessage(result.message);

                // If already voted OR user not found, clear inputs so operator can proceed immediately
                if ((result.code === 'ALREADY_VOTED' || result.code === 'USER_NOT_FOUND') && isOperator) {
                    setProxiedUsername("");
                    setSelectedOption("");
                }
            } else {
                if (isOperator) {
                    setSuccessMessage(`Voto registrado correctamente para: ${proxiedUsername}`);
                    setProxiedUsername("");
                    setSelectedOption("");

                    // Clear success message after 4s
                    setTimeout(() => setSuccessMessage(null), 4000);
                } else {
                    onVoteSuccess?.();
                }
            }

        } catch (error: any) {
            console.error("Voting error:", error);
            setErrorMessage("Error inesperado: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mt-4 pt-4 border-t border-white/5 space-y-4">
            {isOperator && (
                <div className="bg-indigo-500/10 p-4 rounded-lg border border-indigo-500/20 space-y-3 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2 text-indigo-400 mb-2">
                        <ShieldCheck className="w-4 h-4" />
                        <span className="text-sm font-semibold uppercase tracking-wider">Modo Operador</span>
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="proxy-user" className="text-xs text-gray-400">Cédula / Usuario del Propietario</Label>
                        <div className="relative">
                            <UserCheck className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                            <Input
                                id="proxy-user"
                                placeholder="Ingresa identificación..."
                                className="pl-9 bg-[#0A0A0A] border-white/10 text-white focus:border-indigo-500 transition-colors"
                                value={proxiedUsername}
                                onChange={(e) => setProxiedUsername(e.target.value)}
                                disabled={loading}
                            />
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-3">
                <p className="text-sm text-gray-400">
                    {isOperator ? "Selecciona la opción indicada por el propietario:" : "Selecciona tu respuesta:"}
                </p>

                <div className="flex flex-col gap-3">
                    {vote.vote_options?.sort((a: any, b: any) => a.order_index - b.order_index).map((option: any) => (
                        <div
                            key={option.id}
                            onClick={() => !loading && setSelectedOption(option.id)}
                            className={`flex items-center space-x-3 p-4 rounded-lg border transition-all cursor-pointer ${selectedOption === option.id
                                ? "bg-indigo-600/20 border-indigo-500 ring-1 ring-indigo-500"
                                : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                                }`}>
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${selectedOption === option.id
                                ? "border-indigo-500 bg-indigo-500"
                                : "border-gray-500"
                                }`}>
                                {selectedOption === option.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                            <span className={`flex-1 text-sm font-medium ${selectedOption === option.id ? "text-indigo-300" : "text-gray-300"
                                }`}>
                                {option.label}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <Button
                className={`w-full font-medium transition-all duration-200 ${confirming
                    ? "bg-amber-600 hover:bg-amber-700 animate-pulse text-white scale-105"
                    : isOperator
                        ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                        : "bg-emerald-600 hover:bg-emerald-700 text-white"
                    }`}
                disabled={!selectedOption || loading || (isOperator && !proxiedUsername.trim())}
                onClick={handleVote}
            >
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> :
                    confirming ? <ShieldCheck className="w-4 h-4 mr-2" /> : <Send className="w-4 h-4 mr-2" />}

                {confirming
                    ? `¿Estás seguro? ${isOperator ? "Registrar Voto" : "Enviar Voto"}`
                    : isOperator
                        ? "Registrar Voto de Tercero"
                        : "Confirmar y Enviar Voto"}
            </Button>

            {successMessage && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-2 text-emerald-400 animate-in fade-in slide-in-from-bottom-2">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm font-medium">{successMessage}</span>
                </div>
            )}

            {errorMessage && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 animate-in fade-in slide-in-from-bottom-2">
                    <ShieldCheck className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm font-medium">{errorMessage}</span>
                </div>
            )}
        </div>
    );
}
