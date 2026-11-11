import type { UserRole } from "@/lib/db";

/**
 * Human-readable map of what each role can reach. This is documentation, not
 * enforcement: the guards in `lib/auth.ts` (`requireStaff`, `requireAdmin`) and
 * the `authorized` callback in `auth.config.ts` decide access. Update this file
 * whenever a page changes its guard so Admin → Roles stays honest.
 */

export type RoleSummary = {
  role: UserRole;
  label: string;
  blurb: string;
  pages: Array<{ href: string; label: string }>;
};

export const roleSummaries: RoleSummary[] = [
  {
    role: "customer",
    label: "Customer",
    blurb: "Students and teachers who order snacks.",
    pages: [
      { href: "/menu", label: "Menu" },
      { href: "/cart", label: "Cart" },
      { href: "/checkout", label: "Checkout" },
      { href: "/orders", label: "My orders" },
      { href: "/dashboard", label: "Dashboard" },
    ],
  },
  {
    role: "staff",
    label: "THM staff",
    blurb: "THM students who stock, sell, and deliver.",
    pages: [
      { href: "/staff", label: "Delivery queue" },
      { href: "/staff/pick-lists", label: "Class pick lists" },
      { href: "/staff/products", label: "Products" },
      { href: "/staff/categories", label: "Categories" },
      { href: "/staff/inventory", label: "Inventory" },
      { href: "/staff/orders", label: "Order history" },
      { href: "/menu", label: "Menu, cart, and orders" },
    ],
  },
  {
    role: "admin",
    label: "Admin",
    blurb: "Sees and changes everything in the app.",
    pages: [
      { href: "/admin", label: "Overview" },
      { href: "/admin/classes", label: "Classes" },
      { href: "/admin/schedule", label: "Schedule" },
      { href: "/admin/users", label: "Users" },
      { href: "/admin/orders", label: "All orders" },
      { href: "/admin/roles", label: "Roles & access" },
      { href: "/admin/settings", label: "Settings" },
      { href: "/staff", label: "Everything THM staff can do" },
    ],
  },
];

export type PermissionRow = {
  area: string;
  capability: string;
  roles: UserRole[];
};

const everyone: UserRole[] = ["customer", "staff", "admin"];
const staffAndUp: UserRole[] = ["staff", "admin"];
const adminsOnly: UserRole[] = ["admin"];

export const permissionMatrix: PermissionRow[] = [
  {
    area: "Ordering",
    capability: "Browse the menu and see prices",
    roles: everyone,
  },
  {
    area: "Ordering",
    capability: "Add items to a cart and check out",
    roles: everyone,
  },
  {
    area: "Ordering",
    capability: "Pay in person at delivery",
    roles: everyone,
  },
  {
    area: "Ordering",
    capability: "View and cancel their own orders",
    roles: everyone,
  },
  {
    area: "Ordering",
    capability: "Print a receipt for an order",
    roles: everyone,
  },
  {
    area: "Ordering",
    capability: "Order outside their class window (for testing)",
    roles: staffAndUp,
  },
  {
    area: "Delivery",
    capability: "See the delivery queue grouped by room",
    roles: staffAndUp,
  },
  {
    area: "Delivery",
    capability: "Move orders through preparing, out for delivery, and delivered",
    roles: staffAndUp,
  },
  {
    area: "Delivery",
    capability: "Mark orders paid at delivery",
    roles: staffAndUp,
  },
  {
    area: "Delivery",
    capability: "Read the full order history",
    roles: staffAndUp,
  },
  {
    area: "Delivery",
    capability: "Print a class pick list of everything to gather",
    roles: staffAndUp,
  },
  {
    area: "Catalog",
    capability: "Create and edit products",
    roles: staffAndUp,
  },
  {
    area: "Catalog",
    capability: "Show or hide products in the menu",
    roles: staffAndUp,
  },
  {
    area: "Catalog",
    capability: "Choose an existing product category",
    roles: staffAndUp,
  },
  {
    area: "Catalog",
    capability: "Add, rename, and delete categories",
    roles: staffAndUp,
  },
  {
    area: "Inventory",
    capability: "Adjust stock and view the movement log",
    roles: staffAndUp,
  },
  {
    area: "School setup",
    capability: "Manage classes and delivery rooms",
    roles: adminsOnly,
  },
  {
    area: "School setup",
    capability: "Set weekly ordering windows per class",
    roles: adminsOnly,
  },
  {
    area: "School setup",
    capability: "Assign people to classes and grant roles",
    roles: adminsOnly,
  },
  {
    area: "School setup",
    capability: "Configure Entra admin/staff groups and school settings",
    roles: adminsOnly,
  },
];
