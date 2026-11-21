---
name: Bể chứa Arduino — Digital Twin
description: Offline virtual lab for a water-tank pump controller; category-standard IoT dashboard plus CAD viewer, light theme, Vietnamese UI.
colors:
  accent: "#2563eb"
  accent-hover: "#1d4ed8"
  accent-soft: "#eff4ff"
  accent-line: "#b2ccff"
  bg: "#f4f6f9"
  surface: "#ffffff"
  surface-2: "#f9fafb"
  sunken: "#eef1f5"
  line: "#e4e7ec"
  line-2: "#d0d5dd"
  line-3: "#98a2b3"
  text: "#101828"
  text-2: "#475467"
  text-3: "#526072"
  ok: "#067647"
  ok-fill: "#17b26a"
  ok-soft: "#ecfdf3"
  ok-line: "#abefc6"
  warn: "#93370d"
  warn-fill: "#f79009"
  warn-soft: "#fffaeb"
  warn-line: "#fedf89"
  danger: "#b42318"
  danger-fill: "#f04438"
  danger-soft: "#fef3f2"
  danger-line: "#fecdca"
  water: "#0ba5ec"
  level-low: "#dc6803"
  level-high: "#12b76a"
  dimension: "#b54708"
  lcd-glass: "#a6cf4f"
  lcd-bezel: "#1d2a17"
  phone-bezel: "#101113"
  phone-bg: "#f2f3f7"
  phone-card: "#ffffff"
  phone-text: "#0b1220"
  phone-muted: "#5b6574"
  phone-accent: "#0b72e7"
  phone-line: "#e6e8ee"
typography:
  headline:
    fontFamily: "Inter, system-ui, Segoe UI, Roboto, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.015em"
    fontFeature: "\"tnum\" 1, \"cv11\" 1"
  title:
    fontFamily: "Inter, system-ui, Segoe UI, Roboto, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "-0.01em"
    fontFeature: "\"tnum\" 1, \"cv11\" 1"
  body:
    fontFamily: "Inter, system-ui, Segoe UI, Roboto, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "\"tnum\" 1, \"cv11\" 1"
  body-sm:
    fontFamily: "Inter, system-ui, Segoe UI, Roboto, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.5
    fontFeature: "\"tnum\" 1, \"cv11\" 1"
  label:
    fontFamily: "Inter, system-ui, Segoe UI, Roboto, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.4
    fontFeature: "\"tnum\" 1, \"cv11\" 1"
  lcd:
    fontFamily: "JetBrains Mono, ui-monospace, Consolas, monospace"
    fontSize: "15px"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "0.08em"
  phone-figure:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Segoe UI, Roboto, sans-serif"
    fontSize: "44px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.03em"
  phone-title:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Segoe UI, Roboto, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    letterSpacing: "-0.02em"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  pill: "999px"
  phone-card: "18px"
  phone-frame: "48px"
spacing:
  s1: "4px"
  s2: "8px"
  s3: "12px"
  s4: "16px"
  s5: "20px"
  s6: "24px"
  s7: "32px"
  s8: "48px"
components:
  button:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "36px"
  button-hover:
    backgroundColor: "{colors.surface-2}"
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.surface}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "36px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-ghost:
    textColor: "{colors.text-2}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "36px"
  button-ghost-hover:
    backgroundColor: "{colors.sunken}"
    textColor: "{colors.text}"
  button-sm:
    rounded: "{rounded.md}"
    padding: "0 10px"
    height: "30px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "38px"
  segmented:
    backgroundColor: "{colors.sunken}"
    textColor: "{colors.text-2}"
    rounded: "{rounded.md}"
    padding: "2px"
  segmented-selected:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.sm}"
    height: "30px"
  tool-pressed:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent}"
    rounded: "{rounded.md}"
    height: "34px"
  chip-selected:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 12px"
    height: "30px"
  tooltip:
    backgroundColor: "{colors.text}"
    textColor: "{colors.surface}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "6px 8px"
  balloon:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    height: "24px"
  balloon-selected:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.surface}"
  paper:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "24px 32px 32px"
  phone-card:
    backgroundColor: "{colors.phone-card}"
    textColor: "{colors.phone-text}"
    rounded: "{rounded.phone-card}"
    padding: "14px 16px"
  phone-button:
    backgroundColor: "{colors.phone-accent}"
    textColor: "{colors.phone-card}"
    rounded: "{rounded.lg}"
    height: "46px"
---

# Design System: Bể chứa Arduino — Digital Twin

