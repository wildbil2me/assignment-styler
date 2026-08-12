# Blackbaud Content Composer — Class Style Guide Specification

> **Status, 2026-08-12.** Written 2026-08-09 at the repository root, one
> directory above the code, and never referenced by it. Phase 2 folded it in and
> moved it here with its schema (`style-guide-schema.json`) and its worked
> example (`ap-english-literature-style-profile.json`), so there is one set of
> plans in one directory.
>
> **What was adopted.** The token vocabulary in §2 is now the shape of
> `core/model.ts`'s `Profile` — fonts, font sizes, line heights, weights,
> spacing, borders, icons — and the colour tokens became `core/palettes.ts`.
> The split this document drew between *content intent* and *presentation
> decisions* is the profile × palette split the rebuild plan turns on, and this
> document got there first. `ap-english-literature-style-profile.json` seeded
> `core/profiles/editorial.ts`.
>
> **What was trimmed, and why.**
>
> - `allowedChildren` and nested components (§3): the block model is
>   deliberately flat, so there is nothing for a child rule to constrain.
> - `groupingRules` (§4): composition advice a composer with no backend has no
>   useful way to enforce.
> - Per-component `variants` (§3): the same axis as profiles, one level down.
>   A block's *role* (`tone` in `core/catalog.ts`) plus the active profile
>   already decides its treatment; per-component variants would be a second,
>   overlapping way to say the same thing.
> - The `compatibility` block (§5): superseded by `core/compat.ts`, which is
>   **measured** against a real tenant rather than assumed, and per-surface.
>   Compare its `avoidStyles` list against `blackbaud-compatibility.md`: `float`,
>   `grid` and `column-count` were guesses, and two of the three turned out fine.
>
> Sections 6 (AI drafting input schema) and 7 remain unimplemented by design —
> AI drafting is deferred behind a `Drafter` seam.

## Purpose

This document defines the schema for a class-level style guide used by the Blackbaud Content Composer MVP.
The style guide separates:

- Content intent (instructional component types)
- Presentation decisions (visual language)
- Blackbaud compatibility (safe export rules)

It is designed to be machine-readable for the composer and human-readable for class owners.

## Goals

1. Enable a small, stable component vocabulary for instructional content.
2. Capture design tokens and component treatments separately.
3. Produce inline-safe HTML for Blackbaud copy/paste export.
4. Support a lightweight AI drafting workflow centered on semantic instruction blocks.

---

## 1. Style Guide Schema Overview

### Root object

- `classProfile`
  - `id` (string)
  - `name` (string)
  - `description` (string)
  - `tokens` (object)
  - `components` (object)
  - `compositionRules` (object)
  - `compatibility` (object)

### Example

```json
{
  "classProfile": {
    "id": "ap-english-literature",
    "name": "AP English Literature",
    "description": "Academic literature style for student-facing instructional pages.",
    "tokens": { ... },
    "components": { ... },
    "compositionRules": { ... },
    "compatibility": { ... }
  }
}
```

---

## 2. Tokens

### Typography tokens

- `fonts`
  - `body` (string)
  - `heading` (string)

- `fontSizes`
  - `title` (string)
  - `section` (string)
  - `subsection` (string)
  - `body` (string)
  - `muted` (string)
  - `label` (string)

- `lineHeights`
  - `body` (string)
  - `heading` (string)

- `fontWeights`
  - `normal` (string)
  - `semibold` (string)
  - `bold` (string)

### Color tokens

- `colors`
  - `primary` (string)
  - `accent` (string)
  - `text` (string)
  - `mutedText` (string)
  - `background` (string)
  - `surface` (string)
  - `border` (string)
  - `success` (string)
  - `warning` (string)
  - `danger` (string)

### Spacing tokens

- `spacing`
  - `xxs` (string)
  - `xs` (string)
  - `sm` (string)
  - `md` (string)
  - `lg` (string)
  - `xl` (string)

### Border tokens

- `borders`
  - `radius` (string)
  - `width` (string)
  - `divider` (string)

### Icon language

- `icons`
  - `type` (`emoji` | `text` | `none`)
  - `defaultMap` (object)
    - e.g. `info`, `warning`, `homework`, `deadline`

---

## 3. Component Vocabulary

Each component maps to a behavior and a semantic export treatment.
Components are the interface teachers use in the composer.

### Core components

- `hero`
  - Purpose: page/topic identity and unit label.
  - Properties: `title`, `subtitle`, `metadata`

- `section`
  - Purpose: major content division.
  - Properties: `heading`, `body`

- `intro`
  - Purpose: short explanatory opening.
  - Properties: `body`

- `reading`
  - Purpose: assigned text or media.
  - Properties: `item`, `details`, `instructions`

- `focus`
  - Purpose: guiding ideas, focus questions, anchors.
  - Properties: `headline`, `body`, `list`

