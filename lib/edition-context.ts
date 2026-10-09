import { AsyncLocalStorage } from "node:async_hooks"

/**
 * The programme year a block of server work is pinned to, set with
 * `withEdition` (lib/edition.ts). `null` means "the current year". Unset
 * (undefined) means "work it out from the request" — see resolveRequestEdition.
 */
export const editionStore = new AsyncLocalStorage<string | null>()
