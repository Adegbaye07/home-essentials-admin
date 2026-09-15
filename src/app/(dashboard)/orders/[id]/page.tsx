"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  App,
  Button,
  Descriptions,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Timeline,
} from "antd";
import type { ColumnsType } from "antd/es/table";

import { AdminShell, AdminBackLink } from "@/components/admin-shell";
import { OrderItemImage } from "@/components/order-item-image";
import {
  adminNextStatusOptions,
  orderStatusColor,
  orderStatusLabel,
} from "@/lib/constants";
import { getOrder, updateOrderStatus } from "@/lib/api";
import { confirmDeleteAbandonedOrder } from "@/lib/confirm-delete-abandoned-order";
import type { Order, OrderItem, OrderStatus } from "@/lib/types";
import { formatDateTime, formatKobo } from "@/lib/format";
import { useAppMessage } from "@/hooks/use-app-message";

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";
  const message = useAppMessage();
  const { modal } = App.useApp();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [nextStatus, setNextStatus] = useState<OrderStatus | undefined>();
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getOrder(id);
      setOrder(data);
      setNextStatus(undefined);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Failed to load order");
    } finally {
      setLoading(false);
    }
  }, [id, message]);

  useEffect(() => {
    void load();
  }, [load]);

  function handleStatusUpdate() {
    if (!order || !nextStatus) {
      message.warning("Choose a new status");
      return;
    }

    modal.confirm({
      title: "Update order status?",
      content: (
        <div className="space-y-2">
          <p>
            Change status from <strong>{orderStatusLabel(order.status)}</strong>{" "}
            to <strong>{orderStatusLabel(nextStatus)}</strong>.
          </p>
          <p className="text-neutral-600">
            This updates the customer timeline and sends them an email. You
            cannot revert to a previous status from the admin.
          </p>
        </div>
      ),
      okText: "Update status",
      cancelText: "Cancel",
      onOk: async () => {
        setSaving(true);
        try {
          const updated = await updateOrderStatus(order.id, {
            status: nextStatus,
            note: note.trim() || undefined,
          });
          setOrder(updated);
          setNote("");
          setNextStatus(undefined);
          message.success("Status updated — customer notified by email");
        } catch (e) {
          message.error(e instanceof Error ? e.message : "Update failed");
          throw e;
        } finally {
          setSaving(false);
        }
      },
    });
  }

  const lineColumns: ColumnsType<OrderItem> = [
    {
      title: "Image",
      key: "image",
      width: 72,
      render: (_, row) => (
        <OrderItemImage
          src={row.imageUrl}
          alt={`${row.productTitle} — ${row.variant}`}
        />
      ),
    },
    {
      title: "Product",
      dataIndex: "productTitle",
      key: "title",
      ellipsis: true,
    },
    { title: "Variant", dataIndex: "variant", key: "variant", width: 100 },
    {
      title: "Size",
      dataIndex: "size",
      key: "size",
      width: 100,
      render: (s: string | undefined) => s || "—",
    },
    {
      title: "Unit",
      dataIndex: "unit",
      key: "buyUnit",
      width: 88,
      render: (u: string, row) =>
        u === "bundle" && row.piecesPerBundle
          ? `bundle (${row.piecesPerBundle})`
          : u,
    },
    { title: "Qty", dataIndex: "quantity", key: "qty", width: 64 },
    {
      title: "Price",
      dataIndex: "unitPriceKobo",
      key: "price",
      width: 112,
      className: "whitespace-nowrap",
      render: (k: number) => formatKobo(k),
    },
    {
      title: "Line total",
      dataIndex: "lineTotalKobo",
      key: "line",
      width: 120,
      className: "whitespace-nowrap",
      render: (k: number) => formatKobo(k),
    },
  ];

  const statusOptions = order ? adminNextStatusOptions(order.status) : [];
  const readOnlyAbandoned = order?.status === "abandoned";
  const showGenericStatus =
    !!order && !readOnlyAbandoned && statusOptions.length > 0;

  return (
    <AdminShell
      contentWidth="wide"
      title="Order detail"
      extra={
        <Space wrap>
          <Button onClick={() => void load()} disabled={loading}>
            Refresh
          </Button>
          <AdminBackLink href="/orders">Back</AdminBackLink>
        </Space>
      }
    >
      {loading && !order ? (
        <p className="text-neutral-500">Loading…</p>
      ) : !order ? (
        <p className="text-neutral-500">Order not found.</p>
      ) : (
        <div className="flex flex-col gap-8">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-lg font-semibold">Order</h1>
            <Tag color={orderStatusColor(order.status)}>
              {orderStatusLabel(order.status)}
            </Tag>
            <span className="text-neutral-600">
              {formatDateTime(order.createdAt)}
            </span>
          </div>

          <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
            <Descriptions.Item label="Total">
              {formatKobo(order.totalAmountKobo)}
            </Descriptions.Item>
            <Descriptions.Item label="Paystack ref">
              {order.paystackReference || "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Tracking">
              {order.trackingNumber || "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Name">
              {order.customer.name?.trim() || "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Email">
              {order.customer.email}
            </Descriptions.Item>
            <Descriptions.Item label="Phone">
              {order.customer.phone}
            </Descriptions.Item>
            <Descriptions.Item label="Delivery address" span={2}>
              {order.customer.deliveryAddress}
            </Descriptions.Item>
          </Descriptions>

          <section>
            <h2 className="mb-3 text-base font-semibold">Line items</h2>
            <div className="overflow-x-auto">
              <Table
                rowKey={(r) =>
                  `${r.productId}-${r.variant}-${r.size ?? ""}-${r.unit}-${r.quantity}`
                }
                columns={lineColumns}
                dataSource={order.items}
                pagination={false}
                size="small"
                scroll={{ x: "max-content" }}
              />
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="flex flex-col gap-6">
              {showGenericStatus ? (
                <div>
                  <h2 className="mb-3 text-base font-semibold">
                    Update status
                  </h2>
                  <div className="flex max-w-md flex-col gap-3">
                    <Select
                      placeholder="New status"
                      value={nextStatus}
                      onChange={setNextStatus}
                      options={statusOptions}
                    />
                    <Input.TextArea
                      placeholder="Optional note (shown in timeline)"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={2}
                    />
                    <Button
                      type="primary"
                      loading={saving}
                      disabled={!nextStatus}
                      onClick={handleStatusUpdate}
                      className="w-full sm:w-auto"
                    >
                      Save status
                    </Button>
                  </div>
                </div>
              ) : null}

              {readOnlyAbandoned ? (
                <div>
                  <h2 className="mb-3 text-base font-semibold">
                    Update status
                  </h2>
                  <p className="max-w-md text-sm text-neutral-600">
                    This order was abandoned by the customer at checkout. Status
                    cannot be changed here — if they pay via Paystack, the order
                    becomes paid automatically. Unpaid abandoned orders are
                    removed after about 30 minutes.
                  </p>
                  <Button
                    danger
                    className="mt-4"
                    onClick={() =>
                      confirmDeleteAbandonedOrder(message, order.id, () =>
                        router.push("/orders"),
                      )
                    }
                  >
                    Delete order
                  </Button>
                </div>
              ) : null}

              {!showGenericStatus && !readOnlyAbandoned ? (
                <div>
                  <h2 className="mb-3 text-base font-semibold">
                    Update status
                  </h2>
                  <p className="max-w-md text-sm text-neutral-600">
                    No further status changes are available for this order.
                  </p>
                </div>
              ) : null}
            </div>

            <div>
              <h2 className="mb-3 text-base font-semibold">Timeline</h2>
              <Timeline
                items={[...order.statusHistory].reverse().map((entry) => ({
                  color: orderStatusColor(entry.status),
                  content: (
                    <div>
                      <div className="font-medium">
                        {orderStatusLabel(entry.status)}
                      </div>
                      <div className="text-sm text-neutral-500">
                        {formatDateTime(entry.at)}
                      </div>
                      {entry.note ? (
                        <div className="text-sm text-neutral-600">
                          {entry.note}
                        </div>
                      ) : null}
                    </div>
                  ),
                }))}
              />
            </div>
          </section>
        </div>
      )}
    </AdminShell>
  );
}
