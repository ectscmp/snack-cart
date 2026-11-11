import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowUpRight, LockKeyhole, ShieldCheck, TriangleAlert } from "lucide-react";

import { signInWithMicrosoft } from "@/app/auth-actions";
import { microsoftConfigured } from "@/auth.config";
import { MicrosoftIcon } from "@/components/auth/microsoft-icon";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in with your school Microsoft account to order snacks.",
};

type SignInPageProps = {
  searchParams: Promise<{ error?: string; setup?: string }>;
};

const errorMessages: Record<string, string> = {
  AccessDenied:
    "That Microsoft account is not allowed to access this app. Use an account from your organization.",
  Configuration:
    "Microsoft sign-in is not configured correctly. Check the Entra ID values in .env.local.",
  OAuthAccountNotLinked:
    "That Microsoft account is already linked to another sign-in method.",
  OAuthCallbackError:
    "Microsoft returned an error while completing sign-in. Please try again.",
  OAuthSignin: "Could not start Microsoft sign-in. Please try again.",
  Verification: "That sign-in link is no longer valid.",
};

export default function SignInPage({ searchParams }: SignInPageProps) {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />

      <main className="flex flex-1 items-center justify-center px-4 py-12 sm:py-16">
        <Suspense fallback={<SignInSkeleton />}>
          <SignInContent searchParams={searchParams} />
        </Suspense>
      </main>

      <SiteFooter />
    </div>
  );
}

async function SignInContent({ searchParams }: SignInPageProps) {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const setupRequired = !microsoftConfigured || params.setup === "required";
  const errorMessage = params.error
    ? (errorMessages[params.error] ??
      "Microsoft sign-in could not be completed. Please try again.")
    : null;

  return (
    <div className="w-full max-w-sm space-y-4">
      <Card>
        <CardHeader className="text-center">
          <span className="mx-auto flex size-11 items-center justify-center rounded-xl border bg-background">
            <MicrosoftIcon className="size-5" />
          </span>
          <CardTitle className="mt-2 text-xl">Sign in to Snack Cart</CardTitle>
          <CardDescription>
            Use your school Microsoft account to order snacks and track
            deliveries.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {errorMessage ? (
            <div
              role="alert"
              className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive"
            >
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <p>{errorMessage}</p>
            </div>
          ) : null}

          {setupRequired ? (
            <SetupRequired />
          ) : (
            <form action={signInWithMicrosoft}>
              <Button type="submit" className="w-full gap-2">
                <MicrosoftIcon className="size-4" />
                Sign in with Microsoft
              </Button>
            </form>
          )}

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-4 shrink-0" />
            <p>
              Authentication is handled by Microsoft Entra ID. This app never
              sees your password.
            </p>
          </div>
        </CardContent>

        <CardFooter className="justify-center border-t pt-4">
          <Button asChild variant="ghost" size="sm">
            <Link href="/">
              <ArrowLeft className="size-4" />
              Back to home
            </Link>
          </Button>
        </CardFooter>
      </Card>

      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
        <LockKeyhole className="size-3.5" />
        Access is limited to your Microsoft Entra tenant.
      </p>
    </div>
  );
}

function SetupRequired() {
  return (
    <div className="space-y-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-xs">
      <div className="flex items-center gap-2 font-medium text-amber-700 dark:text-amber-400">
        <TriangleAlert className="size-4" />
        Microsoft sign-in needs an app registration
      </div>
      <ol className="list-decimal space-y-1.5 pl-4 text-muted-foreground">
        <li>
          Register an app in the{" "}
          <a
            href="https://entra.microsoft.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-0.5 underline underline-offset-2 hover:text-foreground"
          >
            Microsoft Entra admin center
            <ArrowUpRight className="size-3" />
          </a>
          .
        </li>
        <li>
          Add the redirect URI{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
            http://localhost:3000/api/auth/callback
          </code>
          .
        </li>
        <li>
          Create a client secret, then add the client ID, secret value, and
          tenant ID to <code className="font-mono">.env.local</code>.
        </li>
        <li>Restart the dev server.</li>
      </ol>
      <p className="text-muted-foreground">
        Full steps are in <code className="font-mono">README.md</code>.
      </p>
    </div>
  );
}

function SignInSkeleton() {
  return (
    <div className="w-full max-w-sm">
      <Card>
        <CardHeader className="items-center text-center">
          <Skeleton className="size-11 rounded-xl" />
          <Skeleton className="mt-2 h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
