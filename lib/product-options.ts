export type ProductOptionValue = {
  value: string;
  label: string;
  /** Added to the product's base price when this option is chosen. */
  priceDeltaCents: number;
};

export type ProductOptionSet = {
  id: string;
  /** Name shown when staff pick an option set for a product. */
  label: string;
  /** Label shown above the dropdown on the menu card. */
  prompt: string;
  /** Used in error messages, e.g. "Choose a flavor." */
  choiceLabel: string;
  options: ProductOptionValue[];
};

/**
 * The customer-facing choices staff can attach to a product. Keeping these in
 * one place means the product form, menu card, cart, and orders all agree on
 * the labels and any upcharge.
 */
export const PRODUCT_OPTION_SETS: ProductOptionSet[] = [
  {
    id: "coffee",
    label: "Coffee syrups",
    prompt: "Add a syrup",
    choiceLabel: "syrup",
    options: [
      { value: "none", label: "No syrup", priceDeltaCents: 0 },
      { value: "pumpkin", label: "Pumpkin", priceDeltaCents: 50 },
      { value: "hazelnut", label: "Hazelnut", priceDeltaCents: 50 },
    ],
  },
  {
    id: "candy_bar",
    label: "Candy bars",
    prompt: "Choose a candy bar",
    choiceLabel: "candy bar",
    options: [
      { value: "peanut-mms", label: "Peanut M&M's", priceDeltaCents: 0 },
      { value: "regular-mms", label: "Regular M&M's", priceDeltaCents: 0 },
      { value: "snickers", label: "Snickers", priceDeltaCents: 0 },
      { value: "kit-kat", label: "Kit Kat", priceDeltaCents: 0 },
      { value: "reeses", label: "Reese's", priceDeltaCents: 0 },
      { value: "hershey", label: "Hershey", priceDeltaCents: 0 },
      {
        value: "hershey-almonds",
        label: "Hershey with Almonds",
        priceDeltaCents: 0,
      },
    ],
  },
  {
    id: "miss_vickies",
    label: "Miss Vickies",
    prompt: "Choose a flavor",
    choiceLabel: "Miss Vickies flavor",
    options: [
      { value: "bbq", label: "BBQ", priceDeltaCents: 0 },
      { value: "sea-salt", label: "Sea Salt", priceDeltaCents: 0 },
      { value: "salt-vinegar", label: "Salt & Vinegar", priceDeltaCents: 0 },
      {
        value: "spicy-dill-pickle",
        label: "Spicy Dill Pickle",
        priceDeltaCents: 0,
      },
      { value: "jalapeno", label: "Jalapeño", priceDeltaCents: 0 },
      { value: "original", label: "Original", priceDeltaCents: 0 },
    ],
  },
  {
    id: "alani",
    label: "Alani",
    prompt: "Choose a flavor",
    choiceLabel: "Alani flavor",
    options: [
      { value: "cotton-candy", label: "Cotton Candy", priceDeltaCents: 0 },
      { value: "cherry-slush", label: "Cherry Slush", priceDeltaCents: 0 },
      { value: "pink-slush", label: "Pink Slush", priceDeltaCents: 0 },
      { value: "cherry-twist", label: "Cherry Twist", priceDeltaCents: 0 },
      { value: "orange-sherbet", label: "Orange Sherbet", priceDeltaCents: 0 },
    ],
  },
  {
    id: "bloom",
    label: "Bloom",
    prompt: "Choose a flavor",
    choiceLabel: "Bloom flavor",
    options: [
      { value: "juicy-orange", label: "Juicy Orange", priceDeltaCents: 0 },
      {
        value: "raspberry-lemonade",
        label: "Raspberry Lemonade",
        priceDeltaCents: 0,
      },
      {
        value: "strawberry-watermelon",
        label: "Strawberry Watermelon",
        priceDeltaCents: 0,
      },
    ],
  },
];

export function getProductOptionSet(
  id: string | null | undefined,
): ProductOptionSet | null {
  if (!id) {
    return null;
  }

  return PRODUCT_OPTION_SETS.find((set) => set.id === id) ?? null;
}

/**
 * Accepts a set id or its display label (case-insensitive) so CSV imports can
 * use either "coffee" or "Coffee syrups".
 */
export function normalizeProductOptionSet(value: string | null | undefined): string | null {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  const normalized = trimmed.toLowerCase();
  const match = PRODUCT_OPTION_SETS.find(
    (set) =>
      set.id === normalized || set.label.toLowerCase() === normalized,
  );

  return match?.id ?? null;
}

export function findProductOption(
  optionSetId: string | null | undefined,
  value: string | null | undefined,
): ProductOptionValue | null {
  const set = getProductOptionSet(optionSetId);

  if (!set || !value) {
    return null;
  }

  return set.options.find((option) => option.value === value) ?? null;
}
