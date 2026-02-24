import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft, Building2, Users, UserCog, Home,
    CheckSquare, Activity, BarChart3, FileBarChart
} from 'lucide-react';
import BulkUploadUnits from '../BulkUploadUnits';
import CreateUserForm from '../../CreateUserForm';
import EditUserForm from '../../EditUserForm';
import DeleteUserButton from '../../DeleteUserButton';
import NotificationsTab from './NotificationsTab';

import EditAssemblyModal from './EditAssemblyModal';
import DeleteAssemblyButton from './DeleteAssemblyButton';

export const dynamic = 'force-dynamic';

function getServiceClient() {
    const { createClient: sc } = require('@supabase/supabase-js');
    return sc(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
    );
}

export default async function AssemblyDashboard({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const admin = getServiceClient();

    // Assembly
    const { data: assembly } = await admin
        .from('assemblies')
        .select('*')
        .eq('id', id)
        .single();

    if (!assembly) notFound();

    // Parallel fetches
    const [
        { data: units },
        { data: admins },
        { data: operators },
        { data: attendanceLogs },
        { data: votes },
    ] = await Promise.all([
        admin.from('units').select('id, number, coefficient, owner_name, owner_document_number, owner_phone, representative:users!units_representative_id_fkey(full_name)').eq('assembly_id', id).order('number'),
        admin.from('users').select('id, full_name, email, username').eq('assembly_id', id).eq('role', 'ADMIN'),
        admin.from('users').select('id, full_name, email, username').eq('assembly_id', id).eq('role', 'OPERATOR'),
        admin.from('attendance_logs').select('unit_id, units(number, coefficient, assembly_id)').not('units', 'is', null),
        admin.from('votes').select('id, title, status, created_at, vote_options(id, text, votes_count), ballots(user_id)').order('created_at', { ascending: false }).limit(10),
    ]);

    // Filter attendance to this assembly only
    const assemblyAttendance = (attendanceLogs || []).filter(
        (log: any) => log.units?.assembly_id === id
    );

    const totalUnits = units?.length ?? 0;
    const presentUnits = assemblyAttendance.length;
    const totalCoefficient = (units || []).reduce((s: number, u: any) => s + Number(u.coefficient || 0), 0);
    const presentCoefficient = assemblyAttendance.reduce((s: number, log: any) => s + Number(log.units?.coefficient || 0), 0);
    const quorumPct = totalCoefficient > 0 ? ((presentCoefficient / totalCoefficient) * 100).toFixed(1) : '0.0';
    const hasQuorum = Number(quorumPct) >= 50;

    const openVotes = (votes || []).filter((v: any) => v.status === 'OPEN').length;
    const closedVotes = (votes || []).filter((v: any) => v.status === 'CLOSED').length;

    return (
        <div className="p-8 space-y-8">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-500">
                <Link href="/superadmin" className="hover:text-violet-400 flex items-center gap-1 transition-colors">
                    <ArrowLeft className="w-3.5 h-3.5" /> Asambleas
                </Link>
                <span>/</span>
                <span className="text-white">{assembly.name}</span>
            </div>

            {/* Header */}
            <div className="flex items-start justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-violet-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white mb-1">{assembly.name}</h1>
                        <div className="flex items-center gap-3 text-sm text-gray-400">
                            {assembly.nit && <span>NIT: {assembly.nit}</span>}
                            {assembly.address && <><span className="text-gray-700">·</span><span>{assembly.address}</span></>}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <EditAssemblyModal assembly={assembly} />
                    <DeleteAssemblyButton assemblyId={id} assemblyName={assembly.name || ''} />
                    <Link href={`/dashboard/reports?assembly=${id}`} className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-gray-300 hover:text-white transition-all">
                        <FileBarChart className="w-4 h-4" /> Ver Reportes
                    </Link>
                </div>
            </div>

            {/* KPI row */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                {[
                    { label: 'Unidades', value: totalUnits, icon: Home, color: 'violet' },
                    { label: 'Presentes', value: presentUnits, icon: Activity, color: 'emerald' },
                    { label: 'Quórum', value: `${quorumPct}%`, icon: BarChart3, color: hasQuorum ? 'emerald' : 'amber' },
                    { label: 'Votaciones abiertas', value: openVotes, icon: CheckSquare, color: 'indigo' },
                    { label: 'Votaciones cerradas', value: closedVotes, icon: CheckSquare, color: 'slate' },
                ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className={`rounded-xl border p-4 ${color === 'violet' ? 'bg-violet-500/10 border-violet-500/20 text-violet-400' :
                        color === 'emerald' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                            color === 'amber' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                                color === 'indigo' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' :
                                    'bg-white/5 border-white/10 text-gray-400'
                        }`}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium uppercase tracking-wider opacity-70">{label}</span>
                            <Icon className="w-3.5 h-3.5 opacity-60" />
                        </div>
                        <div className="text-2xl font-black text-white">{value}</div>
                    </div>
                ))}
            </div>

            {/* Main grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

                {/* Attendance list */}
                <div className="bg-[#111] border border-white/5 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Activity className="w-4 h-4 text-emerald-400" />
                        <h2 className="text-white font-semibold">Asistencia ({presentUnits}/{totalUnits})</h2>
                        <div className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${hasQuorum ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                            {hasQuorum ? '✓ Quórum' : '⚠ Sin quórum'}
                        </div>
                    </div>
                    {assemblyAttendance.length > 0 ? (
                        <div className="max-h-64 overflow-y-auto rounded-lg border border-white/5">
                            <table className="w-full text-xs">
                                <thead className="sticky top-0 bg-[#1A1A1A]">
                                    <tr>
                                        <th className="text-left px-3 py-2 text-gray-400">Unidad</th>
                                        <th className="text-right px-3 py-2 text-gray-400">Coeficiente</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {assemblyAttendance.map((log: any, i: number) => (
                                        <tr key={i} className="border-t border-white/5">
                                            <td className="px-3 py-2 text-white font-mono">{log.units.number}</td>
                                            <td className="px-3 py-2 text-gray-400 text-right">{Number(log.units.coefficient).toFixed(4)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-gray-500 text-sm text-center py-8">Ninguna unidad registrada aún</p>
                    )}
                </div>

                {/* Votes */}
                <div className="bg-[#111] border border-white/5 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <CheckSquare className="w-4 h-4 text-indigo-400" />
                        <h2 className="text-white font-semibold">Votaciones</h2>
                        <span className="ml-auto text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">{(votes || []).length}</span>
                    </div>
                    {votes && votes.length > 0 ? (
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {votes.map((v: any) => (
                                <div key={v.id} className="flex items-center gap-3 p-3 bg-white/2 rounded-lg border border-white/5">
                                    <div className={`w-2 h-2 rounded-full shrink-0 ${v.status === 'OPEN' ? 'bg-emerald-400' : v.status === 'CLOSED' ? 'bg-gray-500' : 'bg-amber-400'}`} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white text-xs font-medium truncate">{v.title}</p>
                                        <p className="text-gray-500 text-xs mt-0.5">
                                            {v.vote_options?.length ?? 0} opciones · {v.ballots?.length ?? 0} votos
                                        </p>
                                    </div>
                                    <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${v.status === 'OPEN' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-gray-400'}`}>
                                        {v.status === 'OPEN' ? 'Abierta' : v.status === 'CLOSED' ? 'Cerrada' : v.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500 text-sm text-center py-8">Sin votaciones registradas</p>
                    )}
                </div>
            </div>

            {/* Units + CSV upload */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="bg-[#111] border border-white/5 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Home className="w-4 h-4 text-violet-400" />
                        <h2 className="text-white font-semibold">Carga Masiva de Unidades</h2>
                    </div>
                    <BulkUploadUnits assemblyId={assembly.id} />
                </div>

                <div className="bg-[#111] border border-white/5 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Home className="w-4 h-4 text-indigo-400" />
                        <h2 className="text-white font-semibold">Unidades</h2>
                        <div className="ml-auto flex items-center gap-2">
                            <span className="text-xs text-gray-400 bg-white/5 px-2 py-0.5 rounded-full" title="Suma total de coeficientes">
                                Coef: {totalCoefficient.toFixed(4)}
                            </span>
                            <span className="text-xs text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full" title="Total de unidades">
                                {totalUnits}
                            </span>
                        </div>
                    </div>
                    {(units && units.length > 0) ? (
                        <div className="max-h-72 overflow-y-auto rounded-lg border border-white/5">
                            <table className="w-full text-xs">
                                <thead className="sticky top-0 bg-[#1A1A1A]">
                                    <tr>
                                        <th className="text-left px-3 py-2 text-gray-400">Unidad</th>
                                        <th className="text-left px-3 py-2 text-gray-400">Propietario / Contacto</th>
                                        <th className="text-left px-3 py-2 text-gray-400">Representante Asignado</th>
                                        <th className="text-right px-3 py-2 text-gray-400">Coef.</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(units || []).map((u: any) => (
                                        <tr key={u.id} className="border-t border-white/5 hover:bg-white/2">
                                            <td className="px-3 py-2 text-white font-mono">{u.number}</td>
                                            <td className="px-3 py-2 overflow-hidden">
                                                <div className="text-gray-300 font-medium truncate" title={u.owner_name}>{u.owner_name || '—'}</div>
                                                <div className="text-gray-500 text-[10px] mt-0.5 space-x-2">
                                                    {u.owner_document_number && <span>CC: {u.owner_document_number}</span>}
                                                    {u.owner_phone && <span>Tel: {u.owner_phone}</span>}
                                                </div>
                                            </td>
                                            <td className="px-3 py-2">
                                                {u.representative ? (
                                                    <div className="text-violet-400 text-xs truncate" title={u.representative.full_name}>
                                                        {u.representative.full_name}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-600 text-xs italic">No asignado</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-2 text-gray-400 text-right">{Number(u.coefficient).toFixed(4)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-gray-500 text-sm text-center py-8">Sin unidades. Usa la carga masiva.</p>
                    )}
                </div>
            </div>

            {/* Admins + Operators */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Admins */}
                <div className="bg-[#111] border border-white/5 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-indigo-400" />
                            <h2 className="text-white font-semibold">Administradores</h2>
                        </div>
                        <CreateUserForm role="ADMIN" defaultAssemblyId={assembly.id} />
                    </div>
                    {admins && admins.length > 0 ? (
                        <ul className="space-y-2">
                            {admins.map((a: any) => (
                                <li key={a.id} className="flex items-center gap-3 p-2.5 bg-white/2 rounded-lg border border-white/5">
                                    <div className="w-7 h-7 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-xs font-bold">
                                        {a.full_name?.[0] || '?'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white text-xs font-semibold">{a.full_name}</p>
                                        <p className="text-gray-500 text-[10px] mt-0.5">{a.email}</p>
                                        {a.username && <p className="text-gray-400 text-[10px] mt-0.5">Usuario: {a.username}</p>}
                                    </div>
                                    <div className="flex items-center justify-end gap-1">
                                        <EditUserForm user={a} role="ADMIN" />
                                        <DeleteUserButton userId={a.id} name={a.full_name} />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-gray-500 text-sm text-center py-6">Sin administradores asignados</p>
                    )}
                </div>

                {/* Operators */}
                <div className="bg-[#111] border border-white/5 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <UserCog className="w-4 h-4 text-blue-400" />
                            <h2 className="text-white font-semibold">Operadores</h2>
                        </div>
                        <CreateUserForm role="OPERATOR" defaultAssemblyId={assembly.id} />
                    </div>
                    {operators && operators.length > 0 ? (
                        <ul className="space-y-2">
                            {operators.map((o: any) => (
                                <li key={o.id} className="flex items-center gap-3 p-2.5 bg-white/2 rounded-lg border border-white/5">
                                    <div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-bold">
                                        {o.full_name?.[0] || '?'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white text-xs font-semibold">{o.full_name}</p>
                                        <p className="text-gray-500 text-[10px] mt-0.5">{o.email}</p>
                                        {o.username && <p className="text-gray-400 text-[10px] mt-0.5">Usuario: {o.username}</p>}
                                    </div>
                                    <div className="flex items-center justify-end gap-1">
                                        <EditUserForm user={o} role="OPERATOR" />
                                        <DeleteUserButton userId={o.id} name={o.full_name} />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-gray-500 text-sm text-center py-6">Sin operadores asignados</p>
                    )}
                </div>
            </div>

            {/* Notifications Module */}
            <NotificationsTab assemblyId={assembly.id} />
        </div>
    );
}
