"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Messenger-style voice waveform. When a live mic `stream` is provided, bar
 * heights follow the real input amplitude via AnalyserNode; otherwise the
 * bars idle on a CSS animation (or freeze under prefers-reduced-motion).
 */
export function VoiceWaveform({
  stream,
  bars = 24,
  className,
}: {
  stream: MediaStream | null;
  bars?: number;
  className?: string;
}) {
  const barRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    if (!stream) return;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    let alive = true;
    let raf = 0;
    const ctx = new Ctor();
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    analyser.smoothingTimeConstant = 0.75;
    src.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      if (!alive) return;
      analyser.getByteFrequencyData(data);
      const n = barRefs.current.length || 1;
      barRefs.current.forEach((el, i) => {
        if (!el) return;
        const v = data[Math.floor((i / n) * data.length)] / 255;
        el.style.transform = `scaleY(${(0.18 + v * 0.82).toFixed(3)})`;
      });
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      src.disconnect();
      ctx.close().catch(() => undefined);
    };
  }, [stream]);

  return (
    <span aria-hidden className={cn("flex h-6 items-center gap-[3px]", className)}>
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          ref={(el) => {
            barRefs.current[i] = el;
          }}
          style={{ animationDelay: `${(i % 7) * 0.12}s`, height: `${30 + ((i * 37) % 70)}%` }}
          className={cn("w-[3px] origin-center rounded-full bg-current", !stream && "animate-voice-bar")}
        />
      ))}
    </span>
  );
}
