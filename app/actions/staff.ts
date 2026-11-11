"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { requireStaff } from "@/lib/auth";
import { parseCsv } from "@/lib/csv";
import {
  adjustStock,
  createCategory,
  createProduct,
  createProducts,
  deleteCategory,
  getCategory,
  getProduct,
  markOrderPaid,
  setProductActive,
  updateCategory,
  updateOrderStatus,
  updateProduct,
} from "@/lib/db";
import { parsePriceToCents } from "@/lib/money";
import type { ActionState } from "@/lib/action-state";

const productIdSchema = z.coerce.number().int().positive();
const orderIdSchema = z.coerce.number().int().positive();

const productSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  description: z.string().trim().max(500).optional(),
  price: z.string().trim().min(1, "Price is required."),
  categoryId: z.coerce.number().int().positive(),
  imageUrl: z.string().trim().max(500).optional(),
  lowStockThreshold: z.coerce.number().int().min(0).max(100000),
});

function readProductForm(formData: FormData) {
  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? undefined,
    price: formData.get("price"),
    categoryId: formData.get("categoryId"),
    imageUrl: formData.get("imageUrl") ?? undefined,
    lowStockThreshold: formData.get("lowStockThreshold") ?? 5,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid product." } as const;
  }

  const priceCents = parsePriceToCents(parsed.data.price);

  if (priceCents === null) {
    return { error: "Enter a price like 1.50." } as const;
  }

  const category = getCategory(parsed.data.categoryId);

  if (!category) {
    return {
      error: "Pick a category. THM staff can add new ones in Staff → Categories.",
    } as const;
  }

  return {
    data: {
      name: parsed.data.name,
      description: parsed.data.description || null,
      priceCents,
      categoryId: category.id,
      imageUrl: parsed.data.imageUrl || null,
      lowStockThreshold: parsed.data.lowStockThreshold,
    },
  } as const;
}

export async function createProductAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireStaff();
  const parsed = readProductForm(formData);

  if ("error" in parsed) {
    return { status: "error", message: parsed.error };
  }

  const stockQuantity = Number(formData.get("stockQuantity") ?? 0);

  try {
    createProduct({
      ...parsed.data,
      stockQuantity: Number.isFinite(stockQuantity) ? Math.max(0, stockQuantity) : 0,
      createdBy: user.id,
    });
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Could not create the product.",
    };
  }

  refresh();
  return { status: "success", message: "Product created." };
}

export async function updateProductAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireStaff();
  const productId = productIdSchema.safeParse(formData.get("productId"));

  if (!productId.success) {
    return { status: "error", message: "Missing product." };
  }

  const parsed = readProductForm(formData);

  if ("error" in parsed) {
    return { status: "error", message: parsed.error };
  }

  const product = getProduct(productId.data);

  if (!product) {
    return { status: "error", message: "That product no longer exists." };
  }

  updateProduct(productId.data, {
    ...parsed.data,
    active: formData.get("active") === "on",
  });

  refresh();
  return { status: "success", message: "Product updated." };
}

export async function toggleProductAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireStaff();
  const productId = productIdSchema.safeParse(formData.get("productId"));
  const active = formData.get("active") === "true";

  if (!productId.success) {
    return { status: "error", message: "Missing product." };
  }

  setProductActive(productId.data, active);
  refresh();
  return {
    status: "success",
    message: active ? "Product is available." : "Product hidden.",
  };
}

export async function adjustStockAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireStaff();
  const productId = productIdSchema.safeParse(formData.get("productId"));
  const delta = z.coerce.number().int().safeParse(formData.get("delta"));
  const note = String(formData.get("note") ?? "").trim();

  if (!productId.success || !delta.success || delta.data === 0) {
    return { status: "error", message: "Enter a non-zero stock change." };
  }

  try {
    adjustStock({
      productId: productId.data,
      delta: delta.data,
      reason: delta.data > 0 ? "restock" : "adjustment",
      actorId: user.id,
      note: note || null,
    });
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Could not change stock.",
    };
  }

  refresh();
  return { status: "success", message: "Stock updated." };
}

const statusSchema = z.enum([
  "pending",
  "preparing",
  "out_for_delivery",
  "delivered",
  "cancelled",
]);

export async function updateOrderStatusAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireStaff();
  const orderId = orderIdSchema.safeParse(formData.get("orderId"));
  const status = statusSchema.safeParse(formData.get("status"));

  if (!orderId.success || !status.success) {
    return { status: "error", message: "Invalid order update." };
  }

  try {
    updateOrderStatus(orderId.data, status.data, user.id);
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Could not update the order.",
    };
  }

  refresh();
  return { status: "success", message: "Order updated." };
}

export async function markOrderPaidAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireStaff();
  const orderId = orderIdSchema.safeParse(formData.get("orderId"));

  if (!orderId.success) {
    return { status: "error", message: "Missing order." };
  }

  try {
    markOrderPaid(orderId.data, user.id);
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Could not mark the order paid.",
    };
  }

  refresh();
  return { status: "success", message: "Marked paid." };
}