## Overview

**Creative North Star: "The Bench Viewer"**

A category-standard engineering tool: the polish of Arduino Cloud for the live dashboard, Onshape / Fusion web viewer for the 3D part tree and exploded view, Linear / Vercel for type, spacing and interaction. Nothing is personalised by stealth. The world is cool grey ground, white working surfaces, 1px hairline borders, one blue accent for selection and primary action, and status colour only where state carries meaning.

Density is high but never cluttered. Each mode shows only the essential state; technical depth lives behind tabs, `<details>` disclosures, and `[data-tip]` tooltips marked with a dotted underline. There are no permanent explanatory paragraphs. The 3D viewport is a light CAD backdrop, and parts are called out with numbered assembly balloons on leader lines that match the part tree, the way an assembly drawing does.

The simulated phone is deliberately a different product: a native mobile app with its own system font, dark bezel and `phone-*` tokens. It represents the real app that receives data over ESP-01 and must not be restyled to match the lab UI. The LCD 1602 is likewise a hardware emulation with its own colours and the only monospace text. The app is light theme only, Vietnamese copy, and runs offline from a static `index.html` with no build step; only the webfonts need the network and both have system fallbacks.

**Key Characteristics:**
- Light only (`color-scheme: light`); cool grey ground, white surfaces, 1px borders.
- One accent, blue, for selection, focus and primary action.
- Status colours (ok / warn / danger) appear only when they describe state.
- Inter with tabular numerals everywhere in the lab UI; JetBrains Mono only on the LCD.
- Secondary information in tooltips and disclosures, never in standing paragraphs.
- Numbered CAD balloons as the 3D labelling device.
- Two embedded foreign identities kept intact: the phone app and the LCD.

## Colors

A neutral grey-and-white engineering palette with a single cobalt accent and a strictly semantic status set.

### Primary
- **Cobalt Accent** (accent): Primary buttons, selected tab underline, pressed viewport tools, selected balloon and tree row, range fill, checkbox fill, focus outline and ring. Hover deepens to **Deep Cobalt** (accent-hover). **Cobalt Wash** (accent-soft) with **Cobalt Edge** (accent-line) is the selected-but-not-primary state (pressed tool, selected chip, current nav link, info notice).

### Neutral
- **Cool Ground** (bg): App background, phone column, and the area behind panels.
- **White Surface** (surface): Panels, top bar, toolbars, paper sheets, inputs, menus.
- **Hover Mist** (surface-2): Hover on rows and default buttons; table header and footer fill.
- **Sunken Grey** (sunken): Segmented-control trough, ghost-button hover, active menu option, BOM category rows.
- **Hairline** (line): All 1px dividers and panel borders. **Field Edge** (line-2) for input, button and checkbox borders; **Strong Edge** (line-3) for their hover and for the dotted tooltip underline.
- **Ink** (text): Body text and headings; also the tooltip and dark hint background. **Slate** (text-2): secondary text, inactive tabs. **Muted Slate** (text-3): metadata, units, captions, placeholder-level text.

### Status (semantic only)
- **Ok** family (ok / ok-fill / ok-soft / ok-line): Pump running, firmware healthy, hardware online, winning value in the comparison table.
- **Warn** family (warn / warn-fill / warn-soft / warn-line): Firmware warnings, build warnings, "measure this" figures.
- **Danger** family (danger / danger-fill / danger-soft / danger-line): Safety lockouts, required checks, armed fault switches, notification badges.
- Each family is four steps: text-safe dark, fill for dots and icons, soft background, and border.

### Domain colours
- **Water Sky** (water): Water volume in 3D, legend, drawings.
- **Low Threshold** (level-low, amber) and **High Threshold** (level-high, green): Pump-on and pump-off level markers, used identically in 3D, legend, phone gauge and drawings.
- **Dimension Rust** (dimension): Dimension lines and dimension tags in drawings and on the 3D overlay.

### Embedded identities
- **LCD Glass** (lcd-glass) in **LCD Bezel** (lcd-bezel): The LCD 1602 emulation only.
- **Phone** tokens (phone-bezel, phone-bg, phone-card, phone-text, phone-muted, phone-accent, phone-line): Scoped to the simulated phone screen. Phone accent is its own iOS-like blue, not the lab cobalt.

### Named Rules
**The One Accent Rule.** Cobalt is the only hue that means "selected", "focused" or "primary". Never introduce a second accent in the lab UI.