- `homework`
  - Purpose: required student action.
  - Properties: `task`, `due`, `notes`

- `deadline`
  - Purpose: date-sensitive callout.
  - Properties: `label`, `date`, `summary`

- `question`
  - Purpose: discussion, reflection, exit ticket.
  - Properties: `prompt`, `type`, `notes`

- `resource`
  - Purpose: links/files/media references.
  - Properties: `title`, `url`, `description`, `type`

- `quote`
  - Purpose: textual evidence or inspiration.
  - Properties: `text`, `source`

- `note`
  - Purpose: secondary information.
  - Properties: `body`

- `warning`
  - Purpose: critical caution or important message.
  - Properties: `body`

- `divider`
  - Purpose: visual separation.
  - Properties: `style`

### Component variants

Each component may define variants to control visual treatment.

Example `homework` variants:

- `standard`
- `urgent`
- `optional`

Example `focus` variants:

- `keyIdeas`
- `questions`
- `vocabulary`

Example `resource` variants:

- `reading`
- `video`
- `website`
- `document`

### Component definition schema

- `displayName` (string)
- `description` (string)
- `variants` (object)
- `defaultVariant` (string)
- `styleRules` (object)
- `allowedChildren` (array of component keys)
- `requiredFields` (array of strings)

Example:

```json
"homework": {
  "displayName": "Homework",
  "description": "Required student action with due date.",
  "variants": {
    "standard": {
      "label": "Homework",
      "icon": "📘",
      "style": { ... }
    },
    "urgent": {
      "label": "Urgent Homework",
      "icon": "⚠️",
      "style": { ... }
    }
  },
  "defaultVariant": "standard",
  "requiredFields": ["task"],
  "styleRules": {
    "background": "surface",
    "borderColor": "accent",
    "labelColor": "accent"
  }
}
```

---

## 4. Composition Rules

Composition rules define how the composer can arrange components and what combinations are recommended.

### Page structure

- `allowedTopLevelComponents` (array)
- `requiredAtLeastOne` (array)
- `maxInstances` (object)
- `groupingRules` (object)

### Example

```json
"compositionRules": {
  "allowedTopLevelComponents": ["hero", "intro", "reading", "focus", "homework", "deadline", "question", "resource", "note", "warning", "divider"],
  "requiredAtLeastOne": ["hero", "intro", "reading", "homework"],
  "maxInstances": {
    "hero": 1,
    "deadline": 2,
    "divider": 5
  },
  "groupingRules": {
    "hero": ["intro", "reading", "focus"],
    "reading": ["focus", "homework", "deadline"],
    "focus": ["question", "resource"]
  }
}
```

### Style density

- `maxVisualTreatmentsPerPage` (integer)
- `maxAccentBlocksInRow` (integer)
- `suggestedSpacing` (object)

### Accessibility rules

- `minContrastRatio` (number)
- `minFontSize` (string)
- `strongHeadingHierarchy` (boolean)

---

## 5. Compatibility Rules

This section captures Blackbaud-safe constraints and renderer behavior.

### Export constraints

- `exportMode` ("inline-html")
- `safeElements` (array)
  - `div`, `p`, `ul`, `ol`, `li`, `strong`, `em`, `a`, `img`, `table`, `tbody`, `tr`, `td`, `th`, `blockquote`, `h1`, `h2`, `h3`, `h4`, `span`
- `safeStyles` (array)
  - `color`, `background-color`, `font-size`, `font-weight`, `font-style`, `text-decoration`, `padding`, `margin`, `border`, `width`, `max-width`, `min-width`, `line-height`, `text-align`, `vertical-align`, `display`
- `avoidStyles` (array)
  - `position`, `float`, `grid`, `column-count`, `animation`, `transform`, `filter`
- `maxImageWidth` (string)
- `tableFallback` (boolean)

### Renderer rules

- Inline every style needed for component appearance.
- Prefer semantic headings for `hero` and `section`.
- Use one-cell tables for complex boxed treatments when necessary.
- Constrain images to `max-width: 100%` and `height: auto`.
- Generate `alt` text for every image, defaulting to `description` or `title`.
- Rewrite links to include descriptive text.

### Linting checks

- `warningsOnMissingAlt` (boolean)
- `warningsOnLowContrast` (boolean)
- `warningsOnWideTables` (boolean)
- `warningsOnUnsupportedStyles` (boolean)

Example compatibility object:

```json
"compatibility": {
  "exportMode": "inline-html",
  "safeElements": ["div","p","ul","ol","li","strong","em","a","img","table","tbody","tr","td","th","blockquote","h1","h2","h3","h4","span"],
  "safeStyles": ["color","background-color","font-size","font-weight","font-style","text-decoration","padding","margin","border","width","max-width","min-width","line-height","text-align","vertical-align","display"],
  "avoidStyles": ["position","float","grid","column-count","animation","transform","filter"],
  "maxImageWidth": "100%",
  "tableFallback": true,
  "warningsOnMissingAlt": true,
  "warningsOnLowContrast": true,
  "warningsOnWideTables": true,
  "warningsOnUnsupportedStyles": true
}
```

