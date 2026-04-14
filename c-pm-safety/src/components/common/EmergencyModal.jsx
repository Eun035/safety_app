import React from 'react';
import { X, Phone, ShieldAlert } from 'lucide-react';

const EmergencyModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const contacts = [
        { name: '경찰청', number: '112', icon: '👮' },
        { name: '소방청 (119)', number: '119', icon: '🚒' },
        { name: '단국대 통합경비실', number: '041-550-1114', icon: '🏫' },
    ];

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-xs rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="bg-red-600 p-6 flex flex-col items-center text-white">
                    <ShieldAlert size={40} className="mb-2 animate-bounce" />
                    <h2 className="text-xl font-black">긴급 연락망</h2>
                    <p className="text-red-100 text-xs mt-1">도움이 필요하신가요?</p>
                </div>

                <div className="p-4 space-y-3">
                    {contacts.map((contact) => (
                        <a
                            key={contact.number}
                            href={`tel:${contact.number}`}
                            className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-red-50 hover:border-red-200 transition"
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-xl">{contact.icon}</span>
                                <div>
                                    <div className="text-sm font-bold text-gray-900">{contact.name}</div>
                                    <div className="text-xs text-red-600 font-bold">{contact.number}</div>
                                </div>
                            </div>
                            <Phone size={18} className="text-gray-400" />
                        </a>
                    ))}
                </div>

                <button
                    onClick={onClose}
                    className="w-full py-4 bg-gray-900 text-white font-bold flex items-center justify-center gap-2 hover:bg-black transition"
                >
                    <X size={18} />
                    닫기
                </button>
            </div>
        </div>
    );
};

export default EmergencyModal;
