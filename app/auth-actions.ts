"use server";

import { redirect } from "next/navigation";

import { signIn, signOut } from "@/auth";
import { microsoftConfigured } from "@/auth.config";

export async function signInWithMicrosoft() {
  if (!microsoftConfigured) {
    redirect("/sign-in?setup=required");
  }

  await signIn("microsoft-entra-id", { redirectTo: "/dashboard" });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
