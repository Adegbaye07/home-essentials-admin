"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  App,
  Button,
  Descriptions,
  Input,
  InputNumber,
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
  normalizeOrderType,
  orderStatusColor,
  orderStatusLabel,
  orderTypeColor,
  orderTypeLabel,
} from "@/lib/constants";
import {
  acceptCustomOrder,
  getOrder,
  rejectCustomOrder,
  resendCustomPaymentLink,
  updateOrderStatus,
} from "@/lib/api";
import { confirmDeleteAbandonedOrder } from "@/lib/confirm-delete-abandoned-order";
import type { Order, OrderItem, OrderStatus } from "@/lib/types";
import { formatDateTime, formatKobo } from "@/lib/format";
import { useAppMessage } from "@/hooks/use-app-message";

function ngnToKobo(ngn: number): number {
  return Math.round(ngn * 100);
}

function koboToNgn(kobo: number): number {
  return kobo / 100;
}

function latestHistoryNote(order: Order, status: OrderStatus): string | undefined {
  for (let i = order.statusHistory.length - 1; i >= 0; i--) {
    const entry = order.statusHistory[i];
    if (entry.status === status && entry.note?.trim()) {
      return entry.note.trim();
    }
  }
  return undefined;
}

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
  const [acceptAmountNgn, setAcceptAmountNgn] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [lastPaymentUrl, setLastPaymentUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getOrder(id);
      setOrder(data);
      setNextStatus(undefined);
      if (data.custom?.offeredTotalKobo) {
        setAcceptAmountNgn(koboToNgn(data.custom.offeredTotalKobo));
      } else if (data.totalAmountKobo > 0) {
        setAcceptAmountNgn(koboToNgn(data.totalAmountKobo));
      } else {
        setAcceptAmountNgn(null);
      }
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
            Change status from <strong>{orderStatusLabel(order.status)}</strong> to{" "}
            <strong>{orderStatusLabel(nextStatus)}</strong>.
          </p>
          <p className="text-neutral-600">
            This updates the customer timeline and sends them an email. You cannot revert to a
            previous status from the admin.
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

  function handleAccept() {
    if (!order) return;
    if (acceptAmountNgn == null || acceptAmountNgn <= 0) {
      message.warning("Enter the agreed amount in NGN");
      return;
    }
    const amountKobo = ngnToKobo(acceptAmountNgn);

    modal.confirm({
      title: "Accept custom order?",
      content: (
        <div className="space-y-2">
          <p>
            Set the charge to <strong>{formatKobo(amountKobo)}</strong>, move the order to pending
            payment, and email the customer a Paystack payment link.
          </p>
          <p className="text-neutral-600">
            Customer offered{" "}
            {order.custom ? formatKobo(order.custom.offeredTotalKobo) : "—"}.
          </p>
        </div>
      ),
      okText: "Accept & send link",
      cancelText: "Cancel",
      onOk: async () => {
        setSaving(true);
        try {
          const result = await acceptCustomOrder(order.id, { amountKobo });
          setOrder(result.order);
          setLastPaymentUrl(result.authorizationUrl || null);
          setNextStatus(undefined);
          message.success("Accepted — payment link emailed to customer");
        } catch (e) {
          message.error(e instanceof Error ? e.message : "Accept failed");
          throw e;
        } finally {
          setSaving(false);
        }
      },
    });
  }

  function handleReject() {
    if (!order) return;
    const reason = rejectReason.trim();
    if (!reason) {
      message.warning("Enter a rejection reason");
      return;
    }

    modal.confirm({
      title: "Reject custom order?",
      content: (
        <div className="space-y-2">
          <p>The customer will be emailed and can see this reason on the track page:</p>
          <p className="rounded border border-neutral-200 bg-neutral-50 p-2 text-sm">{reason}</p>
        </div>
      ),
      okText: "Reject order",
      okButtonProps: { danger: true },
      cancelText: "Cancel",
      onOk: async () => {
        setSaving(true);
        try {
          const updated = await rejectCustomOrder(order.id, { reason });
          setOrder(updated);
          setRejectReason("");
          setLastPaymentUrl(null);
          message.success("Rejected — customer notified by email");
        } catch (e) {
          message.error(e instanceof Error ? e.message : "Reject failed");
          throw e;
        } finally {
          setSaving(false);
        }
      },
    });
  }

  function handleResendPaymentLink() {
    if (!order) return;

    modal.confirm({
      title: "Resend payment link?",
      content:
        "A new Paystack checkout link will be generated and emailed to the customer for the current agreed amount.",
      okText: "Resend link",
      cancelText: "Cancel",
      onOk: async () => {
        setSaving(true);
        try {
          const result = await resendCustomPaymentLink(order.id);
          setOrder(result.order);
          setLastPaymentUrl(result.authorizationUrl || null);
          message.success("Payment link resent");
        } catch (e) {
          message.error(e instanceof Error ? e.message : "Resend failed");
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
        <OrderItemImage src={row.imageUrl} alt={`${row.productTitle} — ${row.variant}`} />
      ),
    },
    { title: "Product", dataIndex: "productTitle", key: "title", ellipsis: true },
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
  const isCustom = order ? normalizeOrderType(order.orderType) === "custom" : false;
  const readOnlyAbandoned = order?.status === "abandoned";
  const readOnlyRejected = order?.status === "rejected";
  const showGenericStatus =
    !!order && !readOnlyAbandoned && !readOnlyRejected && statusOptions.length > 0;
  const showCustomReview = isCustom && order?.status === "created";
  const showCustomResend = isCustom && order?.status === "pending_payment";
  const rejectNote = order && readOnlyRejected ? latestHistoryNote(order, "rejected") : undefined;

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
            <Tag color={orderTypeColor(order.orderType)}>{orderTypeLabel(order.orderType)}</Tag>
            <Tag color={orderStatusColor(order.status)}>{orderStatusLabel(order.status)}</Tag>
            <span className="text-neutral-600">{formatDateTime(order.createdAt)}</span>
          </div>

          {lastPaymentUrl ? (
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm">
              <div className="font-medium text-neutral-800">Latest payment link</div>
              <a
                href={lastPaymentUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 break-all text-hek-primary underline-offset-2 hover:underline"
              >
                {lastPaymentUrl}
              </a>
              <p className="mt-1 text-neutral-500">Also emailed to the customer.</p>
            </div>
          ) : null}

          <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
            <Descriptions.Item label="Type">{orderTypeLabel(order.orderType)}</Descriptions.Item>
            <Descriptions.Item label="Total">{formatKobo(order.totalAmountKobo)}</Descriptions.Item>
            <Descriptions.Item label="Paystack ref">{order.paystackReference || "—"}</Descriptions.Item>
            <Descriptions.Item label="Tracking">{order.trackingNumber || "—"}</Descriptions.Item>
            <Descriptions.Item label="Name">{order.customer.name?.trim() || "—"}</Descriptions.Item>
            <Descriptions.Item label="Email">{order.customer.email}</Descriptions.Item>
            <Descriptions.Item label="Phone">{order.customer.phone}</Descriptions.Item>
            <Descriptions.Item label="Delivery address" span={2}>
              {order.customer.deliveryAddress}
            </Descriptions.Item>
          </Descriptions>

          {isCustom && order.custom ? (
            <section>
              <h2 className="mb-3 text-base font-semibold">Custom request</h2>
              <div className="mb-4">
                <OrderItemImage
                  src={order.custom.sampleImageUrl}
                  alt={order.custom.title || "Sample"}
                />
              </div>
              <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
                <Descriptions.Item label="Title" span={2}>
                  {order.custom.title}
                </Descriptions.Item>
                <Descriptions.Item label="Description" span={2}>
                  {order.custom.description}
                </Descriptions.Item>
                <Descriptions.Item label="Sizes">
                  {order.custom.sizes?.length ? order.custom.sizes.join(", ") : "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Colors">
                  {order.custom.colors?.length ? order.custom.colors.join(", ") : "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Quantity">{order.custom.quantity}</Descriptions.Item>
                <Descriptions.Item label="Offered total">
                  {formatKobo(order.custom.offeredTotalKobo)}
                </Descriptions.Item>
              </Descriptions>
            </section>
          ) : (
            <section>
              <h2 className="mb-3 text-base font-semibold">Line items</h2>
              <div className="overflow-x-auto">
                <Table
                  rowKey={(r) => `${r.productId}-${r.variant}-${r.size ?? ""}-${r.unit}-${r.quantity}`}
                  columns={lineColumns}
                  dataSource={order.items}
                  pagination={false}
                  size="small"
                  scroll={{ x: "max-content" }}
                />
              </div>
            </section>
          )}

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="flex flex-col gap-6">
              {showCustomReview ? (
                <div>
                  <h2 className="mb-3 text-base font-semibold">Review custom order</h2>
                  <p className="mb-3 max-w-md text-sm text-neutral-600">
                    After confirming details by phone, set the agreed total and accept to email a
                    payment link — or reject with a reason the customer can see on track.
                  </p>
                  <div className="flex max-w-md flex-col gap-3">
                    <div>
                      <div className="mb-1 text-sm text-neutral-600">Agreed amount (NGN)</div>
                      <InputNumber
                        min={1}
                        step={100}
                        className="w-full!"
                        value={acceptAmountNgn}
                        onChange={(v) => setAcceptAmountNgn(typeof v === "number" ? v : null)}
                        placeholder="Amount after negotiation"
                      />
                      <p className="mt-1 text-xs text-neutral-500">
                        Offered:{" "}
                        {order.custom ? formatKobo(order.custom.offeredTotalKobo) : "—"}
                      </p>
                    </div>
                    <Button type="primary" loading={saving} onClick={handleAccept}>
                      Accept &amp; send payment link
                    </Button>
                    <Input.TextArea
                      placeholder="Rejection reason (required to reject)"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      rows={3}
                    />
                    <Button danger loading={saving} onClick={handleReject}>
                      Reject order
                    </Button>
                  </div>
                </div>
              ) : null}

              {showCustomResend ? (
                <div>
                  <h2 className="mb-3 text-base font-semibold">Payment link</h2>
                  <p className="mb-3 max-w-md text-sm text-neutral-600">
                    Order is awaiting payment for {formatKobo(order.totalAmountKobo)}. Resend if the
                    previous link expired.
                  </p>
                  <Button loading={saving} onClick={handleResendPaymentLink}>
                    Resend payment link
                  </Button>
                </div>
              ) : null}

              {readOnlyRejected ? (
                <div>
                  <h2 className="mb-3 text-base font-semibold">Update status</h2>
                  <p className="max-w-md text-sm text-neutral-600">
                    This custom order was rejected. Status cannot be changed.
                  </p>
                  {rejectNote ? (
                    <p className="mt-2 max-w-md rounded border border-red-100 bg-red-50 p-2 text-sm text-red-800">
                      Reason: {rejectNote}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {showGenericStatus ? (
                <div>
                  <h2 className="mb-3 text-base font-semibold">Update status</h2>
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
                  <h2 className="mb-3 text-base font-semibold">Update status</h2>
                  <p className="max-w-md text-sm text-neutral-600">
                    This order was abandoned by the customer at checkout. Status cannot be changed
                    here — if they pay via Paystack, the order becomes paid automatically. Unpaid
                    abandoned orders are removed after about 30 minutes.
                  </p>
                  <Button
                    danger
                    className="mt-4"
                    onClick={() =>
                      confirmDeleteAbandonedOrder(message, order.id, () => router.push("/orders"))
                    }
                  >
                    Delete order
                  </Button>
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
                      <div className="font-medium">{orderStatusLabel(entry.status)}</div>
                      <div className="text-sm text-neutral-500">{formatDateTime(entry.at)}</div>
                      {entry.note ? (
                        <div className="text-sm text-neutral-600">{entry.note}</div>
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
