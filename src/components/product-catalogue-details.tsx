"use client";

import { Image, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";

import { formatDeliveryDaysShort, formatDeliveryWindow } from "@/lib/delivery-display";
import { formatKobo } from "@/lib/format";
import { formatTierRange } from "@/lib/product-display";
import type { Product, QtyTier } from "@/lib/types";

const tierColumns: ColumnsType<QtyTier> = [
  { title: "Range", key: "range", width: 100, render: (_, t) => formatTierRange(t) },
  {
    title: "Unit price",
    dataIndex: "unitPriceKobo",
    key: "price",
    render: (k: number) => formatKobo(k),
  },
  {
    title: "Lead time",
    dataIndex: "deliveryDays",
    key: "days",
    width: 88,
    render: (d: number) => formatDeliveryDaysShort(d ?? 0),
  },
  {
    title: "Est. delivery",
    key: "est",
    render: (_, t) => {
      const text = formatDeliveryWindow(t.deliveryDays ?? 0);
      return text ? (
        <span className="text-xs leading-snug text-neutral-600">{text}</span>
      ) : (
        "—"
      );
    },
  },
];

export function ProductCatalogueExpandedRow({ product }: { product: Product }) {
  return (
    <div className="grid gap-6 py-2 lg:grid-cols-2">
      <section>
        <h3 className="mb-2 text-sm font-semibold text-neutral-800">Pricing by size</h3>
        <div className="flex flex-col gap-4">
          {product.sizes.length === 0 ? (
            <p className="text-sm text-neutral-500">No sizes configured.</p>
          ) : (
            product.sizes.map((sv) => (
              <div key={sv.code} className="rounded-md border border-neutral-200 bg-white">
                <p className="border-b border-neutral-100 px-3 py-2 text-sm font-medium">Size {sv.code}</p>
                <Table
                  size="small"
                  pagination={false}
                  rowKey={(t, i) => `${sv.code}-${i}`}
                  dataSource={sv.tiers}
                  columns={tierColumns}
                />
              </div>
            ))
          )}
        </div>
      </section>
      <section>
        <h3 className="mb-2 text-sm font-semibold text-neutral-800">Colors & images</h3>
        {product.colorImages?.length ? (
          <ul className="space-y-3">
            {product.colorImages.map((ci) => (
              <li key={ci.color} className="flex items-center gap-3 rounded-md border border-neutral-200 bg-white p-2">
                <Image
                  src={ci.imageUrl}
                  alt={ci.color}
                  width={56}
                  height={56}
                  className="rounded object-cover"
                  style={{ objectFit: "cover" }}
                  preview={{ mask: "View" }}
                />
                <span className="text-sm font-medium capitalize">{ci.color}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-neutral-500">No color images.</p>
        )}
        {product.description ? (
          <p className="mt-4 text-sm text-neutral-600 line-clamp-4">{product.description}</p>
        ) : null}
      </section>
    </div>
  );
}

export function ProductCatalogueThumb({ product }: { product: Product }) {
  const url = product.colorImages?.[0]?.imageUrl;
  if (!url) {
    return <span className="text-xs text-neutral-400">—</span>;
  }
  return (
    <Image
      src={url}
      alt={product.title}
      width={48}
      height={48}
      className="rounded object-cover"
      style={{ objectFit: "cover" }}
      preview={{ mask: "View" }}
    />
  );
}

export function ProductColorTags({ colors }: { colors: string[] }) {
  if (!colors.length) return <span className="text-neutral-400">—</span>;
  return (
    <div className="flex max-w-[200px] flex-wrap gap-1">
      {colors.map((c) => (
        <Tag key={c} className="m-0 capitalize">
          {c}
        </Tag>
      ))}
    </div>
  );
}

export function ProductSizeTags({ product }: { product: Product }) {
  const codes = product.sizes.map((s) => s.code);
  if (!codes.length) return <span className="text-neutral-400">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {codes.map((c) => (
        <Tag key={c} className="m-0">
          {c}
        </Tag>
      ))}
    </div>
  );
}
