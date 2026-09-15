"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Modal, Select, Space, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";

import { AdminShell, AdminNewProductButton } from "@/components/admin-shell";
import {
  ProductCatalogueExpandedRow,
  ProductCatalogueThumb,
  ProductSizeTags,
  ProductVariantTags,
} from "@/components/product-catalogue-details";
import { categoryLabel, PRODUCT_CATEGORIES } from "@/lib/constants";
import { listProducts, deleteProduct, ApiError } from "@/lib/api";
import type { Product } from "@/lib/types";
import { formatKobo } from "@/lib/format";
import { productPriceRangeKobo } from "@/lib/product-display";
import { useAppMessage } from "@/hooks/use-app-message";
import { useIsMdUp } from "@/hooks/use-media-query";

function formatPriceRange(product: Product): string {
  const range = productPriceRangeKobo(product);
  if (!range) return "—";
  if (range.min === range.max) return formatKobo(range.min);
  return `${formatKobo(range.min)} – ${formatKobo(range.max)}`;
}

export default function ProductsPage() {
  const message = useAppMessage();
  const isMdUp = useIsMdUp();
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string | undefined>();
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  async function load() {
    setLoading(true);
    try {
      const data = await listProducts({
        category,
        active: activeFilter,
        page,
        page_size: pageSize,
      });
      setItems(data.items);
      setTotal(data.metadata.total_items);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setPage(1);
  }, [category, activeFilter]);

  useEffect(() => {
    void load();
  }, [category, activeFilter, page, pageSize]);

  function confirmDelete(record: Product) {
    Modal.confirm({
      title: "Delete product?",
      content: `Remove “${record.title}” from the catalogue. This cannot be undone.`,
      okText: "Delete",
      okType: "danger",
      cancelText: "Cancel",
      onOk: async () => {
        try {
          await deleteProduct(record.id);
          message.success("Product deleted");
          await load();
        } catch (e) {
          if (e instanceof ApiError && (e.status === 409 || e.status === 400)) {
            message.error(e.message);
            return;
          }
          message.error(
            e instanceof Error ? e.message : "Failed to delete product",
          );
        }
      },
    });
  }

  const columns: ColumnsType<Product> = [
    {
      title: "",
      key: "thumb",
      width: 56,
      fixed: isMdUp ? "left" : undefined,
      render: (_, record) => <ProductCatalogueThumb product={record} />,
    },
    {
      title: "Title",
      dataIndex: "title",
      key: "title",
      ellipsis: true,
      width: 160,
      fixed: isMdUp ? "left" : undefined,
    },
    {
      title: "Category",
      dataIndex: "category",
      key: "category",
      width: 160,
      responsive: ["md"],
      render: (c: string) => categoryLabel(c),
    },
    {
      title: "Variants",
      key: "variants",
      width: 200,
      render: (_, record) => <ProductVariantTags variants={record.variants} />,
    },
    {
      title: "Sizes / units",
      key: "sizes",
      width: 160,
      render: (_, record) => <ProductSizeTags product={record} />,
    },
    {
      title: "Price range",
      key: "prices",
      width: 160,
      className: "whitespace-nowrap text-sm",
      render: (_, record) => (
        <span title="Min–max across piece/bundle or piece/dozen prices">
          {formatPriceRange(record)}
        </span>
      ),
    },
    {
      title: "Active",
      dataIndex: "active",
      key: "active",
      width: 80,
      className: "whitespace-nowrap",
      render: (active: boolean) =>
        active ? <Tag color="green">Yes</Tag> : <Tag>No</Tag>,
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      className: "whitespace-nowrap",
      fixed: isMdUp ? "right" : undefined,
      render: (_, record) => (
        <Space size="small">
          <Link
            href={`/products/${record.id}/edit`}
            className="font-medium underline-offset-2 hover:underline"
          >
            Edit
          </Link>
          <Button
            type="link"
            danger
            size="small"
            className="px-0"
            onClick={() => confirmDelete(record)}
          >
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <AdminShell
      contentWidth="wide"
      title="Catalogue"
      extra={<AdminNewProductButton />}
    >
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
            Category
          </label>
          <Select
            className="w-full"
            value={category ?? "all"}
            showSearch
            optionFilterProp="label"
            onChange={(v) => {
              if (v === "all") setCategory(undefined);
              else setCategory(v);
            }}
            options={[
              { value: "all", label: "All" },
              ...PRODUCT_CATEGORIES.map((c) => ({
                value: c.value,
                label: c.label,
              })),
            ]}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
            Status
          </label>
          <Select
            className="w-full"
            value={
              activeFilter === undefined ? "all" : activeFilter ? "true" : "false"
            }
            onChange={(v) => {
              if (v === "all") setActiveFilter(undefined);
              else setActiveFilter(v === "true");
            }}
            options={[
              { value: "all", label: "All" },
              { value: "true", label: "Active" },
              { value: "false", label: "Inactive" },
            ]}
          />
        </div>
        <Button onClick={() => void load()} className="w-full sm:col-span-2 lg:col-span-1 lg:w-auto">
          Refresh
        </Button>
      </div>
      <p className="mb-3 text-sm text-neutral-500">
        Expand a row for pricing details and variant images.
      </p>
      <div className="w-full overflow-x-auto">
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={items}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50, 100],
            showTotal: (t) => `${t} products`,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
          scroll={{ x: "max-content" }}
          expandable={{
            expandedRowRender: (record) => (
              <ProductCatalogueExpandedRow product={record} />
            ),
            rowExpandable: () => true,
          }}
          className="w-full min-w-[640px]"
        />
      </div>
    </AdminShell>
  );
}
