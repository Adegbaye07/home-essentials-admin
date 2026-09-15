"use client";

import { useRef } from "react";
import { Image, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";

import { isCleaningCategory } from "@/lib/constants";
import { formatKobo } from "@/lib/format";
import { productPrimaryMedia } from "@/lib/product-display";
import type { Product, SizePricing } from "@/lib/types";

const sizePricingColumns: ColumnsType<SizePricing> = [
  { title: "Size", dataIndex: "size", key: "size" },
  {
    title: "Piece",
    dataIndex: "piecePriceKobo",
    key: "piece",
    render: (k: number) => formatKobo(k),
  },
  {
    title: "Bundle",
    dataIndex: "bundlePriceKobo",
    key: "bundle",
    render: (k: number) => formatKobo(k),
  },
  {
    title: "Per bundle",
    dataIndex: "piecesPerBundle",
    key: "ppb",
    width: 100,
    render: (n: number) => `${n} pcs`,
  },
];

export function ProductCatalogueExpandedRow({ product }: { product: Product }) {
  const cleaning = isCleaningCategory(product.category);
  const videoUrl = product.videoUrl?.trim();

  return (
    <div className="grid gap-6 py-2 lg:grid-cols-2">
      <section>
        <h3 className="mb-2 text-sm font-semibold text-neutral-800">Pricing</h3>
        {cleaning ? (
          product.cleaningPricing ? (
            <div className="rounded-md border border-neutral-200 bg-white p-3 text-sm">
              <p>
                <span className="text-neutral-500">Piece: </span>
                {formatKobo(product.cleaningPricing.piecePriceKobo)}
              </p>
              <p className="mt-1">
                <span className="text-neutral-500">Dozen (12): </span>
                {formatKobo(product.cleaningPricing.dozenPriceKobo)}
              </p>
            </div>
          ) : (
            <p className="text-sm text-neutral-500">No cleaning pricing.</p>
          )
        ) : (product.sizePricings?.length ?? 0) > 0 ? (
          <Table
            size="small"
            pagination={false}
            rowKey={(r) => r.size}
            dataSource={product.sizePricings}
            columns={sizePricingColumns}
            className="rounded-md border border-neutral-200 bg-white"
          />
        ) : (
          <p className="text-sm text-neutral-500">No sizes configured.</p>
        )}
        <p className="mt-3 text-xs text-neutral-500">
          Delivery: 1–3 business days (Mon–Sat)
        </p>
      </section>
      <section>
        {videoUrl ? (
          <div className="mb-4">
            <h3 className="mb-2 text-sm font-semibold text-neutral-800">Authenticity video</h3>
            <video
              src={videoUrl}
              className="max-h-48 w-full max-w-xs rounded-md border border-neutral-200 bg-black object-contain"
              muted
              playsInline
              autoPlay
              loop
              controls
            />
          </div>
        ) : null}
        <h3 className="mb-2 text-sm font-semibold text-neutral-800">Variants & images</h3>
        {product.variantImages?.length ? (
          <ul className="space-y-3">
            {product.variantImages.map((vi) => (
              <li
                key={vi.variant}
                className="flex items-center gap-3 rounded-md border border-neutral-200 bg-white p-2"
              >
                <Image
                  src={vi.imageUrl}
                  alt={vi.variant}
                  width={56}
                  height={56}
                  className="rounded object-cover"
                  style={{ objectFit: "cover" }}
                  preview={{ mask: "View" }}
                />
                <span className="text-sm font-medium capitalize">{vi.variant}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-neutral-500">No variant images.</p>
        )}
        {product.description ? (
          <p className="mt-4 line-clamp-4 text-sm text-neutral-600">{product.description}</p>
        ) : null}
      </section>
    </div>
  );
}

function CatalogueVideoThumb({ src, title }: { src: string; title: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  return (
    <video
      ref={ref}
      src={src}
      title={title}
      className="h-12 w-12 rounded object-cover"
      muted
      playsInline
      preload="metadata"
      onMouseEnter={() => {
        const el = ref.current;
        if (!el) return;
        void el.play().catch(() => {});
      }}
      onMouseLeave={() => {
        const el = ref.current;
        if (!el) return;
        el.pause();
        el.currentTime = 0;
      }}
    />
  );
}

export function ProductCatalogueThumb({ product }: { product: Product }) {
  const media = productPrimaryMedia(product);
  if (!media) {
    return <span className="text-xs text-neutral-400">—</span>;
  }
  if (media.kind === "video") {
    return <CatalogueVideoThumb src={media.url} title={product.title} />;
  }
  return (
    <Image
      src={media.url}
      alt={product.title}
      width={48}
      height={48}
      className="rounded object-cover"
      style={{ objectFit: "cover" }}
      preview={{ mask: "View" }}
    />
  );
}

export function ProductVariantTags({ variants }: { variants: string[] }) {
  if (!variants.length) return <span className="text-neutral-400">—</span>;
  return (
    <div className="flex max-w-[200px] flex-wrap gap-1">
      {variants.map((v) => (
        <Tag key={v} className="m-0 capitalize">
          {v}
        </Tag>
      ))}
    </div>
  );
}

export function ProductSizeTags({ product }: { product: Product }) {
  if (isCleaningCategory(product.category)) {
    return <Tag className="m-0">piece / dozen</Tag>;
  }
  const sizes = product.sizePricings?.map((s) => s.size) ?? [];
  if (!sizes.length) return <span className="text-neutral-400">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {sizes.map((s) => (
        <Tag key={s} className="m-0">
          {s}
        </Tag>
      ))}
    </div>
  );
}
