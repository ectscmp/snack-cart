import { getCurrentUser } from "@/lib/auth";
import { getCartCount } from "@/lib/db";

import { CartFabClient } from "@/components/snack/cart-fab-client";

export async function CartFab() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const count = getCartCount(user.id);

  return <CartFabClient count={count} />;
}
