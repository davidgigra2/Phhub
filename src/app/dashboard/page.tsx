import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import QuorumCard from './QuorumCard'
import { castVote } from './actions'
import AdminVoteControls from './AdminVoteControls'
import CreateVoteForm from './CreateVoteForm'
import EditVoteForm from './EditVoteForm'
import Link from 'next/link'
import { PlusCircle, FileBarChart } from 'lucide-react'
import VoteInterface from './VoteInterface'
import VoteResults from './VoteResults'
import UserQRCard from './UserQRCard';
import OperatorAttendance from './OperatorAttendance';
import PowerManagement from './PowerManagement';
import AdminReports from './AdminReports';
import { getMyPowerStats } from './power-actions';

export default async function DashboardPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return redirect('/login')
    }

    // Fetch user profile
    const { data: userProfile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

    // Fetch represented units (Own + Proxies)
    const { data: representedUnits } = await supabase
        .from('units')
        .select('id, number, coefficient')
        .eq('representative_id', user.id)
        .order('number');

    const totalCoefficient = (representedUnits || []).reduce((sum, u) => sum + Number(u.coefficient || 0), 0);

    const isAdmin = userProfile?.role === 'ADMIN';
    const isOperator = userProfile?.role === 'OPERATOR'; // Strict separation as requested

    // Fetch proxies data (Given and Received)
    let givenProxy = null;
    let powerStats = null;

    if (!isAdmin) {
        // Did I give power?
        const { data: given } = await supabase
            .from('proxies')
            .select('*, representative:users!proxies_representative_id_fkey(full_name, id, document_number)')
            .eq('principal_id', user.id)
            .eq('status', 'APPROVED') // Assuming approved for now
            .single();
        givenProxy = given;

        // Did I receive powers? Grab stats
        powerStats = await getMyPowerStats(user.id);
    }

    // Fetch votes logic (Admin sees ALL in their assembly, User sees only OPEN)
    let voteQuery = supabase
        .from('votes')
        .select(`
            *,
            vote_options (*),
            ballots (user_id)
        `)
        .order('created_at', { ascending: false });

    // Filter by assembly if user has one
    if (userProfile?.assembly_id) {
        voteQuery = voteQuery.eq('assembly_id', userProfile.assembly_id);
    }

    if (!isAdmin) {
        voteQuery = voteQuery.eq('status', 'OPEN');
    }

    const { data: votes } = await voteQuery;

    const roleMap: Record<string, string> = {
        'ADMIN': 'Administrador',
        'OPERATOR': 'Operador',
        'USER': 'Asambleísta'
    }

    const userRole = userProfile?.role ? (roleMap[userProfile.role] || userProfile.role) : 'Usuario'
    const displayUnit = representedUnits && representedUnits.length > 0
        ? representedUnits.map(u => u.number).join(', ')
        : 'Sin Unidad'

    if (error) {
        console.error('Error fetching dashboard profile:', error)
    }

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-white p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold">Panel de Control</h1>
                        <p className="text-gray-400 mt-1">
                            Bienvenido, <span className="text-indigo-400 font-medium">{userProfile?.full_name || user.email}</span>
                        </p>
                    </div>

                    <div className="flex items-center gap-4 bg-[#121212] p-2 rounded-lg border border-white/5">
                        <div className="px-4 py-2 bg-indigo-500/10 rounded-md border border-indigo-500/20">
                            <span className="text-xs text-indigo-300 uppercase font-bold tracking-wider block">Perfil</span>
                            <span className="text-sm font-semibold text-white">{userRole}</span>
                        </div>
                        {(displayUnit !== 'Sin Unidad') && (
                            <div className="px-4 py-2 bg-emerald-500/10 rounded-md border border-emerald-500/20">
                                <span className="text-xs text-emerald-300 uppercase font-bold tracking-wider block">Unidad</span>
                                <span className="text-sm font-semibold text-white">{displayUnit}</span>
                            </div>
                        )}
                        <form action="/auth/signout" method="post">
                            <Button variant="ghost" className="text-gray-400 hover:text-white hover:bg-white/10">
                                Cerrar Sesión
                            </Button>
                        </form>
                    </div>
                </div>

                {/* KPI Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {isAdmin && (
                        <Link href="/dashboard/reports" className="group">
                            <Card className="bg-indigo-950/20 border-indigo-500/20 hover:bg-indigo-900/30 transition-all cursor-pointer h-full">
                                <CardHeader>
                                    <CardTitle className="text-indigo-400 flex items-center gap-2">
                                        <FileBarChart className="w-5 h-5" />
                                        Informes y Estadísticas
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-white group-hover:scale-105 transition-transform">Ver Reportes →</div>
                                    <p className="text-sm text-gray-400 mt-2">Asistencia, Votos, Poderes</p>
                                </CardContent>
                            </Card>
                        </Link>
                    )}

                    <Card className="bg-[#121212] border-white/5">
                        <CardHeader>
                            <CardTitle className="text-gray-200">Estado de Asamblea</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-indigo-500">Activa</div>
                            <p className="text-sm text-gray-500 mt-2">Bienvenida y verificación</p>
                        </CardContent>
                    </Card>

                    <QuorumCard />


                    {representedUnits && representedUnits.length > 0 ? (
                        <Card className="bg-[#121212] border-white/5">
                            <CardHeader>
                                <CardTitle className="text-gray-200">Tu Coeficiente Total</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-white">
                                    {totalCoefficient.toFixed(4)}
                                </div>
                                <p className="text-sm text-gray-500 mt-2">Poder de voto ({representedUnits.length} unidades)</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="bg-[#121212] border-white/5">
                            <CardHeader>
                                <CardTitle className="text-gray-200">Unidades</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-white">0</div>
                                <p className="text-sm text-gray-500 mt-2">No tienes propiedades asignadas</p>
                            </CardContent>
                        </Card>
                    )}
                    {/* User QR Code (Visible only to Asambleístas) */}
                    {userProfile?.role === 'USER' && (
                        <UserQRCard
                            documentNumber={userProfile?.document_number}
                            username={userProfile?.username || user.email}
                            unitNumber={displayUnit}
                        />
                    )}
                </div>

                {/* Power Management Section */}
                {!isAdmin && (
                    <PowerManagement
                        userId={user.id}
                        userRole={userProfile?.role}
                        givenProxy={givenProxy}
                        receivedProxies={powerStats?.representedUnits || []}
                        ownWeight={powerStats?.ownWeight || 0}
                    />
                )}



                {/* Operator Section (Scanning & Manual Entry) */}
                {isOperator && (
                    <div className="grid grid-cols-1 gap-6">
                        <OperatorAttendance />
                    </div>
                )}

                {/* Voting Section */}
                <div className="space-y-6">
                    <h2 className="text-2xl font-bold">Votaciones {isAdmin ? "(Gestión)" : "en Curso"}</h2>

                    {/* Grid Layout: Includes Create Form + Votes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Admin Create Card (Always First) */}
                        {isAdmin && <CreateVoteForm assemblyId={userProfile?.assembly_id || ''} />}

                        {/* Vote Cards */}
                        {votes && votes.map((vote) => {
                            const hasVoted = vote.ballots && vote.ballots.some((b: any) => b.user_id === user.id);
                            const isDraft = vote.status === 'DRAFT';
                            const isPaused = vote.status === 'PAUSED';
                            const isClosed = vote.status === 'CLOSED';

                            // If user is Admin and vote is Paused, show Edit Form instead of Card
                            if (isAdmin && isPaused) {
                                return <EditVoteForm key={vote.id} vote={vote} />;
                            }

                            return (
                                <Card key={vote.id} className={`bg-[#121212] border-white/5 ${isClosed ? 'opacity-60 grayscale' : ''}`}>
                                    <CardHeader>
                                        <div className="flex justify-between items-start">
                                            <CardTitle className="text-gray-200">{vote.title}</CardTitle>
                                            <div className="flex gap-2">
                                                {isDraft && <span className="px-2 py-0.5 rounded text-xs bg-gray-500/20 text-gray-400 border border-gray-500/20">BORRADOR</span>}
                                                {isPaused && <span className="px-2 py-0.5 rounded text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/20">PAUSADA</span>}
                                                {isClosed && <span className="px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-400 border border-red-500/20">CERRADA</span>}
                                                {vote.status === 'OPEN' && <span className="px-2 py-0.5 rounded text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/20">ABIERTA</span>}
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-gray-400 mb-4">{vote.description || "Sin descripción adicional."}</p>

                                        {/* Admin Controls */}
                                        {isAdmin && <AdminVoteControls voteId={vote.id} status={vote.status} />}

                                        {/* Live Results (Visible to Admin, or if Closed, or if User has Voted) */}
                                        {(isAdmin || isClosed || hasVoted) && (
                                            <VoteResults voteId={vote.id} options={vote.vote_options} />
                                        )}

                                        {/* Voting Interface (Only if OPEN and User is NOT Admin) */}
                                        {!isAdmin && !isDraft && !isClosed && vote.status === 'OPEN' && (
                                            <>
                                                {hasVoted ? (
                                                    <div className="mt-4 pt-4 border-t border-white/5">
                                                        <Button disabled className="w-full bg-emerald-500/20 text-emerald-500 border border-emerald-500/20">
                                                            ✅ Voto Registrado
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <VoteInterface vote={vote} userRole={userProfile?.role} userId={user.id} />
                                                )}
                                            </>
                                        )}
                                    </CardContent>
                                </Card>
                            )
                        })}

                        {/* Empty State for Users (No Create Form, No Votes) */}
                        {!isAdmin && (!votes || votes.length === 0) && (
                            <div className="col-span-full">
                                <Card className="bg-[#121212] border-white/5 border-dashed">
                                    <CardContent className="py-12 text-center text-gray-500">
                                        No hay votaciones activas en este momento.
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </div>
                </div>
            </div >
        </div >
    )
}
