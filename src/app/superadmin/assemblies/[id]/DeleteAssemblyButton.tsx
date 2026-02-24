'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { deleteAssembly } from '../actions';

export default function DeleteAssemblyButton({ assemblyId, assemblyName }: { assemblyId: string, assemblyName: string }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleDelete = async () => {
        setLoading(true);
        try {
            const res = await deleteAssembly(assemblyId);
            if (res.error) {
                alert(`Error al eliminar: ${res.error}`);
                setLoading(false);
            } else {
                // Return to superadmin dashboard on success
                router.push('/superadmin');
            }
        } catch (error: any) {
            alert(`Error inesperado: ${error.message}`);
            setLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 rounded-lg text-sm font-medium transition-all"
            >
                <Trash2 className="w-3.5 h-3.5" />
                Eliminar Asamblea
            </button>

            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                    <div className="bg-[#141414] border border-red-500/20 rounded-2xl w-full max-w-md mx-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 text-center space-y-4">
                            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-2 relative">
                                <div className="absolute inset-0 bg-red-500/20 animate-ping rounded-full" />
                                <AlertTriangle className="w-8 h-8 text-red-500 relative z-10" />
                            </div>

                            <h2 className="text-xl font-bold text-white">¿Eliminar {assemblyName}?</h2>

                            <div className="text-gray-400 text-sm space-y-2">
                                <p>Esta acción es <strong>definitiva e irreversible</strong>.</p>
                                <p className="text-red-400 font-medium">Se eliminarán permanentemente:</p>
                                <ul className="text-left list-disc pl-8 space-y-1 text-xs">
                                    <li>Todas las unidades registradas.</li>
                                    <li>Todos los usuarios (admins, operadores, asambleístas).</li>
                                    <li>Todas las preguntas, opciones y votos registrados.</li>
                                    <li>El historial completo de quorum y asistencia.</li>
                                    <li>Todos los poderes digitales otorgados.</li>
                                </ul>
                            </div>
                        </div>

                        <div className="flex gap-3 p-6 pt-0">
                            <button
                                onClick={() => setOpen(false)}
                                disabled={loading}
                                className="flex-1 px-4 py-2.5 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/20 text-sm transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={loading}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-red-500/20"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                {loading ? 'Eliminando...' : 'Sí, Eliminar Todo'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
