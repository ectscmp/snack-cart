/**
 * Helpers for reading the signed-in user's Entra ID group membership.
 *
 * Entra can put a `groups` claim in the ID token, but only when the app
 * registration has a groups claim configured. It also omits the claim and sends
 * an overage marker once a user belongs to too many groups. Microsoft Graph's
 * `/me/memberOf` covers both cases with the delegated `User.Read` scope that the
 * provider already requests.
 */

const GRAPH_MEMBER_OF =
  "https://graph.microsoft.com/v1.0/me/transitiveMemberOf?$select=id&$top=999";

/**
 * Returns `null` when the claim is absent (so callers can fall back to Graph)
 * and a de-duplicated array when it is present, even if empty.
 */
export function normalizeGroupIds(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const ids = value.filter(
    (id): id is string => typeof id === "string" && id.length > 0,
  );

  return Array.from(new Set(ids));
}

/**
 * Reads the user's direct memberships from Graph. Returns `null` when the call
 * fails so a transient Graph outage does not clear or change a class.
 */
export async function fetchGroupIdsFromGraph(
  accessToken: string,
): Promise<string[] | null> {
  const ids: string[] = [];
  let next: string | null = GRAPH_MEMBER_OF;

  try {
    // `/me/memberOf` is not transitive, so walk the pages Graph provides.
    for (let page = 0; next && page < 10; page += 1) {
      const response = await fetch(next, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      });

      if (!response.ok) {
        return null;
      }

      const json = (await response.json()) as {
        value?: Array<{ id?: unknown }>;
        "@odata.nextLink"?: unknown;
      };

      if (!Array.isArray(json.value)) {
        return null;
      }

      for (const entry of json.value) {
        if (typeof entry.id === "string" && entry.id.length > 0) {
          ids.push(entry.id);
        }
      }

      next =
        typeof json["@odata.nextLink"] === "string"
          ? json["@odata.nextLink"]
          : null;
    }
  } catch {
    return null;
  }

  return Array.from(new Set(ids));
}
