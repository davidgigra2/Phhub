"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Play, Plus, Trash2, Loader2, Save, Square } from "lucide-react";
import { updateVoteStatus, updateVoteDetails, deleteVote } from "./admin-actions";

interface EditVoteFormProps {
    vote: any;
    onActionComplete?: () => void;
}

export default function EditVoteForm({ vote, onActionComplete }: EditVoteFormProps) {
    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState(vote.title);
    const [description, setDescription] = useState(vote.description || "");
    const [options, setOptions] = useState(vote.vote_options?.sort((a: any, b: any) => a.order_index - b.order_index) || []);
    const supabase = createClient();

    const addOption = () => {
        setOptions([...options, { label: "", isNew: true, order_index: options.length }]);
    };

    const removeOption = async (index: number) => {
        const option = options[index];

        // Optimistic UI update
        const previousOptions = [...options];
        setOptions(options.filter((_: any, i: number) => i !== index));

        // If it's a new option (not saved), we are done
        if (option.isNew) return;

        // If it's existing, delete from DB
        try {
            const { error } = await supabase.from('vote_options').delete().eq('id', option.id);
            if (error) {
                // Revert on error
                setOptions(previousOptions);
                alert("Error al eliminar opción: " + error.message);
            }
        } catch (e) {
            console.error(e);
            setOptions(previousOptions);
        }
    };

    // ...



    const updateOptionLabel = (index: number, value: string) => {
        const newOptions = [...options];
        newOptions[index].label = value;
        setOptions(newOptions);
    };

    const handleSaveAndResume = async () => {
        setLoading(true);

        // Validation: Check for empty options
        if (options.some((opt: any) => !opt.label.trim())) {
            alert("Todas las opciones deben tener texto. Por favor, completa o elimina las opciones vacías.");
            setLoading(false);
            return;
        }

        try {
            // 1. Update Vote title/description via server action (bypasses RLS)
            await updateVoteDetails(vote.id, title, description);

            // 2. Upsert Options
            for (const [index, opt] of options.entries()) {
                const { error: optError } = await supabase
                    .from("vote_options")
                    .upsert({
                        id: opt.isNew ? undefined : opt.id,
                        vote_id: vote.id,
                        label: opt.label,
                        order_index: index
                    });
                if (optError) throw optError;
            }

            // 3. Set status back to OPEN via server action (bypasses RLS)
            await updateVoteStatus(vote.id, 'OPEN');

            onActionComplete?.();

        } catch (error) {
            console.error("Error updating vote:", error);
            alert("Error al actualizar: " + (error as any).message);
        } finally {
            setLoading(false);
        }
    };

    const [deleteConfirm, setDeleteConfirm] = useState(false);
    const [terminateConfirm, setTerminateConfirm] = useState(false);

    const handleDeleteVote = async () => {
        if (!deleteConfirm) {
            setDeleteConfirm(true);
            setTimeout(() => setDeleteConfirm(false), 3000); // Reset after 3s
            return;
        }

        try {
            await deleteVote(vote.id);
        } catch (error: any) {
            alert("Error al eliminar votación: " + error.message);
        }
    };

    const handleTerminate = async () => {
        if (!terminateConfirm) {
            setTerminateConfirm(true);
            setTimeout(() => setTerminateConfirm(false), 3000);
            return;
        }

        setLoading(true);
        console.log("Terminating vote:", vote.id);
        try {
            await updateVoteStatus(vote.id, 'CLOSED');
            onActionComplete?.();
        } catch (error: any) {
            console.error("Error terminating vote:", error);
            alert("Error al terminar votación: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleInputClick = (e: React.MouseEvent<HTMLInputElement>) => {
        if (e.detail >= 2) {
            e.preventDefault();
            const input = e.currentTarget;
            input.select();
        }
    };

    return (
        <Card className="bg-[#121212] border-yellow-500/20 animate-in fade-in duration-300">
            <CardHeader className="border-b border-white/5 pb-4 flex flex-row items-center justify-between">
                <CardTitle className="text-xl font-bold text-yellow-500 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                    Edición (Pausada)
                </CardTitle>
                <Button
                    type="button"
                    variant={deleteConfirm ? "destructive" : "ghost"}
                    size={deleteConfirm ? "sm" : "icon"}
                    onClick={handleDeleteVote}
                    disabled={loading}
                    className={deleteConfirm ? "bg-red-500 hover:bg-red-600 text-white" : "text-red-400 hover:text-red-300 hover:bg-red-500/10"}
                    title="Eliminar Votación"
                >
                    {deleteConfirm ? <span className="text-xs font-bold px-2">¿Confirmar?</span> : <Trash2 className="w-5 h-5" />}
                </Button>
            </CardHeader>
            <CardContent className="pt-6">
                <div className="space-y-6">
                    <div className="space-y-2">
                        <Label className="text-gray-200 font-medium text-base">Pregunta / Título</Label>
                        <Input
                            className="bg-[#1A1A1A] border-white/20 text-white"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            disabled={loading}
                            onClick={handleInputClick}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-gray-200 font-medium text-base">Descripción</Label>
                        <Textarea
                            className="bg-[#1A1A1A] border-white/20 text-white min-h-[100px]"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            disabled={loading}
                        />
                    </div>

                    <div className="space-y-4">
                        <Label className="text-gray-200 font-medium text-base">Opciones</Label>
                        <div className="space-y-3">
                            {options.map((opt: any, index: number) => (
                                <div key={index} className="flex gap-2 items-center">
                                    <span className="text-sm text-gray-400 w-6 font-mono">{index + 1}.</span>
                                    <Input
                                        className="bg-[#1A1A1A] border-white/20 text-white flex-1"
                                        value={opt.label}
                                        onChange={(e) => updateOptionLabel(index, e.target.value)}
                                        disabled={loading}
                                        onClick={handleInputClick}
                                    />
                                    {options.length > 2 && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="text-red-400 hover:text-white hover:bg-red-500/20"
                                            onClick={() => removeOption(index)}
                                            disabled={loading}
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
                            disabled={loading}
                            className="w-full mt-2 bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700 shadow-sm"
                        >
                            <Plus className="w-4 h-4 mr-2" /> Agregar Opción
                        </Button>
                    </div>

                    <div className="pt-6 flex justify-between items-center border-t border-white/5 mt-6">
                        <Button
                            type="button"
                            variant={terminateConfirm ? "destructive" : "secondary"}
                            size="sm"
                            className={terminateConfirm ? "bg-red-600 hover:bg-red-700 text-white" : "bg-red-900/20 text-red-400 hover:bg-red-900/40 border-red-900/20"}
                            onClick={handleTerminate}
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Square className="w-4 h-4 mr-2" />}
                            {terminateConfirm ? "¿Confirmar Finalización?" : "Terminar"}
                        </Button>

                        <Button
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={handleSaveAndResume}
                            disabled={loading}
                        >
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Reanudar Votación
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card >
    );
}

