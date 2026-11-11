import { handlers } from "@/auth";
import { microsoftConfigured } from "@/auth.config";

function notConfigured() {
  return Response.json(
    {
      error:
        "Microsoft sign-in is not configured. Add the AUTH_MICROSOFT_ENTRA_ID_* values to .env.local and restart the server.",
    },
    { status: 503 },
  );
}

export const GET = microsoftConfigured ? handlers.GET : notConfigured;
export const POST = microsoftConfigured ? handlers.POST : notConfigured;
