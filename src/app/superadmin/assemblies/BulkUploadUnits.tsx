'use client';

import { useState, useRef } from 'react';
import { bulkUploadUnits, type UnitRow } from './actions';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, X } from 'lucide-react';

interface Props { assemblyId: string; }

export default function BulkUploadUnits({ assemblyId }: Props) {
    const [preview, setPreview] = useState<UnitRow[]>([]);
    const [fileName, setFileName] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ created: number; errors: string[] } | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFile = (file: File) => {
        setFileName(file.name);
        setResult(null);
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            const lines = text.trim().split('\n');
            const rows: UnitRow[] = [];

            // Skip header row
            for (let i = 1; i < lines.length; i++) {
                const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
                if (cols.length < 3 || !cols[0]) continue;
                rows.push({
                    number: cols[0],
                    coefficient: parseFloat(cols[1]) || 0,
                    owner_name: cols[2] || '',
                    document_number: cols[3] || undefined,
                    email: cols[4] || undefined,
                    owner_phone: cols[5] || undefined,
                });
            }
            setPreview(rows);
        };
        reader.readAsText(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const f = e.dataTransfer.files[0];
        if (f?.name.endsWith('.csv')) handleFile(f);
    };

    const handleUpload = async () => {
        if (!preview.length) return;
        setLoading(true);
        try {
            const res = await bulkUploadUnits(assemblyId, preview);
            setResult(res);
            setPreview([]);
            setFileName('');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* CSV format hint */}
            <div className="bg-violet-500/5 border border-violet-500/20 rounded-lg p-3">
                <p className="text-violet-300 text-xs font-medium mb-1">Formato CSV requerido:</p>
                <code className="text-violet-400 text-xs">number,coefficient,owner_name,document_number,email,owner_phone</code>
                <p className="text-gray-500 text-xs mt-1">Las columnas <code>document_number</code> y <code>email</code> son opcionales (pero necesarias para crear el acceso al usuario automáticamente).</p>
            </div>

            {/* Drop zone */}
            {!preview.length && (
                <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => inputRef.current?.click()}
                    className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center cursor-pointer hover:border-violet-500/40 hover:bg-violet-500/5 transition-all"
                >
                    <FileSpreadsheet className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm font-medium">Arrastra tu CSV aquí</p>
                    <p className="text-gray-600 text-xs mt-1">o haz clic para seleccionar el archivo</p>
                    <input
                        ref={inputRef}
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                    />
                </div>
            )}

            {/* Preview table */}
            {preview.length > 0 && (
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-gray-300">
                            <span className="font-medium text-white">{preview.length}</span> unidades listas para importar
                            <span className="text-gray-500 ml-2">({fileName})</span>
                        </p>
                        <button onClick={() => { setPreview([]); setFileName(''); }} className="text-gray-500 hover:text-red-400 transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="rounded-lg border border-white/5 overflow-hidden max-h-56 overflow-y-auto">
                        <table className="w-full text-xs">
                            <thead className="sticky top-0 bg-[#1A1A1A]">
                                <tr>
                                    {['Unidad', 'Coeficiente', 'Propietario', 'Documento', 'Email', 'Celular'].map(h => (
                                        <th key={h} className="text-left px-3 py-2 text-gray-400 font-medium">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {preview.map((row, i) => (
                                    <tr key={i} className="border-t border-white/5">
                                        <td className="px-3 py-2 text-white font-mono">{row.number}</td>
                                        <td className="px-3 py-2 text-gray-400">{row.coefficient}</td>
                                        <td className="px-3 py-2 text-gray-300">{row.owner_name}</td>
                                        <td className="px-3 py-2 text-gray-400">{row.document_number || '—'}</td>
                                        <td className="px-3 py-2 text-gray-400 truncate max-w-[150px]">{row.email || '—'}</td>
                                        <td className="px-3 py-2 text-gray-400">{row.owner_phone || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <button
                        onClick={handleUpload}
                        disabled={loading}
                        className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        {loading ? 'Importando...' : `Importar ${preview.length} unidades`}
                    </button>
                </div>
            )}

            {/* Result */}
            {result && (
                <div className="space-y-2">
                    <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <p className="text-emerald-300 text-sm">{result.created} unidades importadas correctamente</p>
                    </div>
                    {result.errors.map((err, i) => (
                        <div key={i} className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                            <p className="text-red-300 text-xs">{err}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
