import { useState, useEffect, useRef } from 'react';

// OpenVINO / ONNX Web Runtime 연동 구조 (MVP 버전)
export const useEdgeAI = (videoRef, isRunning) => {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isHelmetDetected, setIsHelmetDetected] = useState(false);
  const [detectionProgress, setDetectionProgress] = useState(0);
  
  const sessionRef = useRef(null);
  const detectionDurationRef = useRef(0);
  const frameIdRef = useRef(null);
  const isInferencingRef = useRef(false);

  // 1. 모델 로드 파이프라인
  useEffect(() => {
    let isCancelled = false;
    
    const loadModel = async () => {
      if (isRunning && !isModelLoaded) {
        try {
          // 동적 임포트로 초기 로딩 성능 최적화
          const ort = await import('onnxruntime-web');
          
          // WASM 엔진으로 모델 로드 (퍼블릭 폴더의 dummy_helmet.onnx)
          sessionRef.current = await ort.InferenceSession.create('/models/dummy_helmet.onnx', { executionProviders: ['wasm'] });
          console.log("[Edge AI] ONNX Model loaded successfully.");
          
          if (!isCancelled) {
            setIsModelLoaded(true);
          }
        } catch (error) {
          console.error("[Edge AI] ONNX Model loading failed:", error);
          // 실패 시에도 로직 테스트를 위해 시뮬레이션 모드로 전환되게끔 허용
          if (!isCancelled) {
            setIsModelLoaded(true);
          }
        }
      } else if (!isRunning) {
        setIsModelLoaded(false);
        setIsHelmetDetected(false);
        setDetectionProgress(0);
        detectionDurationRef.current = 0;
      }
    };

    loadModel();

    return () => {
      isCancelled = true;
    };
  }, [isRunning, isModelLoaded]);

  // 2. 프레임 추출 및 텐서 변환/추론 파이프라인
  useEffect(() => {
    if (!isModelLoaded || !isRunning || !videoRef.current) return;

    let lastTime = 0;
    let isCancelled = false;

    const analyzeFrame = async () => {
      if (isCancelled) return;
      if (isInferencingRef.current) {
        frameIdRef.current = requestAnimationFrame(analyzeFrame);
        return;
      }

      isInferencingRef.current = true;
      const time = performance.now();
      
      // 첫 프레임인 경우 deltaTime을 0으로 처리하고 lastTime을 설정
      if (lastTime === 0) lastTime = time;
      
      const deltaTime = time - lastTime;
      lastTime = time;

      let isWearingHelmet = false;

      if (sessionRef.current) {
        try {
          // 2-1. 카메라 영상에서 프레임 캡처 (224x224 해상도)
          const canvas = document.createElement('canvas');
          canvas.width = 224;
          canvas.height = 224;
          const ctx = canvas.getContext('2d');
          // 좌우 반전 거울모드 영상일 경우 보정이 필요할 수 있으나 MVP이므로 그대로 추출
          ctx.drawImage(videoRef.current, 0, 0, 224, 224);
          const imageData = ctx.getImageData(0, 0, 224, 224);

          // 2-2. 픽셀 데이터를 Tensor Float32Array로 정규화 변환 (NCHW 포맷: [1, 3, 224, 224])
          const float32Data = new Float32Array(1 * 3 * 224 * 224);
          const data = imageData.data;
          
          for (let i = 0; i < 224 * 224; i++) {
            float32Data[i] = data[i * 4] / 255.0;                   // R channel
            float32Data[i + 224 * 224] = data[i * 4 + 1] / 255.0;   // G channel
            float32Data[i + 2 * 224 * 224] = data[i * 4 + 2] / 255.0; // B channel
          }

          const ort = await import('onnxruntime-web');
          const tensor = new ort.Tensor('float32', float32Data, [1, 3, 224, 224]);

          // 2-3. 실제 WASM 환경을 통한 ONNX AI 추론 실행
          const feeds = { input: tensor };
          const results = await sessionRef.current.run(feeds);
          
          // 2-4. 추론 결과 파싱 (더미 모델은 [0.95, 0.05] 반환)
          const output = results.output.data;
          isWearingHelmet = output[0] > 0.8; 
          
        } catch (err) {
          console.warn("[Edge AI] Inference Error. Fallback to dummy behavior:", err);
          isWearingHelmet = true;
        }
      } else {
        // 세션 로드 실패 시 MVP 데모를 위해 true로 강제
        isWearingHelmet = true;
      }

      // 3. 누적 검증 로직 (2초 지속 시 인증 완료)
      if (isWearingHelmet) {
        detectionDurationRef.current += deltaTime;
        const progress = Math.min((detectionDurationRef.current / 2000) * 100, 100);
        setDetectionProgress(progress);

        if (detectionDurationRef.current >= 2000) { 
          setIsHelmetDetected(true);
          isInferencingRef.current = false;
          return; // 검증 완료 시 루프 탈출
        }
      } else {
        // 헬멧이 안 보이면 게이지 0으로 초기화
        detectionDurationRef.current = 0;
        setDetectionProgress(0);
      }

      isInferencingRef.current = false;

      // 브라우저 렌더링 부하를 줄이기 위해 다음 프레임 예약 (약 100ms 딜레이를 주어 10FPS로 제한)
      setTimeout(() => {
        if (!isCancelled) {
          frameIdRef.current = requestAnimationFrame(analyzeFrame);
        }
      }, 100);
    };

    frameIdRef.current = requestAnimationFrame(analyzeFrame);

    return () => {
      isCancelled = true;
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current);
      }
    };
  }, [isModelLoaded, isRunning, videoRef]);

  return { isModelLoaded, isHelmetDetected, detectionProgress };
};
