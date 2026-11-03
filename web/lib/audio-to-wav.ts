"use client";

const TARGET_RATE = 16000;

/**
 * Convert a recorded audio blob (e.g. MediaRecorder webm) to 16 kHz mono
 * PCM16 WAV, the container Meta's transcribe endpoint requires. Pure Web
 * Audio — no libraries, no uploads until the caller sends the result.
 */
export async function blobToWav16k(blob: Blob): Promise<Blob> {
  const Ctx = window.OfflineAudioContext;
  const probe = new Ctx(1, TARGET_RATE, TARGET_RATE);
  const decoded = await probe.decodeAudioData(await blob.arrayBuffer());
  const length = Math.max(1, Math.floor(decoded.duration * TARGET_RATE));
  const offline = new Ctx(1, length, TARGET_RATE);
  const src = offline.createBufferSource();
  src.buffer = decoded;
  src.connect(offline.destination);
  src.start();
  const rendered = await offline.startRendering();
  return new Blob([encodeWav(rendered.getChannelData(0), TARGET_RATE)], { type: "audio/wav" });
}

function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeString = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}
