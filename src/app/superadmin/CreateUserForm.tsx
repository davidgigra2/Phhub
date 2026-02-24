'use client';

import { useActionState, useEffect, useState } from 'react';
import { createManagedUser, getAllAssemblies } from './user-actions';
import { Plus, X, Loader2, UserPlus } from 'lucide-react';

interface Props {
    role: 'ADMIN' | 'OPERATOR';
    defaultAssemblyId?: string;
}

export default function CreateUserForm({ role, defaultAssemblyId }: Props) {
    const [open, setOpen] = useState(false);
    const [assemblies, setAssemblies] = useState<{ id: string; name: string }[]>([]);

    useEffect(() => {
        getAllAssemblies().then(setAssemblies);
    }, []);

    const [state, action, pending] = useActionState(async (prev: any, fd: FormData) => {
        const res = await createManagedUser(prev, fd);
        if (res.success) setOpen(false);
        return res;
    }, null);

    const label = role === 'ADMIN' ? 'Administrador' : 'Operador';
    const color = role === 'ADMIN' ? 'indigo' : 'blue';

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors
                    ${color === 'indigo' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
                <Plus className="w-4 h-4" />
                Nuevo {label}
            </button>

            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                    <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-md mx-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                            <div className="flex items-center gap-2">
                                <UserPlus className={`w-5 h-5 ${color === 'indigo' ? 'text-indigo-400' : 'text-blue-400'}`} />
                                <h2 className="text-white font-semibold">Nuevo {label}</h2>
                            </div>
                            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form action={action} className="p-6 space-y-4">
                            <input type="hidden" name="role" value={role} />

                            <div>
                                <label className="block text-sm text-gray-300 mb-1.5">Nombre completo *</label>
                                <input
                                    name="fullName" required
                                    placeholder="Ej: Carlos Ramírez"
                                    className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-gray-300 mb-1.5">Email *</label>
                                <input
                                    name="email" type="email" required
                                    placeholder="correo@ejemplo.com"
                                    className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-gray-300 mb-1.5">Usuario (username) *</label>
                                <input
                                    name="username"
                                    required
                                    placeholder="Ej: carlos.admin"
                                    className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-gray-300 mb-1.5">Contraseña *</label>
                                <input
                                    name="password" type="password" required minLength={6}
                                    placeholder="Mínimo 6 caracteres"
                                    className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-gray-300 mb-1.5">Asamblea *</label>
                                <select
                                    name="assemblyId" required
                                    defaultValue={defaultAssemblyId || ''}
                                    className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500 transition-colors"
                                >
                                    <option value="">Seleccionar asamblea...</option>
                                    {assemblies.map(a => (
                                        <option key={a.id} value={a.id}>{a.name}</option>
                                    ))}
                                </select>
                            </div>

                            {state?.error && (
                                <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                                    {state.error}
                                </p>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button" onClick={() => setOpen(false)}
                                    className="flex-1 px-4 py-2.5 rounded-lg border border-white/10 text-gray-400 hover:text-white text-sm transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit" disabled={pending}
                                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50
                                        ${color === 'indigo' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                                >
                                    {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                    {pending ? 'Creando...' : `Crear ${label}`}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
