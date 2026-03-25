import { useState, useEffect } from 'react';
import safetyGrid from '../data/safetyGrid.json';
import { calculateDistance } from '../utils/distance';

export const useSafetyGrid = (currentLat, currentLng) => {
    const [safetyStatus, setSafetyStatus] = useState({
        level: 'safe', // safe, warning, danger
        borderColor: '#22c55e', // default green
        message: '안전 주행 구역입니다.'
    });

    useEffect(() => {
        if (!currentLat || !currentLng) return;

        let highestLevel = 'safe';
        let color = '#22c55e';
        let msg = '안전 주행 구역입니다.';

        for (const zone of safetyGrid) {
            const dist = calculateDistance(currentLat, currentLng, zone.lat, zone.lng);
            if (dist <= zone.radius) {
                if (zone.safetyLevel === 'danger') {
                    highestLevel = 'danger';
                    color = '#ef4444'; // red
                    msg = `[위험] ${zone.name} 진입! 주의하세요.`;
                    break; // 최고 위험이므로 바로 종료
                } else if (zone.safetyLevel === 'warning') {
                    highestLevel = 'warning';
                    color = '#eab308'; // yellow
                    msg = `[주의] ${zone.name} 부근입니다. 서행하세요.`;
                }
            }
        }

        setSafetyStatus({
            level: highestLevel,
            borderColor: color,
            message: msg
        });

    }, [currentLat, currentLng]);

    return safetyStatus;
};
