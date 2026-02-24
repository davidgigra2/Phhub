'use client';

import { useActionState, useState, useRef } from 'react';
import { createAssembly } from './actions';
import { Building2, Plus, X, Loader2 } from 'lucide-react';

export default function CreateAssemblyModal() {
    const [open, setOpen] = useState(false);
    const [state, action, pending] = useActionState(async (prev: any, fd: FormData) => {
        const res = await createAssembly(prev, fd);
        if (res.success) setOpen(false);
        return res;
    }, null);

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
                <Plus className="w-4 h-4" />
                Nueva Asamblea
            </button>

            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                    <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-md mx-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                            <div className="flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-violet-400" />
                                <h2 className="text-white font-semibold">Nueva Asamblea</h2>
                            </div>
                            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form action={action} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm text-gray-300 mb-1.5">Nombre *</label>
                                <input
                                    name="name"
                                    required
                                    placeholder="Ej: Torres del Parque"
                                    className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-300 mb-1.5">NIT</label>
                                <input
                                    name="nit"
                                    placeholder="900.123.456-7"
                                    className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-300 mb-1.5">Dirección</label>
                                <input
                                    name="address"
                                    placeholder="Calle 123 #45-67"
                                    className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors"
                                />
                            </div>

                            {state?.error && (
                                <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                                    {state.error}
                                </p>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setOpen(false)}
                                    className="flex-1 px-4 py-2.5 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/20 text-sm transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={pending}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                                >
                                    {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                    {pending ? 'Creando...' : 'Crear Asamblea'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