**The Status Means State Rule.** Green, amber and red appear only when they report a real state (running, warning, danger, measured-vs-design). Never use them for decoration or emphasis.

**The Shared Threshold Rule.** Low threshold is always amber and high threshold always green, in every view that shows them.

## Typography

**Body Font:** Inter (with system-ui, Segoe UI, Roboto, sans-serif)
**Mono Font:** JetBrains Mono (with ui-monospace, Consolas, monospace), LCD only
**Phone Font:** the platform system stack (-apple-system, SF Pro Text, Segoe UI, Roboto)

**Character:** One neutral grotesque carrying every role through weight and size, with tabular numerals so live readings and prices never jitter. Hierarchy comes from 400 / 500 / 600 weights, not from size jumps.

### Hierarchy
- **Headline** (600, 20px, 1.3, -0.015em): Paper section titles in Chế tạo, part-card title, stat values.
- **Title** (600, 16px): Brand name (650), current assembly step, sub-section headings.
- **Body** (400, 14px, 1.5): Default text, top tabs, switch rows, menu options.
- **Body small** (500–600, 13px): Buttons, field labels, segmented options, panel tabs, tables, sub-headings inside panels.
- **Label** (500–600, 12px): Tooltips, help text, table headers, chips, balloons, metadata, units.
- **LCD** (JetBrains Mono 700, 15px, 0.08em tracking): The LCD 1602 readout only.
- **Phone figure / title** (system 700, 44px / 20px, tight tracking): Inside the phone screen only.

### Named Rules
**The Tabular Rule.** `font-feature-settings: "tnum" 1, "cv11" 1` is set on body; every number in the lab UI aligns in columns. Never override it.

**The Mono Is Hardware Rule.** Monospace appears only where it emulates a physical character display. Code-like styling elsewhere is off-system.

**The Sentence Case Rule.** Labels and headings are sentence case in Vietnamese; no uppercase tracking labels.

## Layout

**Focus-first shell.** A 52px top bar answers "where am I": brand left, the three workspaces centred as one segmented control (Vận hành · Thí nghiệm · Chế tạo), the variant menu right. Everything below it is the 3D stage, full-bleed. The stage carries one floating **dock** at bottom-centre that answers "what can I do here"; it is the only toolbar in the app.

Panels are contextual flex columns, never permanent. Each opens from its dock button and docks beside the stage, so the viewport shrinks (renderer follows via ResizeObserver, camera refits when it narrows) instead of being covered.

- **Vận hành (run):** stage | optional 312px Điều khiển panel (consumption valve, refill, LCD, relay/còi/Water Sensor/ESP-01) | optional 380px phone column. Dock: Hiển thị, Đo, sim clock + speed, Điều khiển, Điện thoại.
- **Thí nghiệm (lab):** stage | optional 312px panel with tabs Sự cố · Số đo · Nhật ký | optional phone (the comparison partner: stale data, lost link). Dock as run, panel button reads "Sự cố". The workspace tab carries a Danger badge counting armed faults, visible from every workspace.
- **Chế tạo (build):** optional 280px part tree | stage | 340px inspector that exists only while a part is selected (Esc or ✕ deselects). Dock adds Bộ phận, Tháo rời (popover: assemble/explode, separation slider, cluster chips), Mặt cắt (popover), Lắp ráp (player pinned top-centre), and a primary Hồ sơ button. **Hồ sơ** replaces the stage with the document: 232px sticky contents nav (first item "← Mô hình 3D") | white paper sheets (Thông số, BOM, Bản vẽ, Cắt, Điện, Lắp ráp, So sánh, Ảnh ngoài đời).

Defaults: on ≥1280px the run/lab panel and the build tree start open; the phone always starts closed. Open/closed state persists per workspace in localStorage. Run and lab pick nothing on click (hover still names a part); selection belongs to build.

Floating over the stage, and only there: the firmware status card top-left (state, thresholds with their amber/green swatches, inline RESET when firmware locks), the dock, popovers above the dock, the assembly player, and the hint pill above the dock.

Spacing is a 4px-based scale (s1–s8). Panel blocks use 16px padding with 1px dividers; field gaps 6px, field-to-field 16px; paper sheets 24/32px padding with 20px between sheets.

Responsive: at ≤1023px the document nav becomes a horizontal sticky strip and the document stops being a grid. At ≤859px panels become bottom sheets (max 58–64% height, one open at a time, 16px top radius), the phone becomes the full-screen app without its bezel, the dock spans the width with icon-only buttons, the sim clock hides and speed collapses to pause + one cycling 1×/5×/20× button, and popovers become full-width sheets above the dock. Dock labels also collapse to icons by container query when the stage is under 780px. On coarse pointers every interactive control is at least 44px.

