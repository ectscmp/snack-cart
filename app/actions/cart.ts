"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import {
  addToCart,
  clearCart,
  removeFromCart,
  setCartQuantity,
} from "@/lib/db";
import type { ActionState } from "@/lib/action-state";

const productIdSchema = z.coerce.number().int().positive();
const quantitySchema = z.coerce.number().int().min(0).max(99);

export async function addToCartAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const productId = productIdSchema.safeParse(formData.get("productId"));
  const quantity = quantitySchema.safeParse(formData.get("quantity") ?? 1);

  if (!productId.success || !quantity.success) {
    return { status: "error", message: "That snack could not be added." };
  }

  try {
    addToCart(user.id, productId.data, quantity.data || 1);
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Could not add that snack.",
    };
  }

  refresh();
  return { status: "success", message: "Added to your cart." };
}

export async function updateCartItemAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const productId = productIdSchema.safeParse(formData.get("productId"));
  const quantity = quantitySchema.safeParse(formData.get("quantity"));

  if (!productId.success || !quantity.success) {
    return { status: "error", message: "That quantity is not valid." };
  }

  setCartQuantity(user.id, productId.data, quantity.data);
  refresh();
  return { status: "success" };
}

export async function removeCartItemAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const productId = productIdSchema.safeParse(formData.get("productId"));

  if (!productId.success) {
    return { status: "error", message: "That snack is not in your cart." };
  }

  removeFromCart(user.id, productId.data);
  refresh();
  return { status: "success" };
}

export async function clearCartAction(): Promise<void> {
  const user = await requireUser();
  clearCart(user.id);
  refresh();
}

export async function setCartQuantityDirect(
  productId: number,
  quantity: number,
): Promise<ActionState> {
  const user = await requireUser();
  const parsedProduct = productIdSchema.safeParse(productId);
  const parsedQuantity = quantitySchema.safeParse(quantity);

  if (!parsedProduct.success || !parsedQuantity.success) {
    return { status: "error", message: "That quantity is not valid." };
  }

  setCartQuantity(user.id, parsedProduct.data, parsedQuantity.data);
  refresh();
  return { status: "success" };
}

export async function removeCartItemDirect(productId: number): Promise<ActionState> {
  const user = await requireUser();
  const parsed = productIdSchema.safeParse(productId);

  if (!parsed.success) {
    return { status: "error", message: "That snack is not in your cart." };
  }

  removeFromCart(user.id, parsed.data);
  refresh();
  return { status: "success" };
}
