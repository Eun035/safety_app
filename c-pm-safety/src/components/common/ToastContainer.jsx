import React from 'react';
import { CheckCircle, AlertTriangle, Info, XCircle, X } from 'lucide-react';
import { useToast } from '../../hooks/useToast';

const STYLES = {
    success: {
        bg: 'bg-emerald-950/95 border-emerald-500/60',
        icon: <CheckCircle size={18} className="text-emerald-400 flex-shrink-0 mt-0.5" />,
        text: 'text-emerald-100',
        bar: 'bg-emerald-500',
    },
    error: {
        bg: 'bg-red-950/95 border-red-500/60',
        icon: <XCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />,
        text: 'text-red-100',
        bar: 'bg-red-500',
    },
    warning: {
        bg: 'bg-amber-950/95 border-amber-500/60',
        icon: <AlertTriangle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />,
        text: 'text-amber-100',
        bar: 'bg-amber-500',
    },
    info: {
        bg: 'bg-gray-950/95 border-cyan-500/30',
        icon: <Info size={18} className="text-cyan-400 flex-shrink-0 mt-0.5" />,
        text: 'text-gray-100',
        bar: 'bg-cyan-500',
    },
};

const ToastContainer = () => {
    const { toasts, remove } = useToast();

    if (toasts.length === 0) return null;

    return (
        <div
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[99999] flex flex-col gap-2 pointer-events-none"
            style={{ width: 'min(92vw, 380px)' }}
        >
            {toasts.map(t => {
                const style = STYLES[t.type] || STYLES.info;
                return (
                    <div
                        key={t.id}
                        className={`relative flex items-start gap-3 px-4 py-3.5 rounded-2xl border backdrop-blur-2xl shadow-2xl pointer-events-auto overflow-hidden animate-in slide-in-from-top-2 duration-300 ${style.bg}`}
                    >
                        {/* 좌측 컬러 바 */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${style.bar}`} />

                        {style.icon}

                        <p className={`text-sm font-semibold flex-1 leading-snug pr-1 ${style.text}`}>
                            {t.message}
                        </p>

                        <button
                            onClick={() => remove(t.id)}
                            className="text-white/30 hover:text-white/80 flex-shrink-0 transition-colors"
                        >
                            <X size={15} />
                        </button>
                    </div>
                );
            })}
        </div>
    );
};

export default ToastContainer;
