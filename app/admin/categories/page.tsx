import { redirect } from "next/navigation";

// Category management moved to the staff area so THM students can use it too.
export default function AdminCategoriesRedirectPage() {
  redirect("/staff/categories");
}
