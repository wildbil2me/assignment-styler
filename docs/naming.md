# The name, and everywhere it lives

**Product name, as of 2026-08-21: BBStyler.** This replaces the working name
Betterbaud chosen on 2026-08-12. The repository was renamed separately from
`toomey-sj/blackbaud-styler` to `wildbil2me/assignment-styler` on 2026-08-21.
The repository slug is descriptive; the product, package and extension use
BBStyler.

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

A rename that changes "Blackbaud-safe HTML" to "BBStyler-safe HTML" has
broken the one claim the tool exists to make.

## Where our name appears

Everything below says **BBStyler** as of 2026-08-21 unless the "current value"
column says otherwise.

| Where | What it is | Audience | Cost to change |
| --- | --- | --- | --- |
| `package.json` → `name` | npm package identity, `bbstyler` | internal | free |
| `apps/web/index.html` | `<title>`, social metadata and `og.png` | **public** — browser tab, link previews | free |
| `apps/ext/index.html` | `<title>` of the side panel | public | free |
| `apps/ext/public/manifest.json` | extension `name`, and `action.default_title` | **public** — shown in the browser's extension list | free before publishing to a store; a store listing is a rename with users attached |
| `ui/composer.tsx` | the brand block in the top bar: mark letter, wordmark, "for Blackbaud" strapline | **public** — the most visible instance | free |
| `core/storage.ts` | the failed-import message, "a BBStyler backup" | public, at the moment something goes wrong | free |
| `core/storage.ts` → `backupFilename` | the prefix on every workspace backup file, `bbstyler-<post>-<date>.json` | **public, and durable** — it is the filename sitting in a teacher's Downloads folder for years | free in code; already-downloaded files keep the old name, and `parse()` reads any of them regardless of filename. Pinned by two assertions in `tests/core.test.mjs` — update them in the same commit or the rename is incomplete. Said `content-composer-` until 2026-08-18 and `betterbaud-` until 2026-08-21. |
| `tools/probe/build.mjs` | footer of both generated probe pages | public — other schools receive these | free, but **regenerate the kit** (`npm run probe`) or `docs/*.html` keeps the old name |
| `README.md` | title and prose | **public** | free |
| `CLAUDE.md` | the "What this is" line | internal | free |

## Repository rename completed 2026-08-21

The repository and its Pages base moved together:

- Repository: `wildbil2me/assignment-styler`
- Pages: `https://wildbil2me.github.io/assignment-styler/`
- Vite base: `/assignment-styler/`

GitHub redirects the previous repository URL, but current links should use the
canonical location above.

## Deliberately not renamed

| Where | Current value | Why it stayed |
| --- | --- | --- |
| `core/storage.ts` → `STORAGE_KEY` | `bcc-workspace` | `bcc` is **B**lackbaud **C**ontent **C**omposer, the name two renames ago. It is a `localStorage` / `chrome.storage.local` lookup key, not a label: changing it orphans every workspace already saved on every teacher's machine, silently, with no error and no way back. Nobody sees this string, so there is nothing to gain and a teacher's whole post history to lose. **Leave it wrong.** |
| `docs/style-guide-spec.md`, `docs/style-guide-schema.json` | "Blackbaud Content Composer" | Dated 2026-08-09 and folded in as a historical record. They describe what was decided then; editing them to say something else makes them a worse record. |
| `docs/rebuild-plan-v2.md` | mentions all three old names | It is the log of how the decision was reached, including the three-way split this name resolves. |
| `CLAUDE.md` session-sync section | `assignment-styler: already up to date` | Quotes what the shared git hook prints, which is keyed to the current repo name. |

## Changing the name again

```bash
# Everything that is ours. Read each hit — this pattern is deliberately narrow.
rg -n "BBStyler|bbstyler" --glob '!node_modules'

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

## Why Betterbaud changed

The previous working name was a close play on “Blackbaud” and could read as a
comparative claim about another company's product. BBStyler keeps the connection
to the tool's purpose without presenting itself as a variation of Blackbaud's
brand. This resolves open item #2 in the rebuild plan; it is a naming decision,
not a legal opinion.
