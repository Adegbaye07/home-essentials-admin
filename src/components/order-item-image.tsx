"use client";

import { Image } from "antd";

export function OrderItemImage({ src, alt }: { src?: string; alt: string }) {
  if (!src) {
    return <span className="text-neutral-400">—</span>;
  }
  return (
    <Image
      src={src}
      alt={alt}
      width={48}
      height={48}
      className="rounded object-cover"
      style={{ objectFit: "cover" }}
      preview={{ mask: "View" }}
    />
  );
}
