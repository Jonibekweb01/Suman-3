import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomSheet, IconQr } from '../../shared/ui';

interface BarcodeDetectorLike {
  detect: (source: CanvasImageSource) => Promise<Array<{ rawValue: string }>>;
}
type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => BarcodeDetectorLike;

function getDetectorCtor(): BarcodeDetectorCtor | null {
  if (typeof window === 'undefined') return null;
  return (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector ?? null;
}

/** True only where a scan can actually succeed — used to gate the trigger. */
export function isScannerSupported(): boolean {
  return getDetectorCtor() !== null && typeof navigator?.mediaDevices?.getUserMedia === 'function';
}

/**
 * In-app QR / barcode scanner.
 *
 * Resolves a scanned value to a route: a full URL from our own origin is
 * followed by pathname, and a bare token is treated as a product id. Anything
 * pointing off-origin is deliberately NOT navigated to — a QR code is
 * attacker-supplied input, and following it blindly turns the scanner into an
 * open redirect.
 */
export function ScannerSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    const Detector = getDetectorCtor();
    if (!Detector) {
      setError('This browser cannot scan codes. Try Chrome on Android.');
      return;
    }

    let stream: MediaStream | null = null;
    let frame = 0;
    let stopped = false;
    const detector = new Detector({ formats: ['qr_code', 'ean_13', 'code_128'] });

    async function begin(): Promise<void> {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (stopped) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        scan();
      } catch {
        setError('Camera access was blocked. Enable it in your browser settings.');
      }
    }

    function scan(): void {
      const video = videoRef.current;
      if (stopped || !video || video.readyState < 2) {
        frame = requestAnimationFrame(scan);
        return;
      }

      detector
        .detect(video)
        .then((codes) => {
          const value = codes[0]?.rawValue;
          if (!value) {
            frame = requestAnimationFrame(scan);
            return;
          }
          stopped = true;
          resolveCode(value);
        })
        .catch(() => {
          frame = requestAnimationFrame(scan);
        });
    }

    function resolveCode(value: string): void {
      let target = `/product/${encodeURIComponent(value)}`;

      if (/^https?:\/\//i.test(value)) {
        try {
          const url = new URL(value);
          // Same-origin only — see the open-redirect note above.
          if (url.origin !== window.location.origin) {
            setError('That code points to another site, so it was not opened.');
            return;
          }
          target = url.pathname + url.search;
        } catch {
          setError('That code could not be read as a link.');
          return;
        }
      }

      onClose();
      navigate(target);
    }

    void begin();

    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
      setError(null);
    };
  }, [open, navigate, onClose]);

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Scan a code"
      description="Point your camera at a product QR or barcode."
      maxHeight="half"
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-slate-900">
        <video ref={videoRef} muted playsInline className="size-full object-cover" />

        {/* Reticle */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="size-48 rounded-3xl border-2 border-white/70 shadow-[0_0_0_100vmax_rgb(15_23_42/0.45)]" />
        </div>

        {error && (
          <div className="absolute inset-0 grid place-items-center bg-slate-900/85 p-6 text-center">
            <div className="space-y-2">
              <IconQr size={28} className="mx-auto text-white/60" />
              <p className="text-sm font-semibold text-white">{error}</p>
            </div>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
