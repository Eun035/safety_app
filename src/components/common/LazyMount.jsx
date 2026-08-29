import { Suspense, useState } from 'react';

/**
 * 무거운 시트/모달을 **처음 열릴 때** 내려받고, 그 뒤로는 마운트를 유지한다.
 *
 * 왜 이 형태인가:
 * - React.lazy만 걸고 항상 렌더하면 첫 렌더에 청크를 받아버려 분할한 의미가 없다.
 * - 그렇다고 `isOpen && <Sheet/>` 로 두면 닫는 순간 언마운트돼
 *   AnimatePresence의 **exit 애니메이션이 사라진다**(시트가 툭 끊기며 사라짐).
 * - 그래서 "한 번 열렸으면 계속 마운트" 로 절충한다. 첫 오픈에서만 청크를
 *   기다리고, 이후 열고 닫는 동작은 원래대로 부드럽게 동작한다.
 *
 * children은 App 렌더 시 element로 만들어지지만, 실제로 트리에 넣기 전까지는
 * lazy import가 트리거되지 않으므로 안전하다.
 */
const LazyMount = ({ when, children }) => {
    const [everOpened, setEverOpened] = useState(when);

    // 렌더 중 조정 — effect로 미루면 첫 오픈이 한 프레임 늦는다
    if (when && !everOpened) setEverOpened(true);

    if (!everOpened) return null;

    // fallback을 null로 두면 청크가 늦거나 멈췄을 때 "아무 일도 안 일어난 것"처럼
    // 보인다. 최소한의 표시를 띄워 사용자가 기다리는 중임을 알 수 있게 한다.
    return (
        <Suspense
            fallback={
                <div className="fixed inset-0 z-[2400] flex items-center justify-center bg-black/50 backdrop-blur-sm pointer-events-none">
                    <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-cyber-cyan animate-spin" />
                </div>
            }
        >
            {children}
        </Suspense>
    );
};

export default LazyMount;
