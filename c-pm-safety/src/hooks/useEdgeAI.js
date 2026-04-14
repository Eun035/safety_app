import { useState, useEffect, useRef } from 'react';

// OpenVINO / ONNX Web Runtime 연동 구조 (Mock 구현)
export const useEdgeAI = (videoRef, isRunning) => {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isHelmetDetected, setIsHelmetDetected] = useState(false);
  const [detectionProgress, setDetectionProgress] = useState(0);
  
  const detectionDurationRef = useRef(0);
  const frameIdRef = useRef(null);

  useEffect(() => {
    // 모델 로딩 시뮬레이션
    let loadTimer;
    if (isRunning) {
      loadTimer = setTimeout(() => {
        setIsModelLoaded(true);
      }, 1500); // 1.5초 후 로딩 완료
    } else {
      setIsModelLoaded(false);
      setIsHelmetDetected(false);
      setDetectionProgress(0);
      detectionDurationRef.current = 0;
    }
    
    return () => clearTimeout(loadTimer);
  }, [isRunning]);

  useEffect(() => {
    if (!isModelLoaded || !isRunning || !videoRef.current) return;

    // TODO: 실제 OpenVINO WASM 런타임 초기화 및 세션 로드 위치
    // import * as ort from 'onnxruntime-web';
    // const session = await ort.InferenceSession.create('helmet_detection.onnx', { executionProviders: ['wasm'] });
    
    let lastTime = performance.now();

    const analyzeFrame = (time) => {
      const deltaTime = time - lastTime;
      lastTime = time;

      // TODO: 실제 프레임 추출 및 텐서 변환, 추론 실행 위치
      // const canvas = document.createElement('canvas');
      // canvas.width = 224; canvas.height = 224;
      // const ctx = canvas.getContext('2d');
      // ctx.drawImage(videoRef.current, 0, 0, 224, 224);
      // const tensor = imageToTensor(ctx.getImageData(0,0,224,224));
      // const results = await session.run({ images: tensor });
      // const isWearingHelmet = results.output[0] > 0.8;
      
      // 가라 추론 (랜덤으로 헬멧 착용 상태 감지 시뮬레이션 - 데모를 위해 항상 시간이 지나면 확률이 오르도록)
      const isWearingHelmet = true; // 시뮬레이션: 항상 착용 중이라고 가정

      if (isWearingHelmet) {
        detectionDurationRef.current += deltaTime;
        const progress = Math.min((detectionDurationRef.current / 2000) * 100, 100);
        setDetectionProgress(progress);

        if (detectionDurationRef.current >= 2000) { // 2초 이상 감지됨
          setIsHelmetDetected(true);
          return; // 감지 완료 시 추가 프레임 분석 중지
        }
      } else {
        // 감지 끊기면 초기화
        detectionDurationRef.current = 0;
        setDetectionProgress(0);
      }

      frameIdRef.current = requestAnimationFrame(analyzeFrame);
    };

    frameIdRef.current = requestAnimationFrame(analyzeFrame);

    return () => {
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current);
      }
    };
  }, [isModelLoaded, isRunning, videoRef]);

  return { isModelLoaded, isHelmetDetected, detectionProgress };
};
