# Live opening feed

The case room shares actual client-reported reveals across browser sessions. It shows the player's guest name, weapon and finish, rarity, condition, float, and the server's publication time. Newest entries appear first; the shared recent history contains at most 100 results. No simulated other players or seeded production events are added.

## Player experience

On desktop, the feed sits in a sticky right sidebar beside the opener. On smaller screens, it stacks between the opener and the collection.

A random guest name is created and saved on this browser. Change it using Your public name and Save. Names are limited to 24 characters, displayed as text, and attached to openings when they are published. Names are public and not unique or authenticated accounts; each browser also has a random player ID. Other clients do not receive private inventory contents.

The feed connects automatically. Its status shows Connecting, Live, Reconnecting, or Offline. Opening cases continues when the feed is unavailable. The owner sees their result before it is published; Skip and reduced motion complete the same reveal immediately. Reloading during the reel restores the last saved result and publishes it once. Loading old inventory normally does not publish it again.

When you scroll down inside the log, the displayed list stays in place. A new-results button lets you return to the latest results. The feed does not play sounds or take focus on other players' drops. Deleting local items or clearing inventory leaves the opening history intact.

## Connection and recovery

`src/feed/client.ts` maintains a same-origin WebSocket at `/api/feed`. A hello message supplies the persisted guest profile; the server sends a recent-history snapshot and confirms readiness. Each revealed opening queues under its own localStorage key, so acknowledgements in another tab do not overwrite unrelated queued entries. Acknowledgement removes it. Reconnection retries with backoff up to roughly 30 seconds; online and visibility events can reconnect sooner. Ping/pong detects dead connections.

An accepted opening is recorded separately until its reveal finishes. Reload recovery checks that record against the latest saved inventory item before publishing. Once revealed, a failed publication remains queued across reloads where browser storage works. Retries reuse the instance UUID, so lost acknowledgements do not create duplicate feed entries.

The queue keeps up to 200 entries and expires results after 24 hours. It warns when the active queue exceeds the limit or browser storage prevents saving retries; in that case, queued results can last only for this tab. Storage cleanup removes stale feed records. These publication records are separate from inventory, so clearing inventory does not withdraw an already revealed result awaiting delivery.

## Backend

`worker/index.ts` serves static assets and forwards `/api/feed` to a single `OpeningFeed` Durable Object. Its SQLite-backed storage holds the 100 most recent results plus up to 10,000 deduplication records within a 24-hour window. Appended events get a server sequence for stable ordering, and history plus deduplication are updated in one transaction. Existing WebSockets can hibernate; identity and rate counters are serialized on each connection.

The server accepts only well-formed instance UUIDs, item IDs, finite floats in `[0,1)`, bounded wear seeds, and recent opening timestamps. Item names, images, rarity, and condition come from the server catalog and float calculation, rather than client claims. Browser handshakes use the same origin, with a loopback exception for the local Vite proxy. Messages are limited to 2,048 characters and ten application messages per second per connection. The normal client drains its queue at no more than four acknowledged publications per second.

Storage queries live in `worker/feed-storage.ts`. Publication and pruning share a transaction. History pruning deletes by the appended sequence; deduplication pruning deletes by insertion row ID, retaining at most 10,000 records. Expiration uses an index on `publishedAt`. These range queries avoid scanning and sorting all retained records on every opening, and insertion order preserves the newest retry records even when publication timestamps tie. The index is added automatically to existing objects without replacing their tables or namespace.

This validates shape and presentation; it does not verify the client actually rolled the submitted float, authenticate guest names, or prevent a modified client from claiming results. No accounts or server-authoritative economy are introduced. See the [backend decision](adr/0001-shared-opening-feed.md).

## Quotas and recovery

Cloudflare's [Durable Objects pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/) lists a free allowance of five million rows read and 100,000 rows written per day. A row read is database work, not a page view or a returned feed entry. Queries that scan retained rows can exhaust the allowance even with modest player activity. Writes, deletes, and index updates also consume the write allowance; efficient reads do not make the free tier unlimited.

The original per-opening cleanup scanned the retained deduplication set multiple times. A local native-SQLite reproduction with 10,000 retained records measured 50,211 rows read for one publication. Indexed range cleanup reduced that same steady-state operation to nine reads, with duplicate retries taking one. These figures exclude schema initialization, connection snapshots, and bulk expiration: creating the new index reads existing records once, a connection reads up to 100 history entries, and expiration necessarily touches the records being removed. The regression check measures these separately.

If the account reaches its daily read limit, deploying an optimization does not replenish the quota. Wait for the reset specified in the Cloudflare notification, or change the account plan. Local opening and browser inventory do not require the shared feed; unrevealed and queued publications retain the recovery behavior described above. Investigate account metrics as well, since other Durable Objects in the account share its allowance. Deploy the optimized Worker before resuming normal shared-feed traffic after reset.

## Local development

Build and serve the complete game with a local Cloudflare runtime:

```sh
npm run build
npm run dev:worker
```

The built game is available at `http://localhost:8787`. Local Durable Object data persists under `.wrangler/`; no Cloudflare login is needed for local operation. For frontend hot reload, run `npm run dev` in a second terminal and open the Local URL printed by Vite. Vite starts at port 5173 and chooses the next available port if occupied; this project's existing development session uses `http://localhost:5174/`. Vite proxies `/api` and WebSockets to `127.0.0.1:8787`. A Vite-only or static preview session can open cases, but the feed stays disconnected until its backend is running.

## Deployment

`wrangler.jsonc` declares the Worker entry point, ASSETS binding, OPENING_FEED namespace, and the `v1-opening-feed` SQLite migration. The normal `npm run deploy` builds the frontend, typechecks the Worker, and deploys both. Wrangler provisions the declared Durable Object namespace and migration; no separate database service or DigitalOcean server is needed. Retain migration history on later releases. Account access and supported Cloudflare limits still apply.

## Validation

```sh
# With Vite and the local Worker running:
node scripts/feed-check.mjs /absolute/path/to/@playwright/test/index.mjs

# Isolated real Worker/SQLite runtime, including process restart:
node scripts/feed-backend-check.mjs

# Isolated native SQLite counters; no account quota is used:
node scripts/feed-read-check.mjs
```

The browser checks use two independent profiles and actual UI openings to exercise reveal timing, exact float delivery, guest names, duplicates, offline recovery, reload during a reel, inert name markup, stable scrolling, local clearing, and narrow layouts. Backend checks use an isolated temporary SQLite directory and real WebSockets for canonical validation, history bounds, cross-origin handshakes, message limits, duplicate/conflicting IDs, and persistence across a full runtime restart. Protocol tests control IDs, time, and float boundaries with Node's test runner.

The read-cost check executes the production storage functions in an isolated Worker. It seeds the original schema with 1,000 and 10,000 deduplication records, upgrades it, and checks bounded steady-state reads, duplicate/conflicting identities, history and deduplication caps, tied publication timestamps, and bulk expiration. Its diagnostic endpoint exists only in the local test fixture and is excluded from the deployed Worker entry point.

Platform references: [Cloudflare WebSocket hibernation](https://developers.cloudflare.com/durable-objects/best-practices/websockets/), [SQLite-backed Durable Object storage](https://developers.cloudflare.com/durable-objects/best-practices/access-durable-objects-storage/), and [Worker assets bindings and routing](https://developers.cloudflare.com/workers/static-assets/binding/).
