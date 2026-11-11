import { SectionNav } from "@/components/snack/section-nav";

const links = [
  { href: "/staff", label: "Delivery queue" },
  { href: "/staff/pick-lists", label: "Pick lists" },
  { href: "/staff/products", label: "Products" },
  { href: "/staff/categories", label: "Categories" },
  { href: "/staff/inventory", label: "Inventory" },
  { href: "/staff/orders", label: "History" },
];

export function StaffNav() {
  return <SectionNav links={links} root="/staff" />;
}
