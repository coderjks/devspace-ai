"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export type ProviderStatus = {
  provider: string;
  mock: boolean;
  model: string;
  stt_mock: boolean;
  tts_mock: boolean;
};

/** Live model/STT/TTS capability. Null while loading or unreachable. */
export function useProviderStatus() {
  const [status, setStatus] = useState<ProviderStatus | null>(null);
  useEffect(() => {
    let cancelled = false;
    api<ProviderStatus>("/api/agents/provider")
      .then((s) => {
        if (!cancelled) setStatus(s);
      })
      .catch(() => {
        if (!cancelled) setStatus(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return status;
}
