// 마이크 입력 관리: getUserMedia + AnalyserNode 래퍼

export interface MicSession {
  audioContext: AudioContext;
  sampleRate: number;
  /** 최신 시간 영역 샘플을 내부 버퍼에 채워 돌려준다 */
  readFrame(): Float32Array;
  /** 기준음 재생용 (가이드 테스트) */
  playTone(freq: number, durationSec: number): Promise<void>;
  stop(): void;
}

export async function openMic(): Promise<MicSession> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('이 브라우저는 마이크 입력을 지원하지 않습니다.');
  }
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    },
  });

  const audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(stream);
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 4096;
  source.connect(analyser);

  const buffer = new Float32Array(analyser.fftSize);

  return {
    audioContext,
    sampleRate: audioContext.sampleRate,
    readFrame() {
      analyser.getFloatTimeDomainData(buffer);
      return buffer;
    },
    playTone(freq: number, durationSec: number) {
      return new Promise<void>((resolve) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const now = audioContext.currentTime;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.4, now + 0.05);
        gain.gain.setValueAtTime(0.4, now + durationSec - 0.1);
        gain.gain.linearRampToValueAtTime(0, now + durationSec);
        osc.connect(gain).connect(audioContext.destination);
        osc.start(now);
        osc.stop(now + durationSec);
        osc.onended = () => resolve();
      });
    },
    stop() {
      stream.getTracks().forEach((t) => t.stop());
      void audioContext.close();
    },
  };
}
