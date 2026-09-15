import { Modal } from "antd";
import type { MessageInstance } from "antd/es/message/interface";

import { ApiError, deleteAbandonedOrder } from "@/lib/api";

const CONFIRM_TITLE = "Delete abandoned order?";
const CONFIRM_BODY =
  "This permanently removes the order. The customer will no longer be able to complete payment on this checkout. Do you want to proceed?";

export function confirmDeleteAbandonedOrder(
  message: MessageInstance,
  orderId: string,
  onSuccess: () => void | Promise<void>,
) {
  Modal.confirm({
    title: CONFIRM_TITLE,
    content: CONFIRM_BODY,
    okText: "Delete",
    okType: "danger",
    cancelText: "Cancel",
    onOk: async () => {
      try {
        await deleteAbandonedOrder(orderId);
        message.success("Order deleted");
        await onSuccess();
      } catch (e) {
        message.error(
          e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Delete failed",
        );
        throw e;
      }
    },
  });
}
