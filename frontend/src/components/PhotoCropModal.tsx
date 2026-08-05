"use client";

import { PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from "react";
import { Button } from "@/src/components/ui";

// Shown after a file is picked for any profile photo (student self-service,
// student's photo-change request, and every other role's header avatar) —
// lets the person drag to choose which part of their photo ends up in the
// circular crop, instead of the old behavior of always taking a fixed
// center-square (which cuts off faces on a tall/portrait photo — see
// downscalePhoto, which this replaces for interactive uploads).
const DISPLAY_SIZE = 280;
const OUTPUT_SIZE = 400;

interface LoadedImage {
  img: HTMLImageElement;
  naturalW: number;
  naturalH: number;
  minSide: number;
}

function loadImage(file: File): Promise<LoadedImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        resolve({ img, naturalW: img.naturalWidth, naturalH: img.naturalHeight, minSide: Math.min(img.naturalWidth, img.naturalHeight) });
      };
      img.onerror = () => reject(new Error("Could not read image"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.readAsDataURL(file);
  });
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function PhotoCropModal({
  file,
  onCancel,
  onConfirm,
}: {
  file: File;
  onCancel: () => void;
  onConfirm: (dataUrl: string) => void;
}) {
  const [loaded, setLoaded] = useState<LoadedImage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [center, setCenter] = useState({ x: 0, y: 0 }); // natural-image pixel coords
  const dragRef = useRef<{ startX: number; startY: number; centerX: number; centerY: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadImage(file)
      .then((info) => {
        if (cancelled) return;
        setLoaded(info);
        setCenter({ x: info.naturalW / 2, y: info.naturalH / 2 });
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not read image"));
    return () => {
      cancelled = true;
    };
  }, [file]);

  const cropSize = loaded ? loaded.minSide : 0;
  const displayScale = loaded && cropSize ? DISPLAY_SIZE / cropSize : 1;

  function clampCenter(x: number, y: number, size: number, w: number, h: number) {
    const half = size / 2;
    // If the crop is larger than the image on an axis (can't happen since
    // size is always the image's own min side, but keeps this safe against
    // an inverted min > max range regardless), just center it on that axis.
    return {
      x: size >= w ? w / 2 : clamp(x, half, w - half),
      y: size >= h ? h / 2 : clamp(y, half, h - half),
    };
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (!loaded) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, centerX: center.x, centerY: center.y };
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragRef.current || !loaded) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const ratio = cropSize / DISPLAY_SIZE;
    const next = clampCenter(
      dragRef.current.centerX - dx * ratio,
      dragRef.current.centerY - dy * ratio,
      cropSize,
      loaded.naturalW,
      loaded.naturalH
    );
    setCenter(next);
  }

  function handlePointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    if (dragRef.current) e.currentTarget.releasePointerCapture(e.pointerId);
    dragRef.current = null;
  }

  function handleConfirm() {
    if (!loaded) return;
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const half = cropSize / 2;
    ctx.drawImage(loaded.img, center.x - half, center.y - half, cropSize, cropSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    onConfirm(canvas.toDataURL("image/jpeg", 0.9));
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-[rgba(5,13,31,0.85)] backdrop-blur-sm">
      <div className="w-[90%] max-w-[380px] rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
        <h3 className="mb-1 text-[15px] font-bold text-[var(--white)]">Position Your Photo</h3>
        <p className="mb-4 text-xs text-[var(--muted)]">
          Drag the photo to center it the way you want.
        </p>
        {error && <p className="mb-3 text-xs text-[var(--err)]">{error}</p>}
        {loaded && (
          <div
            className="mx-auto mb-4 overflow-hidden rounded-full border-2 border-[var(--orange)]"
            style={{ width: DISPLAY_SIZE, height: DISPLAY_SIZE, touchAction: "none", cursor: "grab" }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <img
              src={loaded.img.src}
              alt="Preview"
              draggable={false}
              className="pointer-events-none select-none"
              style={{
                position: "relative",
                maxWidth: "none",
                width: loaded.naturalW * displayScale,
                height: loaded.naturalH * displayScale,
                left: -(center.x - cropSize / 2) * displayScale,
                top: -(center.y - cropSize / 2) * displayScale,
              }}
            />
          </div>
        )}
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" variant="primary" onClick={handleConfirm} disabled={!loaded}>
            Use This Photo
          </Button>
        </div>
      </div>
    </div>
  );
}
