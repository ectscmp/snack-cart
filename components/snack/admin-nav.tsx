import { SectionNav } from "@/components/snack/section-nav";

const links = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/classes", label: "Classes" },
  { href: "/admin/schedule", label: "Schedule" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/roles", label: "Roles & access" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/settings", label: "Settings" },
];

export function AdminNav() {
  return (
    <div className="w-full min-w-0 lg:w-auto">
      <SectionNav links={links} root="/admin" />
    </div>
  );
}
