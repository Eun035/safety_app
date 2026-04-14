import React from 'react';
import { PhoneCall } from 'lucide-react';

const FloatingBtn = ({ onClick }) => {
    return (
        <div className="fixed bottom-24 right-6 z-[100] flex flex-col items-center gap-2">
            <span className="text-[10px] font-black text-red-600 bg-white/80 px-2 py-0.5 rounded-full shadow-sm">SOS</span>
            <button
                onClick={onClick}
                className="relative group p-4 bg-red-600 text-white rounded-full shadow-2xl hover:bg-red-700 transition-all active:scale-90"
            >
                {/* Pulse Effect Animation */}
                <span className="absolute inset-0 rounded-full bg-red-600 animate-ping opacity-25"></span>
                <PhoneCall size={28} className="relative z-10" />
            </button>
        </div>
    );
};

export default FloatingBtn;
