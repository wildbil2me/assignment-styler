# The name, and everywhere it lives

**Working name, as of 2026-08-12: Betterbaud.** Chosen to stop the three-way
split — repo `blackbaud-styler`, app "Blackbaud Content Composer", package
`blackbaud-content-composer` — which was Open item #1 in
[rebuild-plan-v2.md](rebuild-plan-v2.md).

It is explicitly a *for now* name. This file exists so that changing it later is
a checklist rather than an archaeology exercise.

## The rule that matters

**Two different things are called "Blackbaud" in this repo, and only one of them
is ours to rename.**

- **Our name** — what the tool calls itself. Rename freely.
- **Blackbaud, the product** — every reference to the thing this tool exports
  *to*: `core/compat.ts`, "Blackbaud-safe HTML", "paste into Blackbaud's HTML
  editor", the probe, the compatibility docs. **These are not branding and must
  never be swept up in a rename.** They describe an external system, and a
  find-and-replace that catches them makes the documentation wrong.

A rename that changes "Blackbaud-safe HTML" to "Betterbaud-safe HTML" has
broken the one claim the tool exists to make.

## Where our name appears

Everything below says **Betterbaud** as of 2026-08-12 unless the "current value"
column says otherwise.

| Where | What it is | Audience | Cost to change |
| --- | --- | --- | --- |
| `package.json` → `name` | npm package identity, `betterbaud` | internal | free |
| `apps/web/index.html` | `<title>` and `og:title` | **public** — browser tab, link previews | free |
| `apps/ext/index.html` | `<title>` of the side panel | public | free |
| `apps/ext/public/manifest.json` | extension `name`, and `action.default_title` | **public** — shown in the browser's extension list | free before publishing to a store; a store listing is a rename with users attached |
| `ui/composer.tsx` | the brand block in the top bar: mark letter, wordmark, "for Blackbaud" strapline | **public** — the most visible instance | free |
| `core/storage.ts` | the failed-import message, "a Betterbaud backup" | public, at the moment something goes wrong | free |
| `core/storage.ts` → `backupFilename` | the prefix on every workspace backup file, `betterbaud-<post>-<date>.json` | **public, and durable** — it is the filename sitting in a teacher's Downloads folder for years | free in code; already-downloaded files keep the old name, and `parse()` reads any of them regardless of filename. Pinned by two assertions in `tests/core.test.mjs` — update them in the same commit or the rename is incomplete. Said `content-composer-` until 2026-08-18. |
| `tools/probe/build.mjs` | footer of both generated probe pages | public — other schools receive these | free, but **regenerate the kit** (`npm run probe`) or `docs/*.html` keeps the old name |
| `README.md` | title and prose | **public** | free |
| `CLAUDE.md` | the "What this is" line | internal | free |

## Deliberately not renamed

| Where | Current value | Why it stayed |
| --- | --- | --- |
| The GitHub repo | `blackbaud-styler` | Renaming it changes the live Pages URL, `https://toomey-sj.github.io/blackbaud-styler/`, which is already deployed. GitHub redirects the old repo path, but any bookmark or link people have keeps working only through that redirect. **Cheap now, expensive after other schools have the link.** |
| `vite.config.ts` → `base` | `/blackbaud-styler/` | Must match the repo name exactly or Pages serves a blank page with 404s on every asset. Change it in the same commit as the repo rename, never separately. |
| `core/storage.ts` → `STORAGE_KEY` | `bcc-workspace` | `bcc` is **B**lackbaud **C**ontent **C**omposer, the name two renames ago. It is a `localStorage` / `chrome.storage.local` lookup key, not a label: changing it orphans every workspace already saved on every teacher's machine, silently, with no error and no way back. Nobody sees this string, so there is nothing to gain and a teacher's whole post history to lose. **Leave it wrong.** |
| `docs/style-guide-spec.md`, `docs/style-guide-schema.json` | "Blackbaud Content Composer" | Dated 2026-08-09 and folded in as a historical record. They describe what was decided then; editing them to say something else makes them a worse record. |
| `docs/rebuild-plan-v2.md` | mentions all three old names | It is the log of how the decision was reached, including the three-way split this name resolves. |
| `CLAUDE.md` session-sync section | `blackbaud-styler: already up to date` | Quotes what the shared git hook actually prints, which is keyed to the repo name. |

## Changing the name again

```bash
# Everything that is ours. Read each hit — this pattern is deliberately narrow.
rg -n "Betterbaud|betterbaud" --glob '!node_modules'

# The blast radius of getting it wrong. These must NOT change.
rg -nc "Blackbaud" --glob '!node_modules' core/ docs/blackbaud-compatibility.md
```

Then, in order:

1. Every row in "Where our name appears" above.
2. `npm run probe` — the two `docs/*.html` pages carry a baked-in footer.
3. Renaming the repo? Change `base` in `vite.config.ts` in the same commit, and
   expect the Pages URL to move.
4. `npm run build && npm run build:ext && npm test` — nothing here should touch
   behaviour, so a golden failure means the rename caught something it shouldn't.

## One thing to decide before publishing

Open item #2 in the plan is unresolved and this name touches it directly:
**"Betterbaud" is a closer play on "Blackbaud" than the old name was.** A name
that reads as a comparative claim about another company's product is a different
proposition from one that reads as a description of what the tool does, and the
audience here is other schools who are themselves Blackbaud customers.

Not a legal opinion, and not a reason to change it today — it is a working name
and the whole point of this file is that changing it stays cheap. But it should
be a deliberate decision before the tool is announced anywhere, rather than
something inherited from a placeholder.
