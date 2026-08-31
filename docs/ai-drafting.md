# AI drafting — deferred design

Written 2026-08-12, in Phase 3, at the moment the implementation was deleted.

AI drafting was decided **deferred** on 2026-08-11 ("Decisions", [rebuild-plan-v2.md](rebuild-plan-v2.md)).
Deferring it is what makes a zero-backend, free-to-publish tool possible: a
drafting endpoint needs a server, a server needs a key, and a key needs either a
budget or per-school setup. Nothing in the composer requires one.

This file exists so the deferral costs nothing later. It preserves the two parts
that were actually worth keeping — the prompt and the response schema — from
`app/api/draft/route.ts`, deleted in Phase 3 along with the rest of the
Cloudflare/Next residue.

## Why the code went rather than being left dormant

Carried-forward bug #1. `generate()` posted to `/api/draft`, which only existed
in the deleted Cloudflare build, and its `catch` fell through to
`localGenerate()` — a function that scraped three regexes off the teacher's notes
and then emitted a hardcoded `MACBETH · ACT II` hero regardless of what the notes
said. A teacher who typed notes about a chemistry lab and pressed **Draft with
AI** got Macbeth. Silent, plausible-looking, and wrong.

So the fallback had to go with the endpoint, not just the server. What is left in
the UI is nothing: the draft textarea and the **Draft with AI** button were
removed in Phase 3 rather than left disabled, because a disabled button is a
promise with no date on it.

## The seam, when it comes back

One interface, implemented once, called from `ui/`:

```ts
type Drafter = (notes: string, subject: string) => Promise<Block[]>;
```

Whatever satisfies that — a hosted endpoint, a school's own key entered in the
browser, a local model — plugs in without the composer knowing which. The
important constraint is the one the rest of the tool already honours: **no data
leaves the browser unless the teacher asks it to.** A drafter is the first
feature that would send anything anywhere, so it needs to be opt-in, visibly, per
request.

## Preserved prompt

Sent as `instructions` against the OpenAI Responses API:

> Turn teacher notes into concise student-facing instructional content. Preserve
> facts and wording where practical. Do not invent dates, assignments, readings,
> or links. Choose a clear hierarchy and return 4–8 blocks. Body fields may use
> newlines but no Markdown.

Input was `Subject style: ${subject}\nTeacher notes: ${draft}`, where `subject`
was the palette's display name.

"Do not invent dates, assignments, readings, or links" is the line that matters
most and the one to carry forward verbatim. A composer for school content that
hallucinates a due date is worse than no composer.

## Preserved response schema

Strict JSON schema, `name: "composition"`:

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": ["blocks"],
  "properties": {
    "blocks": {
      "type": "array",
      "minItems": 4,
      "maxItems": 8,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["type", "label", "title", "body", "width", "emoji"],
        "properties": {
          "type": { "type": "string", "enum": ["hero", "intro", "focus", "homework", "deadline", "note", "steps", "checklist", "quote", "targets"] },
          "label": { "type": "string" },
          "title": { "type": "string" },
          "body": { "type": "string" },
          "width": { "type": "string", "enum": ["full", "half"] },
          "emoji": { "type": "string" }
        }
      }
    }
  }
}
```

Two notes for whoever revives this:

- **The `type` enum is stale.** It lists 13 block types; the taxonomy in
  `core/catalog.ts` is 17 since Phase 2. Generate the enum from `blockMeta`
  rather than retyping it, or the drafter will quietly never produce the four
  newest types.
- **Ids are not in the schema, deliberately.** The caller assigned them. Whatever
  assigns them should be the single `nextId()` that carried-forward bug #7 asks
  for, not another `Date.now() + i`.

Model was `gpt-5.6-luna` via `OPENAI_MODEL`, keyed by `OPENAI_API_KEY`, returning
503 when unconfigured. Recorded for completeness; a revived drafter should pick a
current model rather than inherit that one.
