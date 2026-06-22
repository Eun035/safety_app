import { useEffect, useState } from 'react';

export const usePageVisibility = () => {
    const [isVisible, setIsVisible] = useState(() =>
        typeof document === 'undefined' ? true : document.visibilityState === 'visible'
    );

    useEffect(() => {
        if (typeof document === 'undefined') return;
        const onChange = () => setIsVisible(document.visibilityState === 'visible');
        document.addEventListener('visibilitychange', onChange);
        return () => document.removeEventListener('visibilitychange', onChange);
    }, []);

    return isVisible;
};
