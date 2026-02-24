import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Building2, ChevronRight, Users } from 'lucide-react';
import CreateAssemblyModal from './assemblies/CreateAssemblyModal';

export const dynamic = 'force-dynamic';

export default async function AssembliesPage() {
    const supabase = await createClient();
    const { data: assemblies } = await supabase
        .from('assemblies')
        .select('id, name, nit, address, total_units, created_at')
        .order('created_at', { ascending: false });

    return (
        <div className="p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Asambleas</h1>
                    <p className="text-gray-400 text-sm mt-1">Gestiona las copropiedades registradas en la plataforma</p>
                </div>
                <CreateAssemblyModal />
            </div>

            {assemblies && assemblies.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {assemblies.map((a) => (
                        <Link
                            key={a.id}
                            href={`/superadmin/assemblies/${a.id}`}
                            className="block bg-[#111] border border-white/5 rounded-xl p-5 hover:border-violet-500/30 hover:bg-[#141414] transition-all group"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-10 h-10 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                                    <Building2 className="w-5 h-5 text-violet-400" />
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-violet-400 transition-colors" />
                            </div>
                            <h3 className="text-white font-semibold text-base mb-1">{a.name}</h3>
                            {a.nit && <p className="text-gray-500 text-xs mb-3">NIT: {a.nit}</p>}
                            {a.address && <p className="text-gray-500 text-xs mb-3 truncate">{a.address}</p>}
                            <div className="flex items-center gap-3 pt-3 border-t border-white/5">
                                <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                                    <Users className="w-3.5 h-3.5" />
                                    <span>{a.total_units} unidades</span>
                                </div>
                                <span className="text-gray-700">·</span>
                                <span className="text-gray-500 text-xs">
                                    {new Date(a.created_at).toLocaleDateString('es-CO')}
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="rounded-xl border border-dashed border-white/10 p-16 text-center">
                    <Building2 className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400 font-medium">No hay asambleas registradas</p>
                    <p className="text-gray-600 text-sm mt-1">Crea la primera para comenzar a configurar la plataforma</p>
                </div>
            )}
        </div>
    );
}
