import Link from "next/link";
import {
  LayoutDashboard,
  LogIn,
  LogOut,
  Package,
  ReceiptText,
  ShieldCheck,
  Truck,
} from "lucide-react";

import { signOutAction } from "@/app/auth-actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getCurrentUser, isAdmin, isStaff } from "@/lib/auth";

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?"
  );
}

export async function AuthMenu() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <Button asChild size="sm">
        <Link href="/sign-in">
          <LogIn className="size-4" />
          Sign in
        </Link>
      </Button>
    );
  }

  const staff = isStaff(user);
  const admin = isAdmin(user);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-9 gap-2 px-1.5 sm:pr-2.5">
          <Avatar size="sm">
            {user.image ? <AvatarImage src={user.image} alt="" /> : null}
            <AvatarFallback className="text-[10px]">
              {initials(user.name)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden max-w-32 truncate text-sm sm:inline">
            {user.name}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="space-y-1">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="truncate text-xs font-normal text-muted-foreground">
            {user.email}
          </p>
          <div className="flex flex-wrap gap-1 pt-1">
            {user.roles.map((role) => (
              <Badge key={role} variant="outline" className="capitalize">
                {role}
              </Badge>
            ))}
            {user.className ? (
              <Badge variant="secondary">{user.className}</Badge>
            ) : (
              <Badge variant="outline">No class</Badge>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard">
            <LayoutDashboard className="size-4" />
            Dashboard
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/orders">
            <ReceiptText className="size-4" />
            My orders
          </Link>
        </DropdownMenuItem>
        {staff ? (
          <>
            <DropdownMenuItem asChild>
              <Link href="/staff">
                <Truck className="size-4" />
                Delivery queue
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/staff/products">
                <Package className="size-4" />
                Products &amp; stock
              </Link>
            </DropdownMenuItem>
          </>
        ) : null}
        {admin ? (
          <DropdownMenuItem asChild>
            <Link href="/admin">
              <ShieldCheck className="size-4" />
              Admin
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <form action={signOutAction}>
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full">
              <LogOut className="size-4" />
              Sign out
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
