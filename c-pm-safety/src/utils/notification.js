export const sendAutoCheckoutNotification = async () => {
    if (!('Notification' in window)) {
        console.warn('이 브라우저는 알림을 지원하지 않습니다.');
        return;
    }

    let permission = Notification.permission;
    if (permission === 'default') {
        permission = await Notification.requestPermission();
    }

    if (permission === 'granted') {
        // Service Worker를 통한 알림 발송 (PWA 백그라운드 환경 고려)
        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.ready;
            registration.showNotification('라이딩 자동 종료 안내', {
                body: '주차가 완료되었습니다. 나중에 안전 라이딩 리포트를 확인해 보세요!',
                icon: '/icons/notification-icon.png', // 실제 경로 필요 시 수정
                vibrate: [200, 100, 200],
                requireInteraction: true // 사용자가 확인할 때까지 유지 (선택 사항)
            });
        } else {
            // 일반 브라우저 알림 Fallback
            new Notification('라이딩 자동 종료 안내', {
                body: '주차가 완료되었습니다. 나중에 안전 라이딩 리포트를 확인해 보세요!'
            });
        }
    }
};