export async function importProductsAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireStaff();

  const file = formData.get("csv");

  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Choose a CSV file first." };
  }

  if (file.size > 2_000_000) {
    return { status: "error", message: "File is too large (max 2 MB)." };
  }

  const text = await file.text();
  const rows = parseCsv(text);

  if (rows.length < 2) {
    return {
      status: "error",
      message: "The CSV needs a header row and at least one data row.",
    };
  }

  const header = rows[0].map((value) =>
    value.trim().toLowerCase().replace(/[\s-]+/g, "_"),
  );
  const aliases: Record<string, string> = {
    name: "name",
    product: "name",
    product_name: "name",
    productname: "name",
    category: "category",
    category_name: "category",
    categoryname: "category",
    price: "price",
    price_cents: "priceCents",
    pricecents: "priceCents",
    price_cents_total: "priceCents",
    description: "description",
    desc: "description",
    stock: "stockQuantity",
    stock_quantity: "stockQuantity",
    stockquantity: "stockQuantity",
    quantity: "stockQuantity",
    low_stock_threshold: "lowStockThreshold",
    lowstockthreshold: "lowStockThreshold",
    low_stock: "lowStockThreshold",
    active: "active",
    image_url: "imageUrl",
    imageurl: "imageUrl",
    image: "imageUrl",
  };

  const normalizedHeader = header.map((value) => aliases[value] ?? value);

  const indexOf = (key: string) => normalizedHeader.indexOf(key);

  const nameIndex = indexOf("name");
  const priceIndex = indexOf("price");
  const priceCentsIndex = indexOf("priceCents");
  const categoryIndex = indexOf("category");

  if (nameIndex === -1) {
    return {
      status: "error",
      message: "The CSV must have a column named name (or product / product_name).",
    };
  }

  if (priceIndex === -1 && priceCentsIndex === -1) {
    return {
      status: "error",
      message: "The CSV must have a price column (price or price_cents).",
    };
  }

  const dataRows = rows
    .slice(1)
    .filter((row) => row.some((cell) => cell.trim() !== ""));

  const parsed = dataRows.map((row) => {
    const name = (row[nameIndex] ?? "").trim();
    const category = categoryIndex >= 0 ? (row[categoryIndex] ?? "").trim() : "";

    let priceCents: number | null = null;

    if (priceCentsIndex >= 0) {
      const raw = (row[priceCentsIndex] ?? "").trim();

      if (raw) {
        const parsedCents = Number(raw);

        if (Number.isFinite(parsedCents)) {
          priceCents = Math.round(parsedCents);
        }
      }
    } else if (priceIndex >= 0) {
      priceCents = parsePriceToCents((row[priceIndex] ?? "").trim());
    }

    const descriptionIndex = indexOf("description");
    const stockIndex = indexOf("stockQuantity");
    const thresholdIndex = indexOf("lowStockThreshold");
    const activeIndex = indexOf("active");
    const imageIndex = indexOf("imageUrl");

    const activeRaw = activeIndex >= 0 ? (row[activeIndex] ?? "").trim().toLowerCase() : "";

    return {
      name,
      category: category || "Snacks",
      priceCents,
      description: descriptionIndex >= 0 ? (row[descriptionIndex] ?? "").trim() : "",
      stockQuantity: stockIndex >= 0 ? Number(row[stockIndex] ?? 0) : 0,
      lowStockThreshold: thresholdIndex >= 0 ? Number(row[thresholdIndex] ?? 5) : 5,
      active:
        activeRaw === ""
          ? true
          : !["false", "0", "no", "inactive"].includes(activeRaw),
      imageUrl: imageIndex >= 0 ? (row[imageIndex] ?? "").trim() : "",
      createdBy: user.id,
    };
  });

  const result = createProducts(parsed);

  refresh();

  const summary =
    result.created === 0 && result.skipped.length === 0
      ? "No rows to import."
      : `Imported ${result.created} product${
          result.created === 1 ? "" : "s"
        }${result.skipped.length ? `, skipped ${result.skipped.length}.` : "."}`;

  return {
    status: result.created > 0 ? "success" : "error",
    message: summary,
    details: result.skipped.map((entry) => `Row ${entry.row}: ${entry.reason}`),
  };
}

const categoryIdSchema = z.coerce.number().int().positive();

export async function saveCategoryAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireStaff();
  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    return { status: "error", message: "A category name is required." };
  }

  if (name.length > 60) {
    return { status: "error", message: "Keep the name under 60 characters." };
  }

  const id = formData.get("categoryId");
  const parentRaw = String(formData.get("parentId") ?? "").trim();
  let parentId: number | null = null;

  if (parentRaw) {
    const parsedParent = categoryIdSchema.safeParse(parentRaw);

    if (!parsedParent.success) {
      return { status: "error", message: "Invalid parent category." };
    }

    parentId = parsedParent.data;
  }

  try {
    if (id) {
      const categoryId = categoryIdSchema.safeParse(id);

      if (!categoryId.success) {
        return { status: "error", message: "Invalid category." };
      }

      updateCategory(categoryId.data, { name, parentId });
      refresh();
      return { status: "success", message: "Category saved." };
    }

    createCategory(name, parentId);
    refresh();
    return { status: "success", message: "Category added." };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Could not save that category.",
    };
  }
}

export async function deleteCategoryAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireStaff();
  const categoryId = categoryIdSchema.safeParse(formData.get("categoryId"));

  if (!categoryId.success) {
    return { status: "error", message: "Invalid category." };
  }

  try {
    deleteCategory(categoryId.data);
    refresh();
    return { status: "success", message: "Category removed." };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Could not delete that category.",
    };
  }
}
