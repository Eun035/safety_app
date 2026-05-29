import React, { useRef, useEffect, useState } from 'react';
import { Camera, ShieldCheck, AlertCircle, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEdgeAI } from '../../hooks/useEdgeAI';

const HelmetDetectionCamera = ({ isOpen, onClose, onSuccess }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [hasPermission, setHasPermission] = useState(null);

  const { isModelLoaded, isHelmetDetected, detectionProgress } = useEdgeAI(videoRef, isOpen && hasPermission);

  // 카메라 스트림 시작
  useEffect(() => {
    if (!isOpen) return;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setHasPermission(true);
      } catch (err) {
        console.error('카메라 권한 거부됨:', err);
        setHasPermission(false);
      }
    };

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [isOpen]);

  // 검증 성공 또는 스킵 시 후속 처리 — 스트림 정지 + onSuccess 위임
  // (ride_logs insert·토스트는 App.jsx onSuccess 콜백 단일 책임으로 통합)
  const handleSuccess = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    onSuccess?.();
    onClose();
  };

  // 헬멧 추론 완료 시 자동 통과는 제거 (2026-05-28) — 사용자 명시적 "잠금 해제"
  // 버튼 클릭이 있어야 다음 단계로 진행되도록 변경. 부정 우회·자동 통과 방지.

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1200] bg-black flex flex-col items-center justify-center animate-in fade-in relative">
      <div className="relative w-full h-full max-w-md mx-auto overflow-hidden">
        {/* 카메라 뷰 */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover z-0"
        />

        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 z-50 w-10 h-10 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white"
        >
          <X size={24} />
        </button>

        {/* 오버레이 뷰 (가이드라인) */}
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
          {/* 타겟 박스 UI */}
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 20 }}
            className={`relative w-64 h-64 border-2 border-dashed rounded-3xl flex items-center justify-center transition-colors duration-500 ${isHelmetDetected ? 'border-cyber-green' : 'border-white/50'}`}
          >
            {/* 박스 모서리 디자인 */}
            <div className={`absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 rounded-tl-3xl transition-colors duration-500 ${isHelmetDetected ? 'border-cyber-green' : 'border-cyber-cyan'}`}></div>
            <div className={`absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 rounded-tr-3xl transition-colors duration-500 ${isHelmetDetected ? 'border-cyber-green' : 'border-cyber-cyan'}`}></div>
            <div className={`absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 rounded-bl-3xl transition-colors duration-500 ${isHelmetDetected ? 'border-cyber-green' : 'border-cyber-cyan'}`}></div>
            <div className={`absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 rounded-br-3xl transition-colors duration-500 ${isHelmetDetected ? 'border-cyber-green' : 'border-cyber-cyan'}`}></div>

            {!isModelLoaded && hasPermission !== false && (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-cyber-cyan animate-spin" />
                <div className="text-cyber-cyan font-bold animate-pulse text-sm">
                  엣지 AI 모델 로딩중...
                </div>
              </div>
            )}
            {isModelLoaded && !isHelmetDetected && hasPermission !== false && (
              <div className="text-cyber-cyan font-bold text-sm bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm">
                프레임 중앙에 얼굴과 헬멧을 맞춰주세요
              </div>
            )}
            {isHelmetDetected && (
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-cyber-green font-bold text-lg bg-black/80 px-4 py-2 rounded-full backdrop-blur-md shadow-neon-green"
              >
                헬멧 인식 완료!
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* 하단 컨트롤 패널 */}
        <div className="absolute bottom-0 left-0 w-full p-8 pb-12 bg-gradient-to-t from-black via-black/80 to-transparent z-20 flex flex-col items-center">
          <motion.div
            animate={{ scale: isHelmetDetected ? [1, 1.2, 1] : 1 }}
            transition={{ duration: 0.3 }}
          >
            <ShieldCheck size={48} className={`mb-4 transition-colors duration-500 ${isHelmetDetected ? 'text-cyber-green drop-shadow-[0_0_15px_rgba(64,255,100,0.8)]' : 'text-gray-400'}`} />
          </motion.div>
          
          <h2 className="text-white font-black text-xl mb-2 drop-shadow-md">실시간 헬멧 검증 (Edge AI)</h2>

          {hasPermission !== false && (
            <div className="w-full max-w-xs mt-4 bg-black/40 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
              <div className="flex justify-between text-xs font-bold text-gray-400 mb-2">
                <span>검증 진행도</span>
                <span className={isHelmetDetected ? 'text-cyber-green' : 'text-white'}>{Math.round(detectionProgress)}%</span>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden shadow-inner">
                <motion.div
                  className={`h-full ${isHelmetDetected ? 'bg-cyber-green shadow-neon-green' : 'bg-cyber-cyan shadow-neon-cyan'}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${detectionProgress}%` }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                />
              </div>
            </div>
          )}

          {hasPermission === false && (
            <div className="mt-4 w-full max-w-xs flex flex-col items-center gap-3 bg-red-500/10 border border-red-500/30 p-4 rounded-2xl backdrop-blur-md">
              <div className="flex items-center gap-2 text-red-400">
                <AlertCircle size={20} />
                <span className="text-sm font-black">카메라 권한 거부됨</span>
              </div>
              <p className="text-xs text-red-300/80 text-center leading-tight">
                기기 설정에서 브라우저의 카메라 접근 권한을 허용해주세요. 테스트를 위해 수동으로 건너뛸 수 있습니다.
              </p>
            </div>
          )}

          {/* 🔓 잠금 해제 버튼 — isHelmetDetected=true 시 활성화. 사용자 명시적 클릭 필수 */}
          {hasPermission !== false && (
            <button
              onClick={handleSuccess}
              disabled={!isHelmetDetected}
              className={`mt-6 w-full max-w-xs py-4 rounded-2xl font-black text-base uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                isHelmetDetected
                  ? 'bg-cyber-green text-black active:scale-95 shadow-neon-green'
                  : 'bg-white/5 text-gray-600 cursor-not-allowed border border-white/10'
              }`}
            >
              {isHelmetDetected ? '🔓 잠금 해제 · 주행 시작' : '헬멧 인증 대기 중...'}
            </button>
          )}

          {/* 권한 거부 시에만 우회 버튼 노출 (테스트용 강제 통과는 제거) */}
          {hasPermission === false && (
            <button
              onClick={handleSuccess}
              className="mt-6 px-6 py-3 bg-white/5 hover:bg-white/10 active:bg-white/20 text-white/70 hover:text-white font-bold text-sm rounded-xl border border-white/10 backdrop-blur-md transition-all shadow-lg w-full max-w-xs flex items-center justify-center gap-2"
            >
              수동으로 주행 시작 (카메라 권한 거부 우회)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default HelmetDetectionCamera;
