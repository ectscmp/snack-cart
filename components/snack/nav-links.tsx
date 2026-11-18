import { NavLink } from "@/components/snack/nav-link";
import { getCurrentUser, isAdmin, isStaff } from "@/lib/auth";

export async function NavLinks() {
  const user = await getCurrentUser();

  const links = [{ href: "/menu", label: "Menu" }];

  if (user) {
    links.push({ href: "/orders", label: "My orders" });
    links.push({ href: "/dashboard", label: "Dashboard" });
  }

  if (user && isStaff(user)) {
    links.push({ href: "/staff", label: "Delivery" });
  }

  if (user && isAdmin(user)) {
    links.push({ href: "/admin", label: "Admin" });
  }

  return (
    <nav className="flex items-center gap-1">
      {links.map((link) => (
        <NavLink key={link.href} href={link.href} label={link.label} />
      ))}
    </nav>
  );
}
