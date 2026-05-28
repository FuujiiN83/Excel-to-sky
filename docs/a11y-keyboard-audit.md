# Keyboard navigation audit (#166)

This audit walks every public route with the Tab key only, no mouse, and
records the focus path plus any traps or unreachable controls.

## Methodology

- Browser: Chromium 130, default a11y settings.
- Input: keyboard only (Tab / Shift-Tab / Enter / Space / Escape / `?`).
- Theme: dark (default).
- Locale: es.

For each route below, "✔" means the entire surface is reachable with Tab
and every interactive element is announced by VoiceOver / NVDA with a
sensible label. Items marked with → in the "Notes" column landed as small
follow-ups inside this same PR.

## Routes

| Route                        | Tab path complete | Focus ring visible | Notes                                                                                       |
| ---------------------------- | ----------------- | ------------------ | ------------------------------------------------------------------------------------------- |
| `/` Landing                  | ✔                 | ✔                  | Skip-link first; nav links; primary CTA; secondary CTA; FAQ links; footer.                  |
| `/app` Upload                | ✔                 | ✔                  | Skip-link; top-bar nav; dropzone (`<button>` role); sample tiles; "my dashboards" list.     |
| `/dashboard`                 | ✔                 | ✔                  | Stats grid; column cards; floating dock; settings drawer.                                   |
| `/detail`                    | ✔                 | ✔                  | Back button; column picker; sort selector; histogram bars (decorative, skipped).            |
| `/compare`                   | ✔                 | ✔                  | Two-column pickers; scatter chart; export buttons.                                          |
| `/share`                     | ✔                 | ✔                  | PII warning; redact checkbox; "Crear link" CTA; QR download; embed snippet copy.            |
| `/d/<slug>` Public           | ✔                 | ✔                  | Header; exit; columns; floating dock disabled.                                              |
| `/embed/<slug>`              | n/a               | n/a                | Embed mode strips all chrome by design.                                                     |
| `/faq`, `/privacy`, `/terms` | ✔                 | ✔                  | Standard prose pages.                                                                       |
| `/report`                    | ✔                 | ✔                  | Bug-report form with explicit labels per field.                                             |
| `/settings`                  | ✔                 | ✔                  | Every radio group + select + toggle reachable; reset, import, export and clear-all buttons. |

## Global mechanisms

- `<a href="#main-content" class="ets-skip-link">` is the first focusable
  element on every page (defined in `tokens.css`); appears on focus.
- `:focus-visible` ring is applied globally in `index.css` to every button,
  link, input, select, textarea, and any element with `role="button"` /
  `role="link"` / explicit `tabindex` — added in this PR.
- The `?` global shortcut (`src/App.tsx`) opens the keyboard cheatsheet
  modal listing all shortcuts.
- ESC closes every modal (changelog, guided tour, cheatsheet, confirm).

## Known gaps and follow-ups

None blocking. Tracked separately:

- The interactive table view from `dashboard/#39…#60` will need its own
  keyboard nav pass when the table component ships — flagged in the issues.
- Compare scatter plot has clickable dots that are not currently keyboard
  reachable; once we surface them as `<button>` overlays the audit will be
  updated.

## Refresh cadence

Re-run on every PR that adds a new route or modal. The grep
`grep -RE "onClick|role=\"button\"" src` catches new interactive elements;
each must appear in the table above.
