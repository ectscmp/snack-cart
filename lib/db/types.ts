export type UserRole = "customer" | "staff" | "admin";

export type AppUser = {
  id: string;
  email: string;
  name: string;
  image: string | null;
  classId: number | null;
  className: string | null;
  classRoom: string | null;
  room: string | null;
  roles: UserRole[];
  createdAt: string;
};

export type ClassRecord = {
  id: number;
  name: string;
  gradeLevel: string | null;
  room: string;
  teacherName: string | null;
  /** Entra ID security group object id that assigns members to this class. */
  entraGroupId: string | null;
  active: boolean;
  createdAt: string;
};

export type OrderingWindow = {
  id: number;
  classId: number;
  className: string;
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
  label: string | null;
  active: boolean;
  validFrom: string | null;
  validTo: string | null;
};

export type OrderingStatus =
  | {
      open: true;
      reason: "window" | "staff";
      window: OrderingWindow | null;
      nextWindow: OrderingWindow | null;
    }
  | {
      open: false;
      reason: "disabled" | "no-class" | "outside-window";
      window: null;
      nextWindow: OrderingWindow | null;
    };

export type Category = {
  id: number;
  name: string;
  /** Set for a subcategory; null for a top-level category. */
  parentId: number | null;
  sortOrder: number;
};

export type CategoryWithUsage = Category & {
  productCount: number;
};

export type Product = {
  id: number;
  name: string;
  description: string | null;
  priceCents: number;
  /** Leaf category name. */
  category: string;
  categoryId: number | null;
  /** Top-level category name when this product is in a subcategory. */
  categoryParent: string | null;
  /** "Parent / Child" for subcategories, otherwise just the category. */
  categoryPath: string;
  imageUrl: string | null;
  active: boolean;
  stockQuantity: number;
  lowStockThreshold: number;
  createdAt: string;
  updatedAt: string;
};

export type InventoryMovement = {
  id: number;
  productId: number;
  productName: string;
  delta: number;
  reason: "initial" | "restock" | "order" | "cancel" | "adjustment";
  orderId: number | null;
  note: string | null;
  actorId: string | null;
  actorName: string | null;
  createdAt: string;
};

export type CartLine = {
  productId: number;
  name: string;
  priceCents: number;
  quantity: number;
  stockQuantity: number;
  imageUrl: string | null;
  lineTotalCents: number;
};

export type Cart = {
  items: CartLine[];
  itemCount: number;
  subtotalCents: number;
};

export type OrderStatus =
  | "awaiting_payment"
  | "pending"
  | "preparing"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export type PaymentStatus = "unpaid" | "paid" | "refunded";

export type OrderItem = {
  id: number;
  productId: number | null;
  productName: string;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
};

export type OrderEvent = {
  id: number;
  orderId: number;
  status: OrderStatus;
  actorId: string | null;
  actorName: string | null;
  note: string | null;
  createdAt: string;
};

export type Order = {
  id: number;
  customerId: string;
  customerName: string;
  customerEmail: string;
  classId: number | null;
  className: string | null;
  deliveryRoom: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  subtotalCents: number;
  note: string | null;
  placedAt: string;
  updatedAt: string;
  expiresAt: string | null;
  deliveredAt: string | null;
  deliveredBy: string | null;
  items: OrderItem[];
  events: OrderEvent[];
};

export type Settings = {
  schoolName: string;
  timezone: string;
  orderingEnabled: boolean;
  maxItemsPerOrder: number;
  maxOpenOrders: number;
  deliveryNote: string | null;
  /** Entra group whose members are granted the `admin` role at sign-in. */
  adminGroupId: string | null;
  /** Entra group whose members are granted the `staff` role at sign-in. */
  staffGroupId: string | null;
};
