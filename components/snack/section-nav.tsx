"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";

export function SectionNav({
  links,
  root,
}: {
  links: { href: string; label: string }[];
  root: string;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap items-center gap-1 text-sm">
      {links.map((link) => {
        const active =
          pathname === link.href ||
          (link.href !== root && pathname.startsWith(`${link.href}/`));

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-2.5 py-1.5 font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              active && "bg-muted text-foreground",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
