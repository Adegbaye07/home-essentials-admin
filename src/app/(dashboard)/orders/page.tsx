"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Select, Space, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";

import { AdminShell } from "@/components/admin-shell";
import { OrderItemImage } from "@/components/order-item-image";
import {
  ORDER_STATUSES,
  ORDER_TYPES,
  normalizeOrderType,
  orderStatusColor,
  orderStatusLabel,
  orderTypeColor,
  orderTypeLabel,
} from "@/lib/constants";
import { listOrders } from "@/lib/api";
import { confirmDeleteAbandonedOrder } from "@/lib/confirm-delete-abandoned-order";
import type { Order, OrderStatus, OrderType } from "@/lib/types";
import { formatDateTime, formatKobo } from "@/lib/format";
import { useAppMessage } from "@/hooks/use-app-message";
import { useIsMdUp } from "@/hooks/use-media-query";

function orderListImage(order: Order): { src?: string; alt: string } {
  if (normalizeOrderType(order.orderType) === "custom" && order.custom) {
    return {
      src: order.custom.sampleImageUrl,
      alt: order.custom.title || "Custom order sample",
    };
  }
  const first = order.items[0];
  if (!first) return { alt: "Order item" };
  return {
    src: first.imageUrl,
    alt: `${first.productTitle} — ${first.variant}`,
  };
}

export default function OrdersPage() {
  const message = useAppMessage();
  const isMdUp = useIsMdUp();
  const [items, setItems] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | undefined>();
  const [typeFilter, setTypeFilter] = useState<OrderType | undefined>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  async function load() {
    setLoading(true);
    try {
      const data = await listOrders({
        status: statusFilter,
        orderType: typeFilter,
        page,
        page_size: pageSize,
      });
      setItems(data.items);
      setTotal(data.metadata.total_items);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setPage(1);
  }, [statusFilter, typeFilter]);

  useEffect(() => {
    void load();
  }, [statusFilter, typeFilter, page, pageSize]);

  const columns: ColumnsType<Order> = [
    {
      title: "Item",
      key: "itemImage",
      width: 72,
      render: (_, record) => {
        const img = orderListImage(record);
        return <OrderItemImage src={img.src} alt={img.alt} />;
      },
    },
    {
      title: "Date",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 160,
      className: "whitespace-nowrap",
      render: (v: string) => formatDateTime(v),
    },
    {
      title: "Type",
      key: "orderType",
      width: 110,
      render: (_, record) => {
        const type = normalizeOrderType(record.orderType);
        return (
          <Tag color={orderTypeColor(type)} className="m-0">
            {orderTypeLabel(type)}
          </Tag>
        );
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 140,
      render: (s: OrderStatus) => (
        <Tag color={orderStatusColor(s)} className="m-0">
          {orderStatusLabel(s)}
        </Tag>
      ),
    },
    {
      title: "Total",
      dataIndex: "totalAmountKobo",
      key: "total",
      width: 120,
      className: "whitespace-nowrap",
      render: (k: number) => formatKobo(k),
    },
    {
      title: "Customer",
      key: "customer",
      ellipsis: true,
      responsive: ["md"],
      render: (_, r) => r.customer.email,
    },
    {
      title: "Tracking",
      dataIndex: "trackingNumber",
      key: "tracking",
      responsive: ["lg"],
      ellipsis: true,
      render: (t?: string) => t || "—",
    },
    {
      title: "Actions",
      key: "actions",
      width: 140,
      className: "whitespace-nowrap",
      render: (_, record) => (
        <Space size="small" wrap>
          <Link href={`/orders/${record.id}`} className="font-medium underline-offset-2 hover:underline">
            View
          </Link>
          {record.status === "abandoned" ? (
            <Button
              type="link"
              danger
              size="small"
              className="px-0"
              onClick={() =>
                confirmDeleteAbandonedOrder(message, record.id, () => load())
              }
            >
              Delete
            </Button>
          ) : null}
        </Space>
      ),
    },
  ];

  return (
    <AdminShell contentWidth="wide" title="Orders">
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-center">
        <h1 className="col-span-full text-lg font-semibold sm:hidden">Orders</h1>
        <Select
          allowClear
          placeholder="Type"
          className="w-full"
          value={typeFilter}
          onChange={setTypeFilter}
          options={ORDER_TYPES.map((t) => ({ value: t.value, label: t.label }))}
        />
        <Select
          allowClear
          placeholder="Status"
          className="w-full"
          value={statusFilter}
          onChange={setStatusFilter}
          options={ORDER_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
        />
        <Button onClick={() => void load()} className="w-full lg:w-auto">
          Refresh
        </Button>
      </div>
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
            showTotal: (t) => `${t} orders`,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
          scroll={isMdUp ? undefined : { x: "max-content" }}
          className="w-full min-w-[280px]"
        />
      </div>
    </AdminShell>
  );
}
