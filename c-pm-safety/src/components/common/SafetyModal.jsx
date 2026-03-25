import React from 'react';
import { X, AlertTriangle, CheckCircle, Info } from 'lucide-react';

const SafetyModal = ({ isOpen, onClose, data }) => {
    if (!isOpen || !data) return null;

    const getIcon = () => {
        switch (data.type) {
            case 'SLOPE': return <AlertTriangle className="text-red-500" />;
            case 'SCHOOL': return <Info className="text-yellow-500" />;
            case 'PARKING': return <CheckCircle className="text-green-500" />;
            default: return <Info className="text-blue-500" />;
        }
    };

    const getRiskColor = () => {
        switch (data.riskLevel) {
            case 'HIGH': return 'bg-red-100 text-red-700';
            case 'MEDIUM': return 'bg-yellow-100 text-yellow-700';
            case 'LOW': return 'bg-green-100 text-green-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4 bg-black bg-opacity-50 transition-opacity">
            <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden transform transition-all">
                <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gray-50 rounded-xl">
                                {getIcon()}
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">{data.title}</h3>
                                <span className={`inline-block px-2 py-0.5 mt-1 rounded text-xs font-bold ${getRiskColor()}`}>
                                    {data.riskLevel} RISK
                                </span>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
                            <X size={24} className="text-gray-400" />
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <p className="text-gray-600 leading-relaxed">
                                {data.description}
                            </p>
                        </div>

                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                            <h4 className="flex items-center gap-2 text-blue-700 font-bold mb-1">
                                <CheckCircle size={18} />
                                Safety Tip
                            </h4>
                            <p className="text-blue-600 text-sm">
                                {data.safetyTip}
                            </p>
                        </div>
                    </div>

                    <div className="mt-8">
                        <button
                            onClick={onClose}
                            className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition"
                        >
                            확인했습니다
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SafetyModal;