**The Container Before Breakpoint Rule.** Toolbars inside the stage respond to the stage's own width, not the window.

**The One Toolbar Rule.** Tools live in the dock, grouped (view | measure | build tools | simulation | panels) with hairline separators. Never add a second toolbar, a legend card, or a permanently open panel; secondary controls go into a dock popover.

## Elevation & Depth

Mostly flat with tonal layering: ground, white surface, sunken trough, separated by 1px hairlines. Shadows are small and structural, never ambient decoration.

### Shadow Vocabulary
- **Hairline lift** (`box-shadow: 0 1px 2px rgba(16,24,40,.05)`): Buttons, inputs, paper sheets.
- **Raised** (`box-shadow: 0 1px 3px rgba(16,24,40,.08), 0 1px 2px rgba(16,24,40,.04)`): Selected segment, floating stage overlays, balloons, slider thumb.
- **Popover** (`box-shadow: 0 12px 24px -6px rgba(16,24,40,.14), 0 4px 8px -2px rgba(16,24,40,.06)`): Dropdown menus, assembly player, stage hint.
- **Focus ring** (`box-shadow: 0 0 0 3px rgba(37,99,235,.22)`): Inputs, open dropdown, switches, checkboxes, slider thumb.

### Named Rules
**The Float Only Over 3D Rule.** Translucent white (94%) panels with the Raised shadow are reserved for overlays floating on the 3D viewport. Everything else sits flat in the grid.

## Shapes

Gently rounded, precise corners: 6px for small inner items (menu options, tree rows, tooltips, segment buttons), 8px for controls and notices, 12px for containers (paper, tables, figures, floating overlays, player). Pills (999px) only for chips, badges, switches and balloons. Containers that group rows (tables, stats, hardware grid, steps) clip to their radius and divide internally with 1px lines instead of nesting cards. Icons are 16px SVG strokes at 1.75 width with round caps.

The phone uses its own softer geometry (48px frame, 38px screen, 18px cards, 12px controls) and the LCD a square 4px glass in an 8px bezel.

## Components

### Buttons
Quiet, compact, outlined.
- **Shape:** 8px radius, 36px tall (30px small), 13px semibold label, optional 16px leading icon with 6px gap.
- **Default:** white with field-edge border and hairline lift; hover to Hover Mist with strong edge; active to Sunken Grey.
- **Primary:** Cobalt fill and border, white text; hover Deep Cobalt.
- **Ghost:** transparent, Slate text; hover Sunken Grey with Ink text.
- **Disabled:** 50% opacity, not-allowed cursor.

### Segmented control, dock and popovers
- **Segmented:** Sunken trough with 2px inset; selected option becomes a white raised pill. Used for workspaces, display style, explode state, section axis.
- **Dock button:** transparent 36px button, 16px icon + 13px label; hover Sunken Grey; pressed, expanded or active (`.is-on`, e.g. explode > 0 % shows its value) is Cobalt Wash with Cobalt text. The dock's display button is a menu (Ink semibold label naming the current style and view, rotating chevron). Hồ sơ is the dock's only primary (Cobalt fill).
- **Popover:** 304px white sheet, 12px radius, Popover shadow, 12px padding, sections divided by hairlines with 12px semibold Muted Slate captions. Opens above its dock button with a 4px rise; one open at a time; outside click or Esc closes and returns focus.
- **View grid:** seven camera buttons in two rows (4 + 3), 32px, hairline border; selected Cobalt border + Wash.
- **Toggle row:** label left, 30×18 switch right; on state is Cobalt (display options), unlike the Danger fault switch.

### Chips
Pill, 30px, field-edge border, 12px label in Slate. Selected: Cobalt border, Cobalt Wash fill, Cobalt text, semibold.

### Inputs / Fields
- **Style:** white, field-edge 1px border, 8px radius, 38px tall, hairline lift. Units sit inside the field on the right in Muted Slate.
- **Focus:** border turns Cobalt and the 3px focus ring appears.
- **Dropdown:** a custom listbox replaces `<select>`; trigger matches the input, chevron rotates 180° when open, menu is a white 4px-padded popover with 36px options, active option in Sunken Grey, selected option semibold with a Cobalt check.
- **Range:** 6px track filled in Cobalt up to the value, white thumb with Cobalt ring.
- **Switch:** 36×20 pill. Switches arm faults, so the on state is Danger fill.
- **Checkbox:** 18px, 5px radius; checked is Cobalt with a white check.

