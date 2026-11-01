"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

/** QR code rendered on an always-white tile so scanners read it in any theme. */
export function CertificateQR({ value, size = 160 }: { value: string; size?: number }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(value, { width: size * 2, margin: 2 })
      .then((url) => {
        if (!cancelled) setSrc(url);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });
    return () => {
      cancelled = true;
    };
  }, [value, size]);

  if (src === null) {
    return (
      <span className="inline-block rounded-lg bg-white p-2" role="status" aria-label="Generating QR code…">
        <span className="block animate-pulse bg-muted" style={{ width: size, height: size }} aria-hidden />
      </span>
    );
  }
  return (
    <span className="inline-block rounded-lg bg-white p-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} width={size} height={size} alt="QR code linking to this certificate's public verification page" />
    </span>
  );
}
