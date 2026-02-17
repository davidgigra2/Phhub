"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import QRCode from "react-qr-code";
import { QrCode, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface UserQRCardProps {
    documentNumber: string | null;
    username: string;
    unitNumber: string;
}

export default function UserQRCard({ documentNumber, username, unitNumber }: UserQRCardProps) {
    // If no document number, fallback to username (though constraint should prevent this for USER role)
    const qrValue = documentNumber || username;
    const [isExpanded, setIsExpanded] = useState(true);

    return (
        <Card className="bg-[#121212] border-white/5 h-fit transition-all duration-300">
            <CardHeader className="pb-2 cursor-pointer select-none" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-gray-200 flex items-center gap-2 text-lg">
                        <QrCode className="w-5 h-5 text-indigo-400" />
                        Tu Credencial
                    </CardTitle>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-white">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                </div>
                {!isExpanded && <CardDescription>Clic para ver tu código QR</CardDescription>}
            </CardHeader>

            {isExpanded && (
                <CardContent className="flex flex-col items-center justify-center py-6 animate-in slide-in-from-top-2 duration-200">
                    <div className="bg-white p-4 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.15)] mb-4">
                        <QRCode
                            value={qrValue}
                            size={180}
                            viewBox={`0 0 256 256`}
                            style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                        />
                    </div>
                    <div className="text-center">
                        <p className="text-xl font-bold text-white tracking-widest font-mono">{qrValue}</p>
                        <p className="text-sm text-gray-500 mt-1">Unidad: <span className="text-emerald-400 font-medium">{unitNumber}</span></p>
                    </div>
                </CardContent>
            )}
        </Card>
    );
}
