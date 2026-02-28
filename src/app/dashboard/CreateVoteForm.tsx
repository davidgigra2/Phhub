"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Loader2, X, PlusCircle } from "lucide-react";
export default function CreateVoteForm({ assemblyId, onVoteCreated }: { assemblyId: string; onVoteCreated?: () => void }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [options, setOptions] = useState([{ label: "A favor" }, { label: "En contra" }]);
    const supabase = createClient();

    const addOption = () => {
        setOptions([...options, { label: "" }]);
    };

    const removeOption = (index: number) => {
        setOptions(options.filter((_, i) => i !== index));
    };

    const updateOption = (index: number, value: string) => {
        const newOptions = [...options];
        newOptions[index].label = value;
        setOptions(newOptions);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Validation: Check for empty options
            if (options.some(opt => !opt.label.trim())) {
                alert("Todas las opciones deben tener texto. Por favor, completa o elimina las opciones vacías.");
                setLoading(false);
                return;
            }

            // 1. Create Vote (DRAFT by default initially in recent changes logic, but let's stick to user intent. 
            // The previous logic opened it immediately. I'll status='OPEN' to keep behavior consistent unless requested otherwise,
            // strict reading of previous user request implies "Launch" button launchs it.
            const { data: vote, error: voteError } = await supabase
                .from("votes")
                .insert({
                    title,
                    description,
                    status: 'OPEN',
                    type: 'SINGLE',
                    assembly_id: assemblyId
                })
                .select()
                .single();

            if (voteError) throw voteError;

            // 2. Create Options
            const optionsToInsert = options.map((opt, index) => ({
                vote_id: vote.id,
                label: opt.label,
                order_index: index
            }));

            const { error: optionsError } = await supabase
                .from("vote_options")
                .insert(optionsToInsert);

            if (optionsError) throw optionsError;

            // Reset and close
            setTitle("");
            setDescription("");
            setOptions([{ label: "A favor" }, { label: "En contra" }]);
            setIsExpanded(false);
            onVoteCreated?.();

        } catch (error) {
            console.error("Error creating vote:", error);
            alert("Error al crear la votación: " + (error as any).message);
        } finally {
            setLoading(false);
        }
    };

    if (!isExpanded) {
        return (
            <Card
                className="bg-[#121212] border-white/5 border-dashed cursor-pointer hover:bg-white/5 transition-colors flex flex-col items-center justify-center min-h-[200px]"
                onClick={() => setIsExpanded(true)}
            >
                <div className="flex flex-col items-center gap-3 text-gray-400">
                    <div className="p-3 rounded-full bg-white/5">
                        <PlusCircle className="w-8 h-8 text-indigo-500" />
                    </div>
                    <span className="font-medium text-lg">Nueva Votación</span>
                </div>
            </Card>
        );
    }

    return (
        <Card className="bg-[#121212] border-white/5 animate-in fade-in zoom-in-95 duration-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xl font-bold text-white">Nueva Votación</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setIsExpanded(false)} className="text-gray-400 hover:text-white">
                    <X className="w-4 h-4" />
                </Button>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="title" className="text-gray-200 font-medium text-base">Pregunta / Título</Label>
                        <Input
                            id="title"
                            placeholder="Ej: Aprobación de Presupuesto 2025"
                            className="bg-[#1A1A1A] border-white/20 text-white placeholder:text-gray-500 focus:border-indigo-500 transition-colors"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            onDoubleClick={(e) => (e.target as HTMLInputElement).select()}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description" className="text-gray-200 font-medium text-base">Descripción (Opcional)</Label>
                        <Textarea
                            id="description"
                            placeholder="Detalles adicionales sobre la votación..."
                            className="bg-[#1A1A1A] border-white/20 text-white placeholder:text-gray-500 min-h-[100px] focus:border-indigo-500 transition-colors"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    <div className="space-y-4">
                        <Label className="text-gray-200 font-medium text-base">Opciones de Respuesta</Label>
                        <div className="space-y-3">
                            {options.map((opt, index) => (
                                <div key={index} className="flex gap-2 items-center">
                                    <span className="text-sm text-gray-400 w-6 font-mono font-medium">{index + 1}.</span>
                                    <Input
                                        placeholder={`Opción ${index + 1}`}
                                        className="bg-[#1A1A1A] border-white/20 text-white placeholder:text-gray-500 flex-1 focus:border-indigo-500 transition-colors"
                                        value={opt.label}
                                        onChange={(e) => updateOption(index, e.target.value)}
                                        onDoubleClick={(e) => e.currentTarget.select()}
                                        required
                                    />
                                    {options.length > 2 && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                            onClick={() => removeOption(index)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={addOption}
                            className="w-full mt-2 bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700 shadow-sm"
                        >
                            <Plus className="w-4 h-4 mr-2" /> Agregar Opción
                        </Button>
                    </div>

                    <div className="pt-4 flex justify-end gap-3 border-t border-white/5 mt-6">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setIsExpanded(false)}
                            className="text-gray-300 hover:text-white hover:bg-white/10"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6"
                            disabled={loading}
                        >
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {loading ? "Creando..." : "Lanzar Votación"}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card >
    );
}
