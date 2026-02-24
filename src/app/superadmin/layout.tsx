import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Image from 'next/image';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: profile } = await supabase
        .from('users')
        .select('role, full_name')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'SUPER_ADMIN') redirect('/dashboard');

    return (
        <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
            {/* Top Header Navbar */}
            <header className="h-16 border-b border-white/5 bg-[#0F0F0F] flex items-center justify-between px-6 shrink-0">
                <Link href="/superadmin" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                    <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-white/5">
                        <Image
                            src="/ph-core-logo.png"
                            alt="PH Core Logo"
                            fill
                            className="object-cover"
                        />
                    </div>
                    <div>
                        <p className="text-white font-bold text-sm leading-tight">PH Core</p>
                        <p className="text-violet-400 text-[10px] font-bold uppercase tracking-wider">Super Admin</p>
                    </div>
                </Link>

                <div className="flex items-center gap-4">
                    <div className="px-3 py-1.5 bg-violet-500/10 rounded-md border border-violet-500/20 text-right hidden sm:block">
                        <span className="text-[10px] text-violet-300 uppercase font-bold tracking-wider block leading-none mb-1">Perfil</span>
                        <span className="text-sm font-semibold text-white leading-none">{profile?.full_name || 'Super Admin'}</span>
                    </div>
                    <form action="/auth/signout" method="post">
                        <Button variant="ghost" className="text-gray-400 hover:text-white hover:bg-white/10 flex items-center gap-2 h-9 px-3">
                            <LogOut className="w-4 h-4 text-red-400/70" />
                            <span className="text-sm font-medium">Salir</span>
                        </Button>
                    </form>
                </div>
            </header>

            {/* Main content area */}
            <main className="flex-1 overflow-auto bg-[#0A0A0A]">
                {children}
            </main>
        </div>
    );
}
