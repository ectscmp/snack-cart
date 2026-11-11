"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import {
  createOrderFromCart,
  getCart,
  getOrder,
  getOrderingStatus,
  getSettings,
  listOrdersForUser,
  updateOrderStatus,
} from "@/lib/db";
import type { ActionState } from "@/lib/action-state";

export type CheckoutState = ActionState & {
  orderId?: number;
};

const orderIdSchema = z.coerce.number().int().positive();

export async function placeOrderAction(
  _previousState: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const user = await requireUser();
  const settings = getSettings();
  const status = getOrderingStatus(user);

  if (!status.open) {
    return {
      status: "error",
      message:
        status.reason === "disabled"
          ? "Ordering is paused right now."
          : status.reason === "no-class"
            ? "You need a class assigned before you can order."
            : "Ordering is closed for your class right now.",
    };
  }

  const cart = getCart(user.id);

  if (cart.items.length === 0) {
    return { status: "error", message: "Your cart is empty." };
  }

  if (cart.itemCount > settings.maxItemsPerOrder) {
    return {
      status: "error",
      message: `Orders are limited to ${settings.maxItemsPerOrder} items.`,
    };
  }

  const openOrders = listOrdersForUser(user.id).filter((order) =>
    ["awaiting_payment", "pending", "preparing", "out_for_delivery"].includes(
      order.status,
    ),
  );

  if (openOrders.length >= settings.maxOpenOrders) {
    return {
      status: "error",
      message:
        settings.maxOpenOrders === 1
          ? "You already have an order in progress."
          : `You can only have ${settings.maxOpenOrders} open orders at a time.`,
    };
  }

  const deliveryRoom = String(formData.get("deliveryRoom") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!deliveryRoom) {
    return { status: "error", message: "Add a delivery room." };
  }

  try {
    const order = createOrderFromCart(user.id, {
      deliveryRoom,
      note: note || null,
    });

    refresh();

    return {
      status: "success",
      orderId: order.id,
      message: "Order placed. Pay when it is delivered.",
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Could not place your order.",
    };
  }
}

export async function cancelOrderAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const orderId = orderIdSchema.safeParse(formData.get("orderId"));

  if (!orderId.success) {
    return { status: "error", message: "Missing order." };
  }

  const order = getOrder(orderId.data);

  if (!order || order.customerId !== user.id) {
    return { status: "error", message: "That order could not be found." };
  }

  if (!["awaiting_payment", "pending"].includes(order.status)) {
    return { status: "error", message: "This order can no longer be cancelled." };
  }

  try {
    updateOrderStatus(order.id, "cancelled", user.id, "Cancelled by customer");
    refresh();
    return { status: "success", message: "Order cancelled." };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Could not cancel the order.",
    };
  }
}
