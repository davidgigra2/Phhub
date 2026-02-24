'use client';

import { useState } from 'react';
import { deleteManagedUser } from './user-actions';
import { Trash2, Loader2 } from 'lucide-react';

export default function DeleteUserButton({ userId, name }: { userId: string; name: string }) {
    const [loading, setLoading] = useState(false);
    const [confirm, setConfirm] = useState(false);

    const handleDelete = async () => {
        if (!confirm) { setConfirm(true); return; }
        setLoading(true);
        await deleteManagedUser(userId);
        setLoading(false);
        setConfirm(false);
    };

    return (
        <button
            onClick={handleDelete}
            disabled={loading}
            title={confirm ? `¿Confirmar eliminar ${name}?` : `Eliminar ${name}`}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50
                ${confirm
                    ? 'bg-red-600 text-white hover:bg-red-700 animate-pulse'
                    : 'bg-white/5 text-gray-400 hover:bg-red-500/10 hover:text-red-400 border border-white/10'
                }`}
        >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            {confirm ? 'Confirmar' : 'Eliminar'}
        </button>
    );
}
