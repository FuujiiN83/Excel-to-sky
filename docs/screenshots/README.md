# Visual assets for the project README and landing

This directory holds the screenshots and animated demo referenced from the
top-level `README.md` and (optionally) the landing page. Drop the files in
with the exact names below and the existing references will pick them up
without any code change.

## Expected files

| Path                     | Used by             | Notes                                                                                     |
| ------------------------ | ------------------- | ----------------------------------------------------------------------------------------- |
| `hero.png`               | README (#245)       | 1600×900 PNG of the landing hero, used as the very first image in the README.             |
| `dashboard.png`          | README (#245)       | 1600×900 PNG of the post-upload dashboard with at least one column expanded.              |
| `insights-workbench.png` | README (#245)       | 1600×900 PNG of the `/dev/insights` workbench showing a full report.                      |
| `demo.gif`               | README (#244)       | ≤ 8 MB animated GIF (12 fps, 1280 px wide) of the full parse → dashboard → insights flow. |
| `demo.mp4`               | Landing hero (#213) | 30 s H.264 MP4 fallback for `<video>` tags. Optional.                                     |
| `demo.webm`              | Landing hero (#213) | 30 s VP9 WebM, preferred when the browser supports it. Optional.                          |
| `demo-poster.jpg`        | Landing hero (#213) | First frame of the demo as a JPEG, used as the `<video poster>`.                          |

## Capture recipe

For consistent shots:

1. Use the `ventas` sample at 1280×800 viewport.
2. Hide the dev workbench panel, the cookie banner and the privacy badge.
3. Apply the `dark` theme and the `mixed` palette.
4. Use macOS Screenshot (⇧⌘5 → window capture) or Chrome DevTools'
   "Capture full size screenshot" for full-page shots.

Animated demo (`demo.gif` / `demo.webm`):

1. Record with [GIPHY Capture](https://giphy.com/apps/giphycapture) or
   `ffmpeg -framerate 12` for a small file size.
2. Crop tight (~1280×720). Keep the file under 8 MB so GitHub renders it
   inline.
3. End each loop with the final dashboard frame held for ~1.5 s.

Once dropped, the README references and landing `<video>` element will
just work — no code changes required.
