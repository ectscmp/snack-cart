import { NavDropdown } from "@/components/snack/nav-dropdown";
import { NavLink } from "@/components/snack/nav-link";
import { getCurrentUser, isAdmin, isStaff } from "@/lib/auth";

type LinkItem = { href: string; label: string };

export async function NavLinks() {
  const user = await getCurrentUser();

  const groups: { label: string; items: LinkItem[] }[] = [
    { label: "Menu", items: [{ href: "/menu", label: "Menu" }] },
  ];

  if (user) {
    groups.push({
      label: "Orders",
      items: [{ href: "/orders", label: "My orders" }],
    });
    groups.push({
      label: "Dashboard",
      items: [{ href: "/dashboard", label: "Dashboard" }],
    });
  }

  if (user && isStaff(user)) {
    groups.push({
      label: "Delivery",
      items: [
        { href: "/staff", label: "Delivery queue" },
        { href: "/staff/pick-lists", label: "Pick lists" },
        { href: "/staff/products", label: "Products" },
        { href: "/staff/categories", label: "Categories" },
        { href: "/staff/inventory", label: "Inventory" },
        { href: "/staff/orders", label: "History" },
      ],
    });
  }

  if (user && isAdmin(user)) {
    groups.push({
      label: "Admin",
      items: [
        { href: "/admin", label: "Overview" },
        { href: "/admin/classes", label: "Classes" },
        { href: "/admin/schedule", label: "Schedule" },
        { href: "/admin/users", label: "Users" },
        { href: "/admin/orders", label: "Orders" },
        { href: "/admin/roles", label: "Roles & access" },
        { href: "/admin/settings", label: "Settings" },
      ],
    });
  }

  return (
    <nav className="flex items-center gap-1">
      {groups.map((group) =>
        group.items.length === 1 ? (
          <NavLink
            key={group.items[0].href}
            href={group.items[0].href}
            label={group.items[0].label}
          />
        ) : (
          <NavDropdown
            key={group.label}
            label={group.label}
            items={group.items}
          />
        ),
      )}
    </nav>
  );
}
