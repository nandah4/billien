"use client";

import Image, { type StaticImageData } from "next/image";
import type { ReactNode } from "react";

const IMAGE_SIZES = {
  sm: { className: "h-20", sizes: "80px" },
  md: { className: "h-28", sizes: "112px" },
  lg: { className: "h-36", sizes: "144px" },
} as const;

/**
 * Shared empty / invitation state: a 3D illustration, a short title, one line of
 * explanation, and an optional action. The illustrations are decorative, so the
 * alt text stays empty and the copy carries the meaning.
 */
export function EmptyState({
  image,
  title,
  description,
  action,
  size = "md",
  className = "",
}: {
  image: StaticImageData;
  title: string;
  description: string;
  action?: ReactNode;
  size?: keyof typeof IMAGE_SIZES;
  className?: string;
}) {
  const preset = IMAGE_SIZES[size];

  return (
    <div
      className={`flex flex-col items-center text-center ${className}`.trim()}
    >
      <Image
        src={image}
        alt=""
        aria-hidden="true"
        sizes={preset.sizes}
        className={`${preset.className} w-auto object-contain`}
      />
      <h3 className="mt-3 text-[14px] leading-tight font-semibold text-ink">
        {title}
      </h3>
      <p className="mt-1.5 max-w-xs text-[12px] leading-relaxed text-muted">
        {description}
      </p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
