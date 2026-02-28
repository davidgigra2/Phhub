"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

interface VoteResultsProps {
    voteId: string;
    options: { id: string; label: string }[];
}

interface VoteCount {
    option_id: string;
    count: number;
}

export default function VoteResults({ voteId, options }: VoteResultsProps) {
    const [results, setResults] = useState<Record<string, number>>({});
    const [totalVotes, setTotalVotes] = useState(0);
    const [loading, setLoading] = useState(true);

    const supabase = useRef(createClient()).current;

    // Fetch initial results
    useEffect(() => {
        const fetchResults = async () => {
            const { data, error } = await supabase
                .from("ballots")
                .select("option_id, weight")
                .eq("vote_id", voteId);

            if (error) {
                console.error("Error fetching vote results:", error);
            } else if (data) {
                // Aggregate counts
                const counts: Record<string, number> = {};
                let total = 0;

                data.forEach((ballot: any) => {
                    const weight = Number(ballot.weight) || 0;
                    counts[ballot.option_id] = (counts[ballot.option_id] || 0) + weight;
                    total += weight;
                });

                setResults(counts);
                setTotalVotes(total);
            }
            setLoading(false);
        };

        fetchResults();

        // Subscribe to Realtime Updates
        const subscription = supabase
            .channel(`vote-results-${voteId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "ballots",
                    filter: `vote_id=eq.${voteId}`,
                },
                (payload) => {
                    const newVote = payload.new as any;
                    const weight = Number(newVote.weight) || 0;

                    setResults((prev) => ({
                        ...prev,
                        [newVote.option_id]: (prev[newVote.option_id] || 0) + weight,
                    }));
                    setTotalVotes((prev) => prev + weight);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [voteId, supabase]);

    if (loading) {
        return <Loader2 className="w-4 h-4 animate-spin text-gray-500 mx-auto" />;
    }

    return (
        <div className="space-y-4 pt-4 border-t border-white/5 animate-in fade-in">
            <h3 className="text-sm font-semibold text-gray-300 mb-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <span>Resultados en Vivo</span>
                    {totalVotes > 0 && (
                        <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                            Quórum Participante: {(totalVotes * 100).toFixed(2)}%
                        </span>
                    )}
                </div>
                {totalVotes === 0 && (
                    <span className="text-[10px] font-black tracking-widest uppercase bg-white/5 text-gray-400 px-2 py-0.5 rounded-full border border-white/10">Sin votos aún</span>
                )}
            </h3>

            {options.map((option) => {
                const count = results[option.id] || 0;
                const percentage = totalVotes > 0 ? (count / totalVotes) * 100 : 0;

                return (
                    <div key={option.id} className="space-y-1">
                        <div className="flex justify-between text-xs font-medium text-gray-300">
                            <span>{option.label}</span>
                            <span className="font-mono text-white font-bold">{percentage.toFixed(1)}%</span>
                        </div>
                        <Progress value={percentage} className="h-4 bg-white/10" indicatorClassName="bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.6)]" />
                    </div>
                );
            })}
        </div>
    );
}
