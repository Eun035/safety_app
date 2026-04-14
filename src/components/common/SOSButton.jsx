import React from 'react';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { PhoneCall } from 'lucide-react';

const SOSButton = () => {
    const [emergencyContact, setEmergencyContact] = useLocalStorage('emergencyContact', '');

    const handleSOSClick = () => {
        if (!emergencyContact) {
            const contact = prompt('긴급 상황 시 연락할 보호자의 전화번호를 입력해주세요. (예: 01012345678)');
            if (contact) {
                // 숫자만 남기기
                const cleanContact = contact.replace(/[^0-9]/g, '');
                if (cleanContact.length >= 9) {
                    setEmergencyContact(cleanContact);
                    alert('비상 연락처가 저장되었습니다. 다시 클릭하면 즉시 전화가 걸립니다.');
                } else {
                    alert('올바른 전화번호를 입력해주세요.');
                }
            }
        } else {
            window.location.href = `tel:${emergencyContact}`;
        }
    };

    return (
        <button
            onClick={handleSOSClick}
            className="w-14 h-14 bg-red-600 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(220,38,38,0.6)] text-white z-[110] animate-pulse hover:scale-105 active:scale-95 transition-all border-2 border-red-400 relative"
        >
            <PhoneCall size={28} className="fill-black" />
        </button>
    );
};

export default SOSButton;