### Navigation
- **Workspace switcher (top bar):** a centred segmented control (32px options, Slate at rest, white raised Ink semibold when selected). ARIA tabs with arrow-key movement; Thí nghiệm carries the fault badge.
- **Variant menu (top bar, right):** outlined 34px menu button (layers icon, variant name, chevron; icon-only under 860px) opening a 280px option list with each variant's footprint and part count.
- **Panel tabs:** same underline grammar, equal-width, 44px tall, sticky.
- **Build contents nav:** vertical list of 13px links; current link in Cobalt Wash with Cobalt text.
- **Phone tab bar:** the phone's own bottom bar; selected item in phone accent.

### Cards / Containers
- **Paper:** white sheet, 12px radius, hairline border and lift, 24/32px padding. Each opens with a one-row section header: title left, then muted metadata and actions right.
- **Grouped grids** (stats, hardware status, steps, tables): one bordered 12px container, 1px internal gaps on a Hairline background. Never cards inside cards.
- **Notices:** 8px rounded rows in a status soft fill and line border with a masked status icon (warn triangle, danger, info circle).

### Tooltips
Ink background, white 12px medium text, 6px radius, max 240px, appearing after 350ms. Elements carrying a tooltip inside documents get a dotted Strong Edge underline and help cursor. This is the primary home for secondary explanation.

### Assembly Balloons (signature)
Numbered pills (24px, 1.5px Ink border, white fill, 12px bold numeral) placed on the 3D view and joined to the part by a 1.5px Ink leader line ending in a 6px anchor dot. Hover or focus reveals the part name and turns the border Cobalt; selection fills the balloon Cobalt and colours its leader. The numbers match the part tree's numbered rows exactly, so tree and model read as one assembly drawing. Dimension tags (Dimension Rust on white) and measurement tags (Ink) share the overlay layer.

### Firmware Status Card
Floating top-left on the stage: a 9px status dot with a 3px halo, a 13px semibold state line and a 12px Slate detail line that carries the threshold swatches (amber on, green off) in place of a legend. Neutral grey when idle, Ok when running, Warn and Danger tint the whole card's background and border. When firmware locks the pump, a small RESET Mega button sits inside the card.

### 3D Viewport
A light CAD-viewer backdrop: vertical gradient from #edf1f5 to #cdd5df, white model materials, water in Water Sky, threshold rings in the shared threshold colours.

### LCD 1602 and Simulated Phone (embedded identities)
The LCD is green glass in a dark bezel with JetBrains Mono, dimmed with a pixel-grid pattern when off. The phone is a dark-bezel handset with a system-font app inside: grey canvas, white 18px cards, a big tabular level figure, an iOS-style segmented control and full-width 46px action button, its own alert, banner and toast. Both are reproductions of other products and keep their own tokens.

## Do's and Don'ts

### Do:
- **Do** use the `:root` custom properties for every colour, radius, spacing and font size in the lab UI.
- **Do** put secondary explanation in `[data-tip]` tooltips (dotted underline) or `<details>`; keep one-row section headers.
- **Do** reserve Cobalt for selection, focus and primary action, and status colours for real state.
- **Do** keep tabular numerals on every reading, price and dimension.
- **Do** label 3D parts with numbered balloons that match the part tree, not with long name tags.
- **Do** keep touch targets at 44px on coarse pointers and honour `prefers-reduced-motion`.
- **Do** keep transitions short (0.12–0.18s, `cubic-bezier(.2,.8,.2,1)`) and only on state changes.

### Don't:
- **Don't** restyle the simulated phone or the LCD to match the lab UI; they are separate identities with their own tokens.
- **Don't** add a dark theme; the system is light only.
- **Don't** use JetBrains Mono outside the LCD emulation.
- **Don't** add permanent explanatory paragraphs to panels or sheets.
- **Don't** introduce decorative gradients, glow or glassmorphism in the lab UI; the viewport backdrop, the range fill and the 94% white stage overlays are the only sanctioned uses (the phone keeps its own water-gauge gradient).
- **Don't** nest cards; group rows inside one bordered container with hairline dividers.
- **Don't** add small accent-coloured category labels above titles; the title and its numbered balloon identify the part.
- **Don't** add build tooling, frameworks or network dependencies beyond the two webfonts.
