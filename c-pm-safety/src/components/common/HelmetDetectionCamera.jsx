import React, { useRef, useEffect, useState } from 'react';
import { Camera, ShieldCheck, AlertCircle, X } from 'lucide-react';
import { useEdgeAI } from '../../hooks/useEdgeAI';
import { supabase } from '../../lib/supabaseClient';
import { useUserStore } from '../../hooks/useUserStore';
import { toast } from '../../hooks/useToast';

const HelmetDetectionCamera = ({ isOpen, onClose, onSuccess }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [hasPermission, setHasPermission] = useState(null);
  const { user } = useUserStore();

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

  // 추론 성공 시 후속 처리
  useEffect(() => {
    if (isHelmetDetected) {
      const saveDetectionResult = async () => {
        try {
          // Supabase 가벼운 JSON 페이로드 로그 전송
          // ride_logs 테이블에 INSERT (무거운 이미지 데이터 제외)
          if (user) {
            const { error } = await supabase
              .from('ride_logs')
              .insert([
                {
                  user_id: user.id,
                  is_helmet_verified: true,
                  timestamp: new Date().toISOString()
                }
              ]);

            if (error) {
              console.error('Supabase 기록 실패 (ride_logs 테이블이 없을 수도 있음, 무시):', error);
            }
          }
        } catch (err) {
          console.error('기록 에러:', err);
        }

        // 스트림 정지
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }

        toast('🛡️ 안전 인증 완료! 100P 적립', 'success');
        onSuccess?.();
        onClose();
      };

      saveDetectionResult();
    }
  }, [isHelmetDetected, user, onClose, onSuccess]);

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
          <div className="relative w-64 h-64 border-2 border-dashed border-white/50 rounded-3xl flex items-center justify-center">
            {/* 박스 모서리 디자인 */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-cyber-cyan rounded-tl-3xl"></div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-cyber-cyan rounded-tr-3xl"></div>
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-cyber-cyan rounded-bl-3xl"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-cyber-cyan rounded-br-3xl"></div>

            {!isModelLoaded && (
              <div className="text-white font-bold animate-pulse text-sm">
                엣지 AI 모델 로딩중...
              </div>
            )}
            {isModelLoaded && !isHelmetDetected && (
              <div className="text-cyber-cyan font-bold text-sm bg-black/50 px-3 py-1 rounded-full">
                프레임 중앙에 얼굴과 헬멧을 맞춰주세요
              </div>
            )}
          </div>
        </div>

        {/* 하단 컨트롤 패널 */}
        <div className="absolute bottom-0 left-0 w-full p-8 pb-12 bg-gradient-to-t from-black via-black/80 to-transparent z-20 flex flex-col items-center">
          <ShieldCheck size={48} className={`mb-4 ${isHelmetDetected ? 'text-cyber-green' : 'text-gray-400'}`} />
          <h2 className="text-white font-black text-xl mb-2">실시간 헬멧 검증 (Edge AI)</h2>

          <div className="w-full max-w-xs mt-4">
            <div className="flex justify-between text-xs font-bold text-gray-400 mb-2">
              <span>검증 진행도</span>
              <span>{Math.round(detectionProgress)}%</span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyber-cyan transition-all duration-100 ease-linear"
                style={{ width: `${detectionProgress}%` }}
              />
            </div>
          </div>

          {hasPermission === false && (
            <div className="mt-6 flex items-center gap-2 text-red-400 bg-red-400/10 px-4 py-2 rounded-xl">
              <AlertCircle size={16} />
              <span className="text-sm font-bold">카메라 권한이 필요합니다</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HelmetDetectionCamera;
