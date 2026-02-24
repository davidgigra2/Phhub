"use client";

import { useActionState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "./actions";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";

function LoginForm() {
    const [state, formAction, isPending] = useActionState(login, null);
    const router = useRouter();
    const supabase = createClient();
    const searchParams = useSearchParams();
    const prefilledUser = searchParams.get('user') || '';

    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                router.replace("/dashboard");
            }
        };
        checkSession();
    }, [router, supabase]);

    return (
        <Card className="w-full max-w-md bg-[#121212] border-white/5 shadow-2xl z-10">
            <CardHeader className="space-y-1">
                <CardTitle className="text-2xl font-bold text-white text-center">Bienvenido de nuevo</CardTitle>
                <CardDescription className="text-center text-gray-400">
                    Ingresa tu usuario y contraseña para acceder
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <form action={formAction} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="username" className="text-gray-300">Usuario</Label>
                        <Input
                            id="username"
                            name="username"
                            type="text"
                            defaultValue={prefilledUser}
                            placeholder="Ej: 1001001"
                            required
                            className="bg-[#0A0A0A] border-white/10 text-white focus:border-indigo-500 transition-colors"
                            onDoubleClick={(e) => e.currentTarget.select()}
                        />
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="password" className="text-gray-300">Contraseña</Label>
                            <Link href="#" className="text-xs text-indigo-400 hover:text-indigo-300">
                                ¿Olvidaste tu contraseña?
                            </Link>
                        </div>
                        <Input
                            id="password"
                            name="password"
                            type="password"
                            required
                            className="bg-[#0A0A0A] border-white/10 text-white focus:border-indigo-500 transition-colors"
                        />
                    </div>

                    {state?.error && (
                        <div className="p-3 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                            {state.error}
                        </div>
                    )}

                    <Button disabled={isPending} type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 mt-2">
                        {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        {isPending ? "Iniciando..." : "Iniciar Sesión"}
                    </Button>
                </form>
            </CardContent>
            <CardFooter className="flex justify-center text-sm text-gray-500">
                ¿Eres administrador nuevo? &nbsp;
                <a href="https://wa.me/573216668541" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300">
                    Contacta ventas
                </a>
            </CardFooter>
        </Card>
    );
}

export default function LoginPage() {
    return (
        <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Background Layer Group */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-indigo-500/10 via-transparent to-transparent opacity-50 block" />
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/10 via-transparent to-transparent" />
            </div>

            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[100px] -z-10" />

            <Link href="/" className="absolute top-8 left-8 text-gray-400 hover:text-white flex items-center gap-2 transition-colors z-10">
                <ArrowLeft className="w-4 h-4" /> Volver al inicio
            </Link>

            <div className="flex flex-col items-center mb-8 gap-3 z-10">
                <Image src="/ph-core-logo.png" alt="PH Core" width={72} height={72} className="shadow-lg" />
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-white tracking-tight">PH Core</h1>
                    <p className="text-gray-500 text-sm">Plataforma de Gestión de Asambleas</p>
                </div>
            </div>

            <Suspense fallback={<Loader2 className="w-8 h-8 animate-spin text-indigo-500 z-10" />}>
                <LoginForm />
            </Suspense>
        </div>
    );
}
