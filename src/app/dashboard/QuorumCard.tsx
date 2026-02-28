"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface QuorumCardProps {
    quorum: number;
    loading: boolean;
}

export default function QuorumCard({ quorum, loading }: QuorumCardProps) {
    const hasQuorum = quorum > 0.5;

    return (
        <Card className="bg-[#121212] border-white/5 h-full flex flex-col shadow-lg rounded-2xl">
            <CardHeader className="pb-2">
                <CardTitle className="text-gray-400 text-xs font-black uppercase tracking-widest">Quórum Presente</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-end">
                {loading ? (
                    <div className="flex justify-between text-sm mt-3 animate-pulse">
                        <div className="h-6 w-16 bg-white/10 rounded"></div>
                    </div>
                ) : (
                    <>
                        <div className={`text-4xl font-black tracking-tight ${hasQuorum ? "text-emerald-500" : "text-yellow-500"}`}>
                            {(quorum * 100).toFixed(2)}%
                        </div>
                        <div className="flex justify-between text-xs mt-3">
                            <span className="text-gray-500 font-medium">Req: &gt;50.00%</span>
                            <span className={`font-bold ${hasQuorum ? "text-emerald-400" : "text-yellow-400"}`}>
                                {hasQuorum ? "Quórum Alcanzado" : "Esperando Quórum"}
                            </span>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
