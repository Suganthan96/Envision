import { NextResponse } from "next/server"
import { unstable_cache } from "next/cache"
import { getSupabaseServerClient } from "@/lib/supabase-server"

/**
 * Team logos and mentor avatars are stored as base64 `data:` URIs inside
 * `app_users`. Inlining them into list payloads meant every page load shipped
 * ~3.3 MB of image text that the browser could not cache. These handlers
 * serve one image at a time from a stable URL with immutable cache headers,
 * so the browser fetches each image once and the HTML stays small.
 *
 * The URL carries a `?v=` version (an md5 prefix the list RPCs return), so a
 * replaced image gets a new URL and busts the cache on its own.
 */

// 1x1 transparent PNG — returned instead of a 404 so a missing image renders
// as empty space rather than a broken-image icon.
const BLANK_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
)

/** Splits `data:image/png;base64,AAAA…` into its mime type and raw bytes. */
function decodeDataUri(uri: string): { mime: string; bytes: Buffer } | null {
  // [\s\S] rather than the /s flag — the tsconfig target predates es2018.
  const match = /^data:([^;,]+)(;base64)?,([\s\S]*)$/.exec(uri)
  if (!match) return null
  const [, mime, isBase64, payload] = match
  try {
    const bytes = isBase64
      ? Buffer.from(payload, "base64")
      : Buffer.from(decodeURIComponent(payload), "utf8")
    return { mime, bytes }
  } catch {
    return null
  }
}

/**
 * The DB read is cached per login id so repeat requests (and the many
 * parallel requests a grid of cards fires on a cold browser cache) don't each
 * hit Postgres for the same row.
 */
const readImage = unstable_cache(
  async (rpc: string, loginId: string): Promise<string | null> => {
    const supabase = getSupabaseServerClient()
    const { data } = await supabase.rpc(rpc, { p_login_id: loginId })
    return typeof data === "string" && data.length > 0 ? data : null
  },
  ["user-image"],
  { revalidate: 300 },
)

export async function serveUserImage(rpc: string, loginId: string) {
  const uri = await readImage(rpc, loginId)
  const decoded = uri ? decodeDataUri(uri) : null

  if (!decoded) {
    return new NextResponse(new Uint8Array(BLANK_PNG), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        // Short cache: the user may upload an image at any time.
        "Cache-Control": "public, max-age=60",
      },
    })
  }

  return new NextResponse(new Uint8Array(decoded.bytes), {
    status: 200,
    headers: {
      "Content-Type": decoded.mime,
      "Content-Length": String(decoded.bytes.byteLength),
      // The `?v=` version in the URL changes whenever the image does, so the
      // response itself can be cached forever.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  })
}
