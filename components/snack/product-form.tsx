"use client";

import {
  useActionState,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { Loader2, PackagePlus, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  createProductAction,
  updateProductAction,
} from "@/app/actions/staff";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { idleState } from "@/lib/action-state";
import type { Category, Product, ProductOption, ProductOptions } from "@/lib/db";
import {
  COFFEE_WHIPPED_CREAM,
  PRODUCT_OPTION_SETS,
} from "@/lib/product-options";

type OptionRow = {
  key: string;
  label: string;
  price: string;
};

let rowCounter = 0;

function nextKey(prefix: string) {
  rowCounter += 1;
  return `${prefix}-${rowCounter}`;
}

function toRows(options: ProductOption[]): OptionRow[] {
  return options.map((option) => ({
    key: `saved-${option.id}`,
    label: option.label,
    price:
      option.priceDeltaCents > 0
        ? (option.priceDeltaCents / 100).toFixed(2)
        : "",
  }));
}

function mergeRows(current: OptionRow[], incoming: OptionRow[]): OptionRow[] {
  const labels = new Set(
    current.map((row) => row.label.trim().toLowerCase()).filter(Boolean),
  );

  return [
    ...current,
    ...incoming.filter((row) => {
      const label = row.label.trim().toLowerCase();

      if (!label || labels.has(label)) {
        return false;
      }

      labels.add(label);
      return true;
    }),
  ];
}

export function ProductForm({
  product,
  categories,
  options,
}: {
  product?: Product;
  categories: Category[];
  options?: ProductOptions;
}) {
  const action = product ? updateProductAction : createProductAction;
  const [state, formAction, pending] = useActionState(action, idleState);
  const [optionPrompt, setOptionPrompt] = useState(product?.optionPrompt ?? "");
  const [choices, setChoices] = useState<OptionRow[]>(() =>
    toRows(options?.choices ?? []),
  );
  const [addons, setAddons] = useState<OptionRow[]>(() =>
    toRows(options?.addons ?? []),
  );
  const [presetId, setPresetId] = useState("");
  const key = product?.id ?? "new";

  const parents = categories.filter((entry) => entry.parentId === null);
  const categoryOptions: Array<{ id: number; label: string }> = [];

  for (const parent of parents) {
    categoryOptions.push({ id: parent.id, label: parent.name });

    for (const child of categories.filter(
      (entry) => entry.parentId === parent.id,
    )) {
      categoryOptions.push({ id: child.id, label: `— ${child.name}` });
    }
  }

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? "Saved.");
    } else if (state.status === "error") {
      toast.error(state.message ?? "Could not save that product.");
    }
  }, [state]);

  function updateRow(
    setRows: Dispatch<SetStateAction<OptionRow[]>>,
    rowKey: string,
    patch: Partial<OptionRow>,
  ) {
    setRows((current) =>
      current.map((row) => (row.key === rowKey ? { ...row, ...patch } : row)),
    );
  }

  function removeRow(
    setRows: Dispatch<SetStateAction<OptionRow[]>>,
    rowKey: string,
  ) {
    setRows((current) => current.filter((row) => row.key !== rowKey));
  }

  function applyPreset() {
    const preset = PRODUCT_OPTION_SETS.find((entry) => entry.id === presetId);

    if (!preset) {
      return;
    }

    setChoices((current) =>
      mergeRows(
        current,
        preset.options.map((option) => ({
          key: nextKey("preset-choice"),
          label: option.label,
          price:
            option.priceDeltaCents > 0
              ? (option.priceDeltaCents / 100).toFixed(2)
              : "",
        })),
      ),
    );

    if (preset.id === "coffee") {
      setAddons((current) =>
        mergeRows(current, [
          {
            key: nextKey("preset-addon"),
            label: COFFEE_WHIPPED_CREAM.label,
            price:
              COFFEE_WHIPPED_CREAM.priceDeltaCents > 0
                ? (COFFEE_WHIPPED_CREAM.priceDeltaCents / 100).toFixed(2)
                : "",
          },
        ]),
      );
    }

    if (!optionPrompt) {
      setOptionPrompt(preset.prompt);
    }

    setPresetId("");
  }

  function renderOptionRows(
    rows: OptionRow[],
    kind: "choice" | "addon",
    setRows: Dispatch<SetStateAction<OptionRow[]>>,
    labelName: string,
    priceName: string,
  ) {
    return rows.map((row) => (
      <div key={row.key} className="flex items-center gap-2">
        <Input
          name={labelName}
          value={row.label}
          onChange={(event) =>
            updateRow(setRows, row.key, { label: event.target.value })
          }
          placeholder={kind === "choice" ? "Flavor or option" : "Add-on name"}
          aria-label={kind === "choice" ? "Choice name" : "Add-on name"}
          maxLength={80}
        />
        <Input
          name={priceName}
          value={row.price}
          onChange={(event) =>
            updateRow(setRows, row.key, { price: event.target.value })
          }
          placeholder="0.00"
          inputMode="decimal"
          aria-label={
            kind === "choice" ? "Choice upcharge" : "Add-on upcharge"
          }
          className="w-24"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => removeRow(setRows, row.key)}
          aria-label={
            kind === "choice" ? "Remove choice" : "Remove add-on"
          }
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    ));
  }

  return (
    <form action={formAction} className="space-y-4">
      {product ? (
        <input type="hidden" name="productId" value={product.id} />
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={`name-${product?.id ?? "new"}`}>Name</Label>
          <Input
            id={`name-${product?.id ?? "new"}`}
            name="name"
            defaultValue={product?.name}
            placeholder="Pretzel bag"
            required
            maxLength={120}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`price-${product?.id ?? "new"}`}>Price</Label>
          <Input
            id={`price-${product?.id ?? "new"}`}
            name="price"
            defaultValue={
              product ? (product.priceCents / 100).toFixed(2) : ""
            }
            placeholder="1.50"
            inputMode="decimal"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`category-${key}`}>Category</Label>
          <select
            id={`category-${key}`}
            name="categoryId"
            defaultValue={product?.categoryId ?? categoryOptions[0]?.id ?? ""}
            className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            required
          >
            {categoryOptions.length === 0 ? (
              <option value="">No categories yet</option>
            ) : null}
            {categoryOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          {categoryOptions.length === 0 ? (
            <p className="text-xs text-destructive">
              Add a category in Staff → Categories first.
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor={`low-${product?.id ?? "new"}`}>Low stock alert at</Label>
          <Input
            id={`low-${product?.id ?? "new"}`}
            name="lowStockThreshold"
            type="number"
            min={0}
            defaultValue={product?.lowStockThreshold ?? 5}
          />
        </div>

        {!product ? (
          <div className="space-y-2">
            <Label htmlFor="stockQuantity">Starting stock</Label>
            <Input
              id="stockQuantity"
              name="stockQuantity"
              type="number"
              min={0}
              defaultValue={0}
            />
          </div>
        ) : null}

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={`image-${key}`}>Image</Label>
          {product?.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.imageUrl}
              alt=""
              className="h-16 w-16 rounded-lg border object-cover"
            />
          ) : null}
          <Input
            id={`image-${key}`}
            name="image"
            type="file"
            accept="image/*"
          />
          <p className="text-xs text-muted-foreground">
            Upload a photo (max 2 MB). It is stored in the database. Or paste a
            URL below.
          </p>
          <Input
            id={`imageUrl-${key}`}
            name="imageUrl"
            defaultValue={product?.imageUrl?.startsWith("data:") ? "" : (product?.imageUrl ?? "")}
            placeholder="https://… (optional)"
            maxLength={500}
          />
        </div>

        <div className="space-y-3 sm:col-span-2">
          <div>
            <Label htmlFor={`optionPrompt-${key}`}>Dropdown label</Label>
            <Input
              id={`optionPrompt-${key}`}
              name="optionPrompt"
              value={optionPrompt}
              onChange={(event) => setOptionPrompt(event.target.value)}
              placeholder="Choose a flavor"
              maxLength={80}
            />
          </div>

          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-xs font-medium">Choices</p>
            <p className="mb-2 text-xs text-muted-foreground">
              These appear in one dropdown. Leave the upcharge blank for no
              extra charge.
            </p>
            <div className="space-y-2">
              {renderOptionRows(
                choices,
                "choice",
                setChoices,
                "choiceLabel",
                "choicePrice",
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() =>
                setChoices((current) => [
                  ...current,
                  { key: nextKey("choice"), label: "", price: "" },
                ])
              }
            >
              <Plus className="size-4" />
              Add choice
            </Button>
          </div>

          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-xs font-medium">Add-ons</p>
            <p className="mb-2 text-xs text-muted-foreground">
              These appear as checkboxes and can be combined with a choice.
            </p>
            <div className="space-y-2">
              {renderOptionRows(
                addons,
                "addon",
                setAddons,
                "addonLabel",
                "addonPrice",
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() =>
                setAddons((current) => [
                  ...current,
                  { key: nextKey("addon"), label: "", price: "" },
                ])
              }
            >
              <Plus className="size-4" />
              Add add-on
            </Button>
          </div>

          <div className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed p-3">
            <div className="min-w-48 flex-1 space-y-1">
              <Label htmlFor={`preset-${key}`}>Quick fill from a preset</Label>
              <select
                id={`preset-${key}`}
                value={presetId}
                onChange={(event) => setPresetId(event.target.value)}
                className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              >
                <option value="">Choose a preset</option>
                {PRODUCT_OPTION_SETS.map((optionSet) => (
                  <option key={optionSet.id} value={optionSet.id}>
                    {optionSet.label}
                  </option>
                ))}
              </select>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={applyPreset}
              disabled={!presetId}
            >
              Add preset
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Leave both lists empty if this product should not have a menu
            dropdown or add-ons.
          </p>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={`description-${product?.id ?? "new"}`}>Description</Label>
          <Textarea
            id={`description-${product?.id ?? "new"}`}
            name="description"
            defaultValue={product?.description ?? ""}
            rows={2}
            maxLength={500}
          />
        </div>
      </div>

      {product ? (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="active"
            defaultChecked={product.active}
            className="size-4 rounded border"
          />
          Available in the menu
        </label>
      ) : null}

      {state.status === "error" ? (
        <p className="text-sm text-destructive">{state.message}</p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : product ? (
          <Save className="size-4" />
        ) : (
          <PackagePlus className="size-4" />
        )}
        {product ? "Save product" : "Add product"}
      </Button>
    </form>
  );
}
