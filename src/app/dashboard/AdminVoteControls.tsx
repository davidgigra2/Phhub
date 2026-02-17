"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { updateVoteStatus, deleteVote } from "./admin-actions";
import { Play, Pause, Square, Trash2, Loader2, Edit } from "lucide-react";
import { useRouter } from "next/navigation";

interface AdminVoteControlsProps {
    voteId: string;
    status: string;
}

export default function AdminVoteControls({ voteId, status }: AdminVoteControlsProps) {
    const [loading, setLoading] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(false);

    const router = useRouter();

    const handleAction = async (action: () => Promise<void>) => {
        setLoading(true);
        try {
            await action();
            router.refresh();
        } catch (error) {
            console.error("Action failed:", error);
            alert("Error al ejecutar acción");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <Loader2 className="w-4 h-4 animate-spin text-gray-500" />;
    }

    return (
        <div className="flex gap-2 mt-4 pt-4 border-t border-white/5">
            {status === 'DRAFT' && (
                <Button
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    onClick={() => handleAction(() => updateVoteStatus(voteId, 'OPEN'))}
                >
                    <Play className="w-4 h-4 mr-2" /> Lanzar
                </Button>
            )}

            {status === 'OPEN' && (
                <>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-500 border border-yellow-600/20"
                        onClick={() => handleAction(() => updateVoteStatus(voteId, 'PAUSED'))}
                    >
                        <Pause className="w-4 h-4 mr-2" /> Pausar
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="bg-red-600/20 hover:bg-red-600/30 text-red-500 border border-red-600/20"
                        onClick={() => handleAction(() => updateVoteStatus(voteId, 'CLOSED'))}
                    >
                        <Square className="w-4 h-4 mr-2" /> Terminar
                    </Button>
                </>
            )}

            {status === 'PAUSED' && (
                <>
                    <Button
                        size="sm"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                        onClick={() => handleAction(() => updateVoteStatus(voteId, 'OPEN'))}
                    >
                        <Play className="w-4 h-4 mr-2" /> Reanudar
                    </Button>
                    {/* Editar logic would go here ideally, perhaps redirecting to an edit page */}
                    <Button
                        size="sm"
                        variant="outline"
                        className="border-white/10 hover:bg-white/5"
                        onClick={() => alert("Función de edición pendiente de implementación")}
                    >
                        <Edit className="w-4 h-4 mr-2" /> Editar
                    </Button>
                </>
            )}

            {status === 'CLOSED' && (
                <div className="flex w-full justify-between items-center">
                    <span className="text-xs text-red-500 font-mono">CERRADA</span>
                    <Button
                        size={deleteConfirm ? "sm" : "icon"}
                        variant={deleteConfirm ? "destructive" : "ghost"}
                        className={deleteConfirm ? "bg-red-600 hover:bg-red-700 text-white" : "text-gray-500 hover:text-red-500"}
                        onClick={() => {
                            if (deleteConfirm) {
                                handleAction(() => deleteVote(voteId));
                            } else {
                                setDeleteConfirm(true);
                                setTimeout(() => setDeleteConfirm(false), 3000);
                            }
                        }}
                    >
                        {deleteConfirm ? <span className="text-xs font-bold px-2">¿Borrar?</span> : <Trash2 className="w-4 h-4" />}
                    </Button>
                </div>
            )}

            {status !== 'CLOSED' && (
                <Button
                    size={deleteConfirm ? "sm" : "icon"}
                    variant={deleteConfirm ? "destructive" : "ghost"}
                    className={`ml-auto ${deleteConfirm ? "bg-red-600 hover:bg-red-700 text-white" : "text-gray-500 hover:text-red-500"}`}
                    onClick={() => {
                        if (deleteConfirm) {
                            handleAction(() => deleteVote(voteId));
                        } else {
                            setDeleteConfirm(true);
                            setTimeout(() => setDeleteConfirm(false), 3000);
                        }
                    }}
                >
                    {deleteConfirm ? <span className="text-xs font-bold px-2">¿Borrar?</span> : <Trash2 className="w-4 h-4" />}
                </Button>
            )}
        </div>
    );
}
