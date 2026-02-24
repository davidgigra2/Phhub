import AdminReports from "../AdminReports";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ assembly?: string }> }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data: userProfile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

    if (userProfile?.role !== "ADMIN" && userProfile?.role !== "SUPER_ADMIN") {
        redirect("/dashboard");
    }

    const { assembly } = await searchParams;

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-white p-8">
            <div className="max-w-7xl mx-auto">
                <AdminReports assemblyId={assembly} />
            </div>
        </div>
    );
}
