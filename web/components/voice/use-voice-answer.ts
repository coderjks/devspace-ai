"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE } from "@/lib/utils";
import { api } from "@/lib/api";

/**
 * Per-answer dictation backed by the real voice pipeline (session → turn →
 * transcript). The transcript always lands in an editable field — voice never
 * submits anything by itself. Consent is captured inline before the mic opens.
 */
export function useVoiceAnswer(onTranscript: (key: string, text: string) => void) {
  const [consented, setConsented] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [recordingKey, setRecordingKey] = useState<string | null>(null);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [secs, setSecs] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const keyRef = useRef<string | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  useEffect(
    () => () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    },
    []
  );

  const stopTracks = useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    setRecordingKey(null);
    setMicStream(null);
    keyRef.current = null;
  }, []);

  const upload = useCallback(
    async (blob: Blob) => {
      const sid = sessionId;
      const key = keyRef.current;
      stopTracks();
      if (!sid || !key) return;
      if (blob.size === 0) {
        setError("Nothing was recorded — check the microphone and try again, or type instead.");
        return;
      }
      setBusy(true);
      setError(null);
      try {
        const form = new FormData();
        form.append("audio", blob, "turn.webm");
        const res = await fetch(`${API_BASE}/api/voice/sessions/${sid}/turns`, {
          method: "POST",
          body: form,
          credentials: "include",
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail ?? `Upload failed (${res.status})`);
        const turn = (await res.json()) as { transcript: string };
        if (turn.transcript.trim()) onTranscriptRef.current(key, turn.transcript.trim());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Transcription failed — type instead.");
      } finally {
        setBusy(false);
      }
    },
    [sessionId, stopTracks]
  );

  const toggleRecord = useCallback(
    async (key: string) => {
      if (recordingKey === key) {
        recorderRef.current?.stop();
        return;
      }
      setError(null);
      let sid = sessionId;
      if (!sid) {
        setBusy(true);
        try {
          const s = await api<{ id: string }>("/api/voice/sessions", {
            method: "POST",
            body: JSON.stringify({ persona: "scrum-master", language_hint: "en", consent: true }),
          });
          sid = s.id;
          setSessionId(sid);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Could not start voice session");
          setBusy(false);
          return;
        }
        setBusy(false);
      }
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        setError("Microphone permission was denied. Allow access in the browser, or type instead.");
        return;
      }
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => upload(new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" }));
      recorderRef.current = rec;
      keyRef.current = key;
      rec.start();
      setMicStream(stream);
      setRecordingKey(key);
      setSecs(0);
      timerRef.current = window.setInterval(() => setSecs((s) => s + 1), 1000);
    },
    [recordingKey, sessionId, upload]
  );

  return { consented, setConsented, recordingKey, micStream, secs, busy, error, toggleRecord, stopTracks };
}
