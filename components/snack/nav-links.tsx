import { NavLink } from "@/components/snack/nav-link";
import { getCurrentUser, isAdmin, isStaff } from "@/lib/auth";

export async function NavLinks({
  variant = "desktop",
}: {
  variant?: "desktop" | "mobile";
}) {
  const user = await getCurrentUser();

  const links = [{ href: "/menu", label: "Menu" }];

  if (user) {
    links.push({ href: "/cart", label: "Cart" });
  }

  links.push({ href: "/orders", label: "My orders" });
  links.push({ href: "/dashboard", label: "Dashboard" });

  if (user && isStaff(user)) {
    links.push({ href: "/staff", label: "Delivery" });
  }

  if (user && isAdmin(user)) {
    links.push({ href: "/admin", label: "Admin" });
  }

  return (
    <nav
      className={
        variant === "mobile"
          ? "flex w-max items-center gap-1 px-2 py-2"
          : "flex items-center gap-1"
      }
    >
      {links.map((link) => (
        <NavLink
          key={link.href}
          href={link.href}
          label={link.label}
          className={variant === "mobile" ? "whitespace-nowrap" : undefined}
        />
      ))}
    </nav>
  );
}
