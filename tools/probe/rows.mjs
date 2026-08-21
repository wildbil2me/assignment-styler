/**
 * Blackbaud compatibility probe — row definitions.
 *
 * Each row isolates ONE property, element, or delivery mechanism, and carries a
 * visible `[Rnn]` marker *inside* the element under test. The marker is plain
 * text, so it survives anything Blackbaud does; the analyzer locates it and
 * inspects what is left around it.
 *
 * Rows are ordered by stakes, highest first. A truncated paste still answers
 * the questions that decide the architecture.
 *
 * check kinds:
 *   style:<prop>   the inline style declaring <prop> is still on the marker
 *                  element (or within 3 ancestors)
 *   attr:<name>    the attribute is still on the marker element
 *   tag:<name>     an element of <name> is still self/ancestor of the marker
 *   has:<name>     an element of <name> is still self/descendant of the marker
 *   doc:<needle>   a <style> element containing <needle> survives anywhere
 *   manual         needs your eyes; the analyzer will ask
 */

export const TIERS = {
  1: "Decides the chosen direction and the architecture",
  2: "Layout alternatives and style delivery",
  3: "Typography and modern feel",
  4: "Elements and structure",
  5: "Motion (backburner, cheap to answer now)",
};

export const rows = [
  // ---- Tier 1 -------------------------------------------------------------
  {
    id: "R01", tier: 1, name: "inline style on a div", stakes: "critical",
    why: "The baseline assumption of the entire design. If this fails, nothing else matters and the project needs a different strategy.",
    expect: "The box below has a pale blue fill and a visible border.",
    check: "style:background-color",
    html: `<div style="background-color:#E8F0FA;border:1px solid #9DB8D8;padding:14px;">[R01] inline style on a div</div>`,
  },
  {
    id: "R02", tier: 1, name: "border-radius", stakes: "critical",
    why: "Soft cards is built on this. If it is stripped, the chosen direction degrades to flat squares and the pick is worth revisiting.",
    expect: "The box below has clearly ROUNDED corners.",
    check: "style:border-radius",
    html: `<div style="background-color:#F1F5FA;border:1px solid #E1E9F2;border-radius:16px;padding:14px;">[R02] border-radius: 16px &mdash; are these corners round?</div>`,
  },
  {
    id: "R03", tier: 1, name: "box-shadow", stakes: "critical",
    why: "The other half of soft cards. Provides the layering that reads as modern.",
    expect: "The box below appears to float, with a soft shadow beneath it.",
    check: "style:box-shadow",
    html: `<div style="background-color:#FFFFFF;border:1px solid #E4EBF3;border-radius:16px;padding:14px;box-shadow:0 1px 2px rgba(16,24,40,0.04),0 8px 20px rgba(16,24,40,0.08);">[R03] box-shadow &mdash; is there a soft shadow under this box?</div>`,
  },
  {
    id: "R04", tier: 1, name: "tinted background-color", stakes: "critical",
    why: "Every non-hero block is a tinted surface. Also the safest fallback if radius and shadow are stripped.",
    expect: "Three boxes below, each a different pale tint.",
    check: "style:background-color",
    html: `<div style="background-color:#FFFBF0;padding:12px;">[R04a] warm tint</div><div style="background-color:#EAF1F9;padding:12px;">[R04b] cool tint</div><div style="background-color:#243B53;color:#FFFFFF;padding:12px;">[R04c] dark fill with light text</div>`,
  },
  {
    id: "R05", tier: 1, name: "rgba() colour values", stakes: "high",
    why: "Shadows and subtle overlays depend on alpha. If rgba is rewritten to hex, transparency is lost silently.",
    expect: "The box below has a semi-transparent dark tint, not a solid block.",
    check: "style:background-color",
    html: `<div style="background-color:rgba(36,59,83,0.12);padding:14px;">[R05] rgba(36,59,83,0.12) &mdash; is this a light tint rather than solid navy?</div>`,
  },
  {
    id: "R06", tier: 1, name: "<style> block with a class rule", stakes: "critical",
    why: "THE architectural question. If a style block survives, the whole inline-only strategy is optional and motion becomes possible.",
    expect: "The text below is LARGE, BOLD and GREEN. If it looks like ordinary text, the style block was stripped.",
    check: "doc:.probe-styled",
    html: `<style>.probe-styled{color:#0A7A3C;font-size:22px;font-weight:700;}</style><p class="probe-styled">[R06] if this is large, bold and green, the style block survived</p>`,
  },
  {
    id: "R07", tier: 1, name: "inline-block + calc() + min-width", stakes: "critical",
    why: "The current half-width strategy, and the one piece of real cleverness in the renderer: responsive stacking with no media query. Verify before anything is built on it.",
    expect: "Two boxes SIDE BY SIDE on a wide screen, stacking on a narrow one.",
    check: "style:width",
    html: `<div style="display:inline-block;vertical-align:top;width:calc(50% - 16px);min-width:250px;margin:0 24px 0 0;background-color:#EEF3F8;padding:14px;">[R07a] left half &mdash; calc(50% - 16px)</div><div style="display:inline-block;vertical-align:top;width:calc(50% - 16px);min-width:250px;background-color:#FDF4DC;padding:14px;">[R07b] right half &mdash; should sit beside R07a</div>`,
  },
  {
    id: "R08", tier: 1, name: "thick border-left accent bar", stakes: "high",
    why: "Core to the visual identity across all three directions, and the cheapest way to signal block type if fills are stripped.",
    expect: "A thick gold bar down the left edge of the box.",
    check: "style:border-left",
    html: `<div style="background-color:#FDF4DC;border-left:6px solid #C99700;padding:14px;">[R08] border-left: 6px solid &mdash; is there a thick gold bar on the left?</div>`,
  },

  // ---- Tier 2 -------------------------------------------------------------
  {
    id: "R09", tier: 2, name: "display:flex", stakes: "medium",
    why: "Would simplify layout enormously if it survives. Would let the half-width strategy stop being a trick.",
    expect: "Two boxes side by side, sharing the width evenly.",
    check: "style:display",
    html: `<div style="display:flex;gap:16px;"><div style="flex:1;background-color:#EEF3F8;padding:14px;">[R09a] flex child</div><div style="flex:1;background-color:#FDF4DC;padding:14px;">[R09b] flex child</div></div>`,
  },
  {
    id: "R42", tier: 2, name: "flex-wrap on a flex row", stakes: "high",
    why: "Added 2026-08-12 by Phase 2. The renderer's half-width row asks for display:flex so two cards reach equal heights, but flex without wrapping overflows a phone instead of stacking — so the wrapper is only emitted when this row passes. R09 established that display:flex survives and that unknown properties in the same attribute (gap) come back intact, which is why core/compat.ts currently infers this as true. This row settles it.",
    expect: "Three boxes that WRAP onto a second line rather than squeezing onto one.",
    check: "style:flex-wrap",
    html: `<div style="display:flex;flex-wrap:wrap;"><div style="display:inline-block;vertical-align:top;width:calc(50% - 16px);min-width:250px;margin:0 24px 0 0;background-color:#EEF3F8;padding:14px;">[R42a] first half</div><div style="display:inline-block;vertical-align:top;width:calc(50% - 16px);min-width:250px;background-color:#FDF4DC;padding:14px;">[R42b] should sit beside R42a</div><div style="display:inline-block;vertical-align:top;width:calc(50% - 16px);min-width:250px;background-color:#E9F2EC;padding:14px;">[R42c] should wrap onto its own line</div></div>`,
  },
  {
    id: "R10", tier: 2, name: "display:grid", stakes: "medium",
    why: "Same as flex. Also the only clean way to do a real multi-column study guide.",
    expect: "Two boxes side by side in equal columns.",
    check: "style:display",
    html: `<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;"><div style="background-color:#EEF3F8;padding:14px;">[R10a] grid cell</div><div style="background-color:#FDF4DC;padding:14px;">[R10b] grid cell</div></div>`,
  },
  {
    id: "R11", tier: 2, name: "two-column <table>", stakes: "high",
    why: "The conservative fallback if every modern layout method fails. Email HTML has survived on tables for 25 years.",
    expect: "Two cells side by side.",
    check: "tag:table",
    html: `<table style="width:100%;border-collapse:collapse;"><tbody><tr><td style="width:50%;background-color:#EEF3F8;padding:14px;vertical-align:top;">[R11a] table cell</td><td style="width:50%;background-color:#FDF4DC;padding:14px;vertical-align:top;">[R11b] table cell</td></tr></tbody></table>`,
  },
  {
    id: "R12", tier: 2, name: "float:left", stakes: "low",
    why: "The older conservative fallback. Worth one row in case inline-block is the thing that fails.",
    expect: "Two boxes side by side.",
    check: "style:float",
    html: `<div style="overflow:hidden;"><div style="float:left;width:46%;background-color:#EEF3F8;padding:14px;">[R12a] float left</div><div style="float:left;width:46%;margin-left:4%;background-color:#FDF4DC;padding:14px;">[R12b] float left</div></div>`,
  },
  {
    id: "R13", tier: 2, name: "max-width + margin:0 auto wrapper", stakes: "high",
    why: "The renderer's outer container. If the wrapper is stripped, every post runs the full width of the surface.",
    expect: "The box below is narrower than the page and centred.",
    check: "style:max-width",
    html: `<div style="max-width:420px;margin:0 auto;background-color:#EEF3F8;padding:14px;">[R13] max-width 420px, centred &mdash; is this narrower than the page?</div>`,
  },
  {
    id: "R14", tier: 2, name: "class attribute retention", stakes: "medium",
    why: "If classes survive but style blocks do not, a tenant-side stylesheet becomes an option worth knowing about.",
    expect: "Nothing visual. The analyzer checks whether the attribute is still there.",
    check: "attr:class",
    html: `<div class="probe-class-marker" style="background-color:#F3F6F9;padding:12px;">[R14] this div carries class="probe-class-marker"</div>`,
  },
  {
    id: "R15", tier: 2, name: "data-* attribute retention", stakes: "medium",
    why: "The current renderer emits data-layout on every block. If data attributes are stripped, the importer loses its best round-trip signal.",
    expect: "Nothing visual. The analyzer checks whether the attribute is still there.",
    check: "attr:data-layout",
    html: `<div data-layout="half" style="background-color:#F3F6F9;padding:12px;">[R15] this div carries data-layout="half"</div>`,
  },
  {
    id: "R16", tier: 2, name: "!important in an inline style", stakes: "medium",
    why: "The escape hatch if Blackbaud injects competing CSS that beats our inline styles.",
    expect: "The text below is RED.",
    check: "style:color",
    html: `<p style="color:#C1121F !important;font-weight:700;">[R16] !important &mdash; is this text red?</p>`,
  },

  // ---- Tier 3 -------------------------------------------------------------
  {
    id: "R17", tier: 3, name: "letter-spacing", stakes: "medium",
    why: "Every eyebrow label in all three directions uses it. Its loss is cosmetic but pervasive.",
    expect: "The label below has visibly W I D E letter spacing.",
    check: "style:letter-spacing",
    html: `<p style="letter-spacing:3px;font-size:12px;font-weight:700;color:#8A6A1F;">[R17] UNIT UPDATE &mdash; IS THIS SPACED OUT?</p>`,
  },
  {
    id: "R18", tier: 3, name: "opacity", stakes: "low",
    why: "Not used today. Would open up layering effects if available.",
    expect: "The box below is faded, roughly half strength.",
    check: "style:opacity",
    html: `<div style="opacity:0.45;background-color:#243B53;color:#FFFFFF;padding:14px;">[R18] opacity 0.45 &mdash; is this faded?</div>`,
  },
  {
    id: "R19", tier: 3, name: "linear-gradient background", stakes: "low",
    why: "Not used today. A cheap way to add depth if shadows are stripped but gradients are not.",
    expect: "The box below fades from pale blue on the left to white on the right.",
    check: "style:background",
    html: `<div style="background:linear-gradient(90deg,#DCE9F7 0%,#FFFFFF 100%);padding:14px;">[R19] linear-gradient &mdash; does this fade left to right?</div>`,
  },
  {
    id: "R20", tier: 3, name: "websafe font-family", stakes: "high",
    why: "Every preset pairs a websafe heading and body face. If font-family is stripped, all typographic identity goes with it.",
    expect: "The first line is a SERIF (Georgia), the second is sans-serif.",
    check: "style:font-family",
    html: `<p style="font-family:Georgia,&quot;Times New Roman&quot;,serif;font-size:19px;">[R20a] Georgia &mdash; is this a serif?</p><p style="font-family:Arial,Helvetica,sans-serif;font-size:19px;">[R20b] Arial &mdash; is this sans-serif?</p>`,
  },
  {
    id: "R21", tier: 3, name: "non-websafe font-family", stakes: "low",
    why: "Confirms whether the websafe-only constraint is real or inherited superstition. It will not render without the font installed, but the declaration surviving is the finding.",
    expect: "Probably falls back to a default face. The analyzer checks whether the declaration survived.",
    check: "style:font-family",
    html: `<p style="font-family:Poppins,&quot;Trebuchet MS&quot;,sans-serif;font-size:19px;">[R21] Poppins requested &mdash; declaration retained?</p>`,
  },
  {
    id: "R22", tier: 3, name: "font-size and line-height", stakes: "critical",
    why: "The type scale is most of what makes output feel considered rather than pasted.",
    expect: "Three lines at visibly different sizes, comfortably leaded.",
    check: "style:font-size",
    html: `<p style="font-size:28px;line-height:1.2;margin:0 0 6px;">[R22a] 28px</p><p style="font-size:19px;line-height:1.4;margin:0 0 6px;">[R22b] 19px</p><p style="font-size:14px;line-height:1.7;margin:0;">[R22c] 14px with generous line-height</p>`,
  },
  {
    id: "R23", tier: 3, name: "text-transform: uppercase", stakes: "low",
    why: "Used for eyebrow labels. Cheap to work around by typing caps, but worth knowing.",
    expect: "The text below appears in CAPITALS despite being typed in lower case.",
    check: "style:text-transform",
    html: `<p style="text-transform:uppercase;font-weight:700;letter-spacing:1.5px;">[R23] typed lower case &mdash; shown as caps?</p>`,
  },

  // ---- Tier 4 -------------------------------------------------------------
  {
    id: "R24", tier: 4, name: "<h1> with inline style", stakes: "high",
    why: "Decides whether heading-order validation is meaningful, or whether headings get remapped to styled paragraphs.",
    expect: "A large heading. The analyzer checks whether it is still an h1.",
    check: "tag:h1",
    html: `<h1 style="font-size:30px;color:#243B53;margin:0;">[R24] this should still be an h1</h1>`,
  },
  {
    id: "R25", tier: 4, name: "<h2> / <h3> / <h4>", stakes: "medium",
    why: "Same question, for the subordinate levels the composer uses for block headings. The verdict is asserted on the h2; h3 and h4 render alongside so you can see whether the whole scale survives together.",
    expect: "Three headings of decreasing size, still their original tags.",
    check: "tag:h2", at: "R25a",
    html: `<h2 style="margin:0 0 4px;">[R25a] h2</h2><h3 style="margin:0 0 4px;">[R25b] h3</h3><h4 style="margin:0;">[R25c] h4</h4>`,
  },
  {
    id: "R26", tier: 4, name: "<blockquote>", stakes: "medium",
    why: "The quote block. Also a good canary for whether semantic elements survive at all.",
    expect: "An indented, italic quotation.",
    check: "tag:blockquote",
    html: `<blockquote style="margin:0;padding-left:16px;border-left:3px solid #C99700;font-style:italic;">[R26] blockquote &mdash; still a blockquote?</blockquote>`,
  },
  {
    id: "R27", tier: 4, name: "<ul> with list-style-type:none", stakes: "medium",
    why: "The checklist block renders a literal box character and suppresses the bullet. If none is stripped you get a bullet AND a box.",
    expect: "Two lines each starting with an empty box, and NO bullet points.",
    check: "style:list-style-type",
    html: `<ul style="margin:0;padding-left:22px;list-style-type:none;"><li>&#9744; [R27a] should have no bullet</li><li>&#9744; [R27b] should have no bullet</li></ul>`,
  },
  {
    id: "R28", tier: 4, name: "<ol> numbering", stakes: "medium",
    why: "The steps block.",
    expect: "A numbered list, 1 through 3.",
    check: "tag:ol",
    html: `<ol style="margin:0;padding-left:22px;"><li>[R28a] first</li><li>[R28b] second</li><li>[R28c] third</li></ol>`,
  },
  {
    id: "R29", tier: 4, name: "consecutive <br> runs", stakes: "medium",
    why: "The rich-text editor emits these constantly. Editors often collapse or multiply them.",
    expect: "Exactly two blank lines between the markers. Three br elements create two empty lines between the surrounding text lines.",
    check: "manual",
    html: `<p>[R29a] three &lt;br&gt; follow this line<br><br><br>[R29b] there should be two blank lines above</p>`,
  },
  {
    id: "R30", tier: 4, name: "<a href> to https", stakes: "high",
    why: "The resource block. A link that loses its href is worse than no link.",
    expect: "A working blue link.",
    check: "attr:href",
    html: `<p><a href="https://example.org/reading" style="color:#1B4F86;">[R30] link to example.org &mdash; is this still clickable?</a></p>`,
  },
  {
    id: "R31", tier: 4, name: "link target and rel hardening", stakes: "medium",
    why: "Whether our link hardening survives, or whether Blackbaud rewrites it to its own policy.",
    expect: "Nothing visual. The analyzer checks the attributes.",
    check: "attr:rel",
    html: `<p><a href="https://example.org/pdf" target="_blank" rel="noopener noreferrer" style="color:#1B4F86;">[R31] target=_blank rel=noopener noreferrer</a></p>`,
  },
  {
    id: "R32", tier: 4, name: "<span style=\"color\">", stakes: "high",
    why: "The sanitizer's allowlist narrows surviving styles to colour and background-colour on spans. If spans are unwrapped, that work is pointless.",
    expect: "One red word and one highlighted word inside a normal sentence.",
    check: "tag:span",
    html: `<p>Ordinary text with <span style="color:#C1121F;">[R32a] red</span> and <span style="background-color:#FEF3C7;">[R32b] highlighted</span> words.</p>`,
  },
  {
    id: "R44", tier: 4, name: "<b> bold text", stakes: "high",
    why: "The composer’s Bold control emits this element. If Blackbaud unwraps it, the words survive but the teacher’s emphasis disappears.",
    expect: "The marked words are visibly bold and remain inside a b element in the saved source.",
    check: "tag:b",
    html: `<p>Ordinary text, then <b>[R44] bold text from the composer</b>, then ordinary text.</p>`,
  },
  {
    id: "R45", tier: 4, name: "<i> italic text", stakes: "high",
    why: "The composer’s Italic control emits this element. The existing blockquote test proves font-style survives, not that inline italic markup does.",
    expect: "The marked words are visibly italic and remain inside an i element in the saved source.",
    check: "tag:i",
    html: `<p>Ordinary text, then <i>[R45] italic text from the composer</i>, then ordinary text.</p>`,
  },
  {
    id: "R46", tier: 4, name: "<u> underlined text", stakes: "high",
    why: "The composer’s Underline control emits this element, and no earlier row tested it.",
    expect: "The marked words are visibly underlined and remain inside a u element in the saved source.",
    check: "tag:u",
    html: `<p>Ordinary text, then <u>[R46] underlined text from the composer</u>, then ordinary text.</p>`,
  },
  {
    id: "R47", tier: 4, name: "<strike> struck text", stakes: "high",
    why: "The composer’s Strikethrough control emits this legacy element in Chromium. If Blackbaud normalizes it to s, the analyzer should report rewritten so the sanitizer contract can follow the stored form.",
    expect: "The marked words have a line through them and remain inside a strike element in the saved source.",
    check: "tag:strike",
    html: `<p>Ordinary text, then <strike>[R47] struck text from the composer</strike>, then ordinary text.</p>`,
  },
  {
    id: "R48", tier: 4, name: "text-align values", stakes: "high",
    why: "The composer now exposes left, center, right, and justified block alignment. Earlier evidence suggests every inline property survives, but these values have not been isolated.",
    expect: "Four labelled lines aligned left, center, right, and justified. The analyzer compares each marker with its own declaration.",
    check: "style:text-align",
    html: `<div style="border:1px solid #E1E9F2;padding:8px;"><p style="text-align:left;margin:4px 0;">[R48a] aligned left</p><p style="text-align:center;margin:4px 0;">[R48b] aligned center</p><p style="text-align:right;margin:4px 0;">[R48c] aligned right</p><p style="text-align:justify;margin:4px 0;">[R48d] justified text long enough to wrap across the available width and make the stretched spacing visible after Blackbaud saves it.</p></div>`,
  },
  {
    id: "R49", tier: 4, name: "combined rich inline formatting", stakes: "high",
    why: "Isolated tags can pass while the visual editor still flattens a realistic nested selection. This mirrors a teacher combining emphasis, colour, highlight, and a link in one block body.",
    expect: "Bold italic text, underlined highlighted text, and a red working link all remain visibly distinct after the visual-editor save.",
    check: "manual",
    html: `<div style="margin:0;"><b><i>[R49a] bold italic</i></b> · <u><span style="background-color:#FEF3C7;">[R49b] underlined highlight</span></u> · <a href="https://example.org/reading" style="color:#C1121F;"><strong>[R49c] bold red link</strong></a></div>`,
  },
  {
    id: "R50", tier: 4, name: "list nested inside a rendered card", stakes: "high",
    why: "R27 and R28 test lists alone. The renderer places rich lists inside a body div, inside a card div, below an h2; this production-shaped row checks that Blackbaud does not flatten that nesting.",
    expect: "A card headed ‘Nested list’ containing two bullet items; the saved marker remains inside a ul element.",
    check: "tag:ul",
    html: `<div data-layout="full" style="display:block;width:100%;margin:0 0 14px;padding:16px;background-color:#F1F5FA;border:1px solid #E1E9F2;border-radius:14px;"><h2 style="margin:0 0 8px;font-size:16px;">Nested list</h2><div style="margin:0;"><ul style="margin:0;padding:0 0 0 22px;"><li>[R50] first nested item</li><li>second nested item with <b>bold text</b></li></ul></div></div>`,
  },
  {
    id: "R33", tier: 4, name: "emoji inside a heading", stakes: "medium",
    why: "The block-icon feature, and soft cards uses emoji as its section markers.",
    expect: "A book emoji, then a lightbulb, rendered as colour glyphs.",
    check: "manual",
    html: `<h3 style="margin:0;">&#128214; &#128161; [R33] do these emoji render in colour?</h3>`,
  },
  {
    id: "R34", tier: 4, name: "entities and &nbsp;", stakes: "medium",
    why: "Whether esc() output is stable, or gets double-escaped into visible markup on round trip.",
    expect: "An ampersand, angle brackets, an em dash, and a non-breaking gap. NOT literal &amp;amp; text.",
    check: "manual",
    html: `<p>[R34] &amp; &lt; &gt; &mdash; &nbsp;&nbsp;&nbsp; &quot;quoted&quot; &rsquo;apostrophe&rsquo;</p>`,
  },
  {
    id: "R35", tier: 4, name: "divs nested three deep", stakes: "high",
    why: "Wrapper, then block, then inner content. Exactly the renderer's structure.",
    expect: "Three nested boxes, each inset from the last.",
    check: "style:background-color",
    html: `<div style="background-color:#E3EAF2;padding:14px;"><div style="background-color:#F1F5FA;padding:14px;"><div style="background-color:#FFFFFF;padding:14px;">[R35] three levels deep &mdash; are all three boxes visible?</div></div></div>`,
  },
  {
    id: "R36", tier: 4, name: "<img> with inline width", stakes: "low",
    why: "Not used today. Decides whether images are ever viable in generated content.",
    expect: "A small blue square.",
    check: "has:img",
    html: `<p>[R36] image follows: <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjMkM2RkI1Ii8+PC9zdmc+" alt="blue square" style="width:40px;height:40px;vertical-align:middle;"></p>`,
  },
  {
    id: "R37", tier: 4, name: "inline <svg>", stakes: "low",
    why: "Would allow real icons instead of emoji, and is the only non-CSS animation channel that is not an image file.",
    expect: "A gold circle.",
    check: "has:svg",
    html: `<p>[R37] inline svg follows: <svg width="34" height="34" viewBox="0 0 34 34" style="vertical-align:middle;"><circle cx="17" cy="17" r="15" fill="#C99700"></circle></svg></p>`,
  },

  // ---- Tier 5 -------------------------------------------------------------
  {
    id: "R38", tier: 5, name: "@keyframes in a <style> block", stakes: "medium",
    why: "The only route to real CSS animation. @keyframes cannot be expressed in an inline style attribute, so this row and R06 decide the whole motion question together.",
    expect: "A gold square PULSING in and out. Static means no CSS animation, ever.",
    check: "doc:@keyframes",
    html: `<style>@keyframes probe-pulse{0%{opacity:1;}50%{opacity:0.15;}100%{opacity:1;}}.probe-pulse{animation:probe-pulse 1.4s ease-in-out infinite;}</style><p>[R38] is the square below pulsing? <span class="probe-pulse" style="display:inline-block;width:26px;height:26px;background-color:#C99700;vertical-align:middle;"></span></p>`,
  },
  {
    id: "R39", tier: 5, name: "SVG SMIL <animate>", stakes: "low",
    why: "Markup rather than CSS, so it needs no style block. The one motion channel that could work even if R06 and R38 both fail. Note it cannot honour prefers-reduced-motion.",
    expect: "A circle growing and shrinking continuously.",
    check: "has:animate",
    html: `<p>[R39] is the circle below animating? <svg width="34" height="34" viewBox="0 0 34 34" style="vertical-align:middle;"><circle cx="17" cy="17" r="6" fill="#2C6FB5"><animate attributeName="r" values="6;14;6" dur="1.6s" repeatCount="indefinite"></animate></circle></svg></p>`,
  },
  {
    id: "R40", tier: 5, name: "<details> / <summary>", stakes: "medium",
    why: "Native progressive disclosure with zero CSS and no accessibility cost. The genuinely useful one for long study guides.",
    expect: "A clickable 'Show the answer' row that expands when clicked.",
    check: "tag:details",
    html: `<details style="border:1px solid #E1E9F2;padding:10px;"><summary style="cursor:pointer;font-weight:700;">[R40] Show the answer &mdash; can you click this?</summary><p style="margin:8px 0 0;">If you can read this after clicking, details works.</p></details>`,
  },
  {
    id: "R43", tier: 5, name: "<h2> inside <summary>", stakes: "medium",
    why: "Added 2026-08-12 by Phase 4. Card headings became <h2> so the document has structure below its title, but a collapsible section's heading is its <summary>, and the renderer will not nest one inside the other until this row says the tenant keeps it. The HTML spec allows exactly one heading element as summary's content; whether Blackbaud's sanitizer knows that is the open question. Until it passes, collapsible sections contribute no heading and the compatibility panel says so.",
    expect: "A clickable 'Answer key' row whose label is still bold and large after saving — and, in the source, still an <h2>.",
    check: "manual",
    html: `<details style="border:1px solid #E1E9F2;padding:10px;"><summary style="cursor:pointer;"><h2 style="display:inline;margin:0;font-size:16px;font-weight:700;">[R43] Answer key &mdash; is this still an h2 in the source?</h2></summary><p style="margin:8px 0 0;">If the h2 survived inside summary, collapsible sections can carry headings.</p></details>`,
  },
  {
    id: "R41", tier: 5, name: "animated GIF", stakes: "low",
    why: "Always works if images survive at all, and needs no CSS. Not embedded here to keep the probe small.",
    expect: "Manual: drop any animated GIF from your own media library into a post and see whether it still animates.",
    check: "manual",
    html: `<p>[R41] manual row &mdash; test an animated GIF from your media library separately.</p>`,
  },
];