---

## 6. AI Drafting Input Schema

This schema defines the semantic fields the agent should infer from user prose.

- `title` (string)
- `unit` (string)
- `overview` (string)
- `learningTargets` (array of strings)
- `readingAssignment` (object)
  - `text` (string)
  - `dueDate` (string)
- `studentActions` (array of strings)
- `keyQuestions` (array of strings)
- `reminders` (array of strings)
- `resources` (array of objects)
  - `title` (string)
  - `url` (string)
  - `description` (string)
- `deadline` (object)
  - `label` (string)
  - `date` (string)
  - `note` (string)

Example AI output structure:

```json
{
  "title": "Macbeth · Act II",
  "overview": "Tonight we move into the consequences of Duncan's murder.",
  "readingAssignment": {
    "text": "Act II, Scenes 1–2",
    "dueDate": "Thursday"
  },
  "keyQuestions": ["What motivates Macbeth?", "How does Lady Macbeth influence him?", "Find two examples of imagery connected to guilt."],
  "studentActions": ["Bring one discussion question."],
  "reminders": ["Vocabulary quiz Thursday."],
  "resources": []
}
```

---

## 7. Export Model and Component Mapping

### Internal model

The composer should maintain an internal block model such as:

- `blockId` (string)
- `component` (one of the component keys)
- `variant` (string)
- `content` (object)
- `styleOverride` (object optional)

### Export mapping

Each component maps to a renderer function that produces conservative HTML.

Examples:

- `hero` → `<h1>`, `<p>` with inline styles
- `reading` → boxed `<div>` or a one-cell `<table>` with heading and list
- `focus` → styled `<div>` with bullet list or paragraphs
- `deadline` → colored `<div>` with bold label and date

### Renderer responsibilities

- Use `styleRules` from the style guide to determine visual appearance.
- Prefer text-based semantic structure.
- Fall back to safe table wrappers for boxed treatments only when required.
- Generate a compatibility summary object for the lint step.

---

## 8. Example Style Guide Snippet

```json
{
  "classProfile": {
    "id": "ap-english-literature",
    "name": "AP English Literature",
    "description": "Literary instructional content with editorial structure.",
    "tokens": {
      "fonts": {
        "body": "Arial, sans-serif",
        "heading": "Georgia, serif"
      },
      "fontSizes": {
        "title": "24px",
        "section": "18px",
        "subsection": "16px",
        "body": "14px",
        "muted": "13px",
        "label": "12px"
      },
      "lineHeights": {
        "body": "1.6",
        "heading": "1.2"
      },
      "colors": {
        "primary": "#243B53",
        "accent": "#C99700",
        "text": "#1F2937",
        "mutedText": "#4B5563",
        "background": "#FFFFFF",
        "surface": "#F8FAFC",
        "border": "#E2E8F0",
        "warning": "#F59E0B"
      },
      "spacing": {
        "xs": "6px",
        "sm": "10px",
        "md": "14px",
        "lg": "20px",
        "xl": "28px"
      },
      "borders": {
        "radius": "8px",
        "width": "1px",
        "divider": "1px solid #E2E8F0"
      },
      "icons": {
        "type": "emoji",
        "defaultMap": {
          "homework": "📘",
          "deadline": "⚠️",
          "warning": "⚠️",
          "focus": "💭"
        }
      }
    },
    "components": {
      "hero": {
        "displayName": "Page Title",
        "description": "High-level identity for this post.",
        "variants": {
          "default": {
            "label": "Title",
            "style": {
              "fontSize": "title",
              "fontWeight": "bold",
              "color": "primary",
              "marginBottom": "md"
            }
          }
        },
        "defaultVariant": "default",
        "requiredFields": ["title"]
      }
    }
  }
}
```

---

## 9. Recommended File Formats

The style guide should be consumable in one of these forms:

- JSON (`.json`) for programmatic ingestion
- YAML (`.yaml` or `.yml`) for readable configuration
- Markdown with embedded JSON examples for design discussion

If the first implementation is in Markdown, include a machine-readable JSON schema section.

---

## 10. Implementation Notes

- The composer should treat the style guide as authoritative for visual treatment.
- The renderer should never rely on external CSS or JS.
- The AI drafting model should use the component semantics and style profile to choose components and variants.
- Compatibility constraints can be updated as Blackbaud behavior is discovered.

---

## 11. Next Step

Use this specification to create:

1. a JSON schema for `classProfile`
2. a default `ap-english-literature` style profile
3. the first composer data model and renderer mapping

These deliverables will let the MVP prototype generate preview HTML and copy-safe output.
