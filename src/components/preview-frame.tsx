"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type PreviewFrameProps = {
  src: string | null | undefined;
  alt?: string;
  className?: string;
  priority?: boolean;
  fallback: ReactNode;
  /** Called when the remote image fails — useful to hide marquee slides */
  onFail?: () => void;
  /** Default contain so OG cards never clip. Cover only when explicitly needed. */
  fit?: "cover" | "contain";
  position?: "center" | "top";
};

/** Stable media frame for OG / social card images. */
export function PreviewFrame({
  src,
  alt = "",
  className,
  priority = false,
  fallback,
  onFail,
  fit = "cover",
  position = "center",
}: PreviewFrameProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const showImage = Boolean(src?.trim()) && !failed;

  const [prevSrc, setPrevSrc] = useState(src);
  if (prevSrc !== src) {
    setPrevSrc(src);
    setFailed(false);
    setLoaded(false);
  }

  useEffect(() => {
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [src, showImage]);

  if (!showImage) {
    return (
      <div className={cn("preview-frame preview-frame-fallback", className)}>
        {fallback}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "preview-frame",
        loaded ? "preview-frame-ready" : "preview-frame-pending",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={src!}
        alt={alt}
        className={cn(
          "preview-frame-img",
          fit === "cover" && "preview-frame-img-cover",
          fit === "contain" && "preview-frame-img-contain",
          position === "top" && "preview-frame-img-top",
        )}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
        referrerPolicy="origin-when-cross-origin"
        onLoad={() => setLoaded(true)}
        onError={() => {
          setFailed(true);
          onFail?.();
        }}
      />
    </div>
  );
}
