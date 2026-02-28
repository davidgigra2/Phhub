"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from "@/lib/supabase/client";
import { getAssemblyQuorum } from './attendance-actions';
import { getVotesForDashboard } from './admin-actions';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, FileBarChart } from 'lucide-react';
import Link from 'next/link';
import QuorumCard from './QuorumCard';
import UserQRCard from './UserQRCard';
import PowerManagement from './PowerManagement';
import CreateVoteForm from './CreateVoteForm';
import EditVoteForm from './EditVoteForm';
import AdminVoteControls from './AdminVoteControls';
import VoteResults from './VoteResults';
import VoteInterface from './VoteInterface';
import OperatorAttendance from './OperatorAttendance';
import { cn } from "@/lib/utils";

interface DashboardClientProps {
    user: any;
    userProfile: any;
    representedUnits: any[];
    givenProxy: any;
    powerStats: any;
    votes: any[];
    totalCoefficient: number;
    displayUnit: string;
    isAdmin: boolean;
    isOperator: boolean;
    asistenciaRegistrada: boolean; // NEW: Passed from page.tsx (Backend)
}

export default function DashboardClient({
    user,
    userProfile,
    representedUnits,
    givenProxy,
    powerStats,
    votes,
    totalCoefficient,
    displayUnit,
    isAdmin,
    isOperator,
    asistenciaRegistrada // NEW: prop instead of state
}: DashboardClientProps) {

    const supabase = useRef(createClient()).current;

    const isUser = userProfile?.role === 'USER';
    const userRoleLabel = isUser ? 'Asambleísta' : (isAdmin ? 'Administrador' : (isOperator ? 'Operador' : 'Usuario'));

    const [isAttendanceRegistered, setIsAttendanceRegistered] = useState(asistenciaRegistrada);
    const [localVotes, setLocalVotes] = useState(votes);
    const [quorum, setQuorum] = useState(0);
    const [loadingQuorum, setLoadingQuorum] = useState(true);
    const quorumChannelRef = useRef<any>(null);
    const votesChannelRef = useRef<any>(null);
    const isAttendanceRegisteredRef = useRef(isAttendanceRegistered);
    useEffect(() => { isAttendanceRegisteredRef.current = isAttendanceRegistered; }, [isAttendanceRegistered]);

    // Quorum: fetch inicial + broadcast multiplexado sobre el mismo WebSocket
    useEffect(() => {
        if (!userProfile?.assembly_id) {
            setLoadingQuorum(false);
            return;
        }
        const assemblyId = userProfile.assembly_id;

        getAssemblyQuorum(assemblyId)
            .then((total) => { setQuorum(total); })
            .catch(() => {})
            .finally(() => { setLoadingQuorum(false); });

        const channel = supabase
            .channel(`assembly_quorum_${assemblyId}`)
            .on('broadcast', { event: 'quorum_update' }, async () => {
                const total = await getAssemblyQuorum(assemblyId);
                setQuorum(total);
            })
            .on('broadcast', { event: 'attendance_registered' }, async () => {
                if (!isUser || isAttendanceRegisteredRef.current || representedUnits.length === 0) return;
                const { data } = await supabase
                    .from('attendance_logs')
                    .select('id')
                    .in('unit_id', representedUnits.map((u: any) => u.id))
                    .limit(1);
                if (data && data.length > 0) setIsAttendanceRegistered(true);
            })
            .subscribe();

        quorumChannelRef.current = channel;

        return () => {
            supabase.removeChannel(channel);
            quorumChannelRef.current = null;
        };
    }, [userProfile?.assembly_id, supabase]);

    const handleAttendanceSuccess = useCallback(async () => {
        if (!userProfile?.assembly_id) return;
        const total = await getAssemblyQuorum(userProfile.assembly_id);
        setQuorum(total);
        quorumChannelRef.current?.send({ type: 'broadcast', event: 'quorum_update', payload: {} });
        quorumChannelRef.current?.send({ type: 'broadcast', event: 'attendance_registered', payload: {} });
    }, [userProfile?.assembly_id]);

    // Realtime: broadcast desde admin + postgres_changes como fallback
    useEffect(() => {
        if (!userProfile?.assembly_id) return;
        const assemblyId = userProfile.assembly_id;

        const refreshVotes = async () => {
            const fresh = await getVotesForDashboard(assemblyId);
            setLocalVotes(fresh);
        };

        let ch = supabase
            .channel(`assembly_votes_${assemblyId}`)
            .on('broadcast', { event: 'votes_update' }, refreshVotes);

        if (isAdmin) {
            ch = ch.on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'votes', filter: `assembly_id=eq.${assemblyId}` },
                refreshVotes
            );
        }

        const channel = ch.subscribe();

        votesChannelRef.current = channel;

        return () => {
            supabase.removeChannel(channel);
            votesChannelRef.current = null;
        };
    }, [userProfile?.assembly_id, supabase]);

    const handleUserVote = useCallback((voteId: string) => {
        setLocalVotes(prev => prev.map(v =>
            v.id !== voteId ? v : { ...v, ballots: [...(v.ballots || []), { user_id: user.id }] }
        ));
    }, [user.id]);

    const handleVoteAction = useCallback(async () => {
        if (!userProfile?.assembly_id) return;
        const fresh = await getVotesForDashboard(userProfile.assembly_id);
        setLocalVotes(fresh);
        votesChannelRef.current?.send({ type: 'broadcast', event: 'votes_update', payload: {} });
    }, [userProfile?.assembly_id]);


    return (
        <div className="min-h-screen bg-[#141414] text-white p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Panel de Control</h1>
                        <p className="text-gray-400 mt-1">
                            Bienvenido, <span className="text-indigo-400 font-medium">{userProfile?.full_name || user.email}</span>
                        </p>
                    </div>

                    <div className="flex items-center gap-3 bg-[#121212] p-1.5 rounded-xl border border-white/5 shadow-2xl">
                        <div className="px-3 md:px-4 py-1.5 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                            <span className="text-[10px] text-indigo-300 uppercase font-black tracking-widest block">Perfil</span>
                            <span className="text-xs md:text-sm font-bold text-white">{userRoleLabel}</span>
                        </div>
                        {displayUnit !== 'Sin Unidad' && (
                            <div className="px-3 md:px-4 py-1.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20 hidden sm:block">
                                <span className="text-[10px] text-emerald-300 uppercase font-black tracking-widest block">Unidad</span>
                                <span className="text-xs md:text-sm font-bold text-white">{displayUnit}</span>
                            </div>
                        )}
                        <form action="/auth/signout" method="post">
                            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-white/10 h-10 px-3 md:px-4 rounded-lg font-medium">
                                Cerrar Sesión
                            </Button>
                        </form>
                    </div>
                </div>

                {/* Content Section */}
                <div className={cn(
                    "grid gap-6 items-start",
                    isUser ? "grid-cols-1 lg:grid-cols-3" : "grid-cols-1"
                )}>
                    {/* ASAMBLEÍSTA: QR or Success Banner (LEFT COLUMN on Desktop) */}
                    {isUser && (
                        <div className="lg:col-span-1 animate-in fade-in slide-in-from-top-4 duration-500">
                            {isAttendanceRegistered ? (
                                <Card className="bg-emerald-950/20 border-2 border-emerald-500/30 overflow-hidden shadow-2xl shadow-emerald-500/10 rounded-3xl h-full flex flex-col justify-center">
                                    <CardContent className="py-8 md:py-10 flex flex-col items-center text-center gap-4">
                                        <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                                        </div>
                                        <div className="space-y-2">
                                            <h3 className="text-xl md:text-2xl font-black text-white">✅ Asistencia registrada</h3>
                                            <p className="text-emerald-50/80 text-sm md:text-base max-w-xs mx-auto leading-relaxed">
                                                ¡Bienvenido a la asamblea! Tu participación activa está confirmada.
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            ) : (
                                <UserQRCard
                                    documentNumber={userProfile?.document_number}
                                    username={userProfile?.username || user.email}
                                    unitNumber={displayUnit}
                                />
                            )}
                        </div>
                    )}

                    {/* INDICATORS SECTION (RIGHT COLUMN on Desktop for User, FULL WIDTH for others) */}
                    <div className={cn(
                        "grid gap-4 md:gap-6",
                        isUser
                            ? "lg:col-span-2 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
                            : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                    )}>
                        {isAdmin && (
                            <Link href="/dashboard/reports" className="group h-full">
                                <Card className="bg-indigo-950/20 border-indigo-500/20 hover:bg-indigo-900/30 transition-all cursor-pointer h-full shadow-lg rounded-2xl">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-indigo-400 flex items-center gap-2 text-base font-bold uppercase tracking-wider">
                                            <FileBarChart className="w-5 h-5" />
                                            Informes e Estadísticas
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-black text-white group-hover:translate-x-1 transition-transform">Ver Reportes →</div>
                                        <p className="text-sm text-gray-400 mt-2">Asistencia, Votos, Poderes</p>
                                    </CardContent>
                                </Card>
                            </Link>
                        )}

                        <Card className="bg-[#121212] border-white/5 shadow-lg rounded-2xl">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-gray-400 text-xs font-black uppercase tracking-widest">Estado de Asamblea</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl md:text-3xl font-black text-indigo-500">Activa</div>
                                <p className="text-xs md:text-sm text-gray-500 mt-1 md:mt-2">Bienvenida y verificación</p>
                            </CardContent>
                        </Card>

                        <QuorumCard quorum={quorum} loading={loadingQuorum} />

                        {/* Coefficient Card (Visible to USER if assigned) */}
                        {isUser && (
                            <Card className="bg-[#121212] border-white/5 shadow-lg rounded-2xl sm:col-span-2 xl:col-span-1">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-gray-400 text-xs font-black uppercase tracking-widest">Tu Coeficiente Total</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl md:text-3xl font-black text-white">
                                        {totalCoefficient.toFixed(4)}
                                    </div>
                                    <p className="text-xs md:text-sm text-gray-500 mt-1 md:mt-2">
                                        Poder de voto ({representedUnits.length} unidades)
                                    </p>
                                </CardContent>
                            </Card>
                        )}

                        {!isUser && !isAdmin && !isOperator && (
                            <Card className="bg-[#121212] border-white/5 shadow-lg rounded-2xl">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-gray-400 text-xs font-black uppercase tracking-widest">Unidades</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl md:text-3xl font-black text-white">0</div>
                                    <p className="text-xs md:text-sm text-gray-500 mt-1 md:mt-2">No tienes propiedades asignadas</p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>

                {/* 3. Power Management Section (CONDITIONAL FOR USER) */}
                {!isAdmin && !(isUser && isAttendanceRegistered) && (
                    <PowerManagement
                        userId={user.id}
                        userRole={userProfile?.role}
                        givenProxy={givenProxy}
                        receivedProxies={powerStats?.representedUnits || []}
                        ownWeight={powerStats?.ownWeight || 0}
                    />
                )}

                {/* 4. Operator Section */}
                {isOperator && (
                    <div className="grid grid-cols-1 gap-6">
                        <OperatorAttendance assemblyId={userProfile?.assembly_id} onAttendanceSuccess={handleAttendanceSuccess} />
                    </div>
                )}

                {/* 5. Voting Section */}
                {(!isUser || isAttendanceRegistered) && (
                    <div className="space-y-6 pt-4">
                        <div className="flex items-center gap-3">
                            <h2 className="text-xl md:text-2xl font-black tracking-tight">{isAdmin ? "Gestión de Votaciones" : "Votaciones en Curso"}</h2>
                            <div className="h-0.5 flex-1 bg-white/5" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {isAdmin && <CreateVoteForm assemblyId={userProfile?.assembly_id || ''} onVoteCreated={handleVoteAction} />}

                            {localVotes && localVotes.map((vote) => {
                                const hasVoted = vote.ballots && vote.ballots.some((b: any) => b.user_id === user.id);
                                const isDraft = vote.status === 'DRAFT';
                                const isPaused = vote.status === 'PAUSED';
                                const isClosed = vote.status === 'CLOSED';

                                if (isAdmin && isPaused) {
                                    return <EditVoteForm key={vote.id} vote={vote} onActionComplete={handleVoteAction} />;
                                }

                                return (
                                    <Card key={vote.id} className={cn(
                                        "bg-[#121212] border-white/5 shadow-2xl rounded-3xl overflow-hidden transition-all duration-300 hover:border-indigo-500/30",
                                        isClosed ? 'opacity-60 grayscale' : ''
                                    )}>
                                        <div className="h-2 w-full bg-gradient-to-r from-indigo-600 to-indigo-400" />
                                        <CardHeader className="pb-3">
                                            <div className="flex justify-between items-start gap-4">
                                                <CardTitle className="text-white text-lg md:text-xl font-bold leading-snug">{vote.title}</CardTitle>
                                                <div className="flex gap-2 shrink-0">
                                                    {isDraft && <span className="px-2 py-0.5 rounded-full text-[10px] bg-gray-500/20 text-gray-400 border border-gray-500/20 font-black tracking-wider">BORRADOR</span>}
                                                    {isPaused && <span className="px-2 py-0.5 rounded-full text-[10px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/20 font-black tracking-wider uppercase">PAUSER</span>}
                                                    {isClosed && <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-500/20 text-red-400 border border-red-500/20 font-black tracking-wider">CERRADA</span>}
                                                    {vote.status === 'OPEN' && <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 font-black tracking-wider animate-pulse">ABIERTA</span>}
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="space-y-6">
                                            <p className="text-gray-400 text-sm md:text-base leading-relaxed">{vote.description || "Sin descripción adicional."}</p>

                                            {isAdmin && <AdminVoteControls voteId={vote.id} status={vote.status} onActionComplete={handleVoteAction} />}

                                            {(isAdmin || isClosed || hasVoted) && (
                                                <VoteResults voteId={vote.id} options={vote.vote_options} />
                                            )}

                                            {!isAdmin && !isDraft && !isClosed && vote.status === 'OPEN' && (
                                                <div className="pt-4 border-t border-white/5">
                                                    {hasVoted ? (
                                                        <Button disabled className="w-full h-14 bg-emerald-500/10 text-emerald-500 border-2 border-emerald-500/20 rounded-2xl font-bold flex items-center justify-center gap-2">
                                                            <CheckCircle2 className="w-5 h-5" />
                                                            Voto Registrado Correctamente
                                                        </Button>
                                                    ) : (
                                                        <VoteInterface vote={vote} userRole={userProfile?.role} userId={user.id} onVoteSuccess={() => handleUserVote(vote.id)} />
                                                    )}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                )
                            })}

                            {!isAdmin && (!localVotes || localVotes.length === 0) && (
                                <div className="col-span-full">
                                    <Card className="bg-[#121212] border-white/5 border-dashed rounded-3xl">
                                        <CardContent className="py-16 md:py-24 text-center">
                                            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6">
                                                <FileBarChart className="w-10 h-10 text-gray-600" />
                                            </div>
                                            <p className="text-gray-500 font-medium text-lg">No hay votaciones activas en este momento.</p>
                                            <p className="text-sm text-gray-600 mt-2">Mantente atento a las instrucciones del administrador.</p>
                                        </CardContent>
                                    </Card>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
