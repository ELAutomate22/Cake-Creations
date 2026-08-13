# Fonts

Self-hosted, so builds and page loads never depend on Google being reachable.
Two clean builds in this project failed because Google Fonts served URLs that
immediately 404'd — a deploy should not be able to break for a reason unrelated
to the code.

It also means no visitor's browser makes a request to Google in order to read a
cake website.

## What is here

`src/app/fonts/` — the **latin** subset, loaded through `next/font/local`.
Next fingerprints these, preloads them, and generates metric-matched fallbacks
so text does not reflow as the real face arrives.

`public/fonts/` — the **latin-ext** subset, declared by hand in `globals.css`.
These need a stable URL and a `unicode-range`, which `next/font/local` cannot
express, so they are served directly.

## Two things that look wrong but are not

**One file covers three weights.** Both families are variable fonts. Google
advertises this through its discrete-weight API by returning the same file for
`300`, `400` and `500`, so each is declared once with `weight: "300 500"`.
Measured advance widths do differ across the range (607.87 / 608.88 / 610.36px
for the same string), so the weight axis is genuinely working, not synthesised.

**The Ext families are listed first in the font stack.** Every one of their
faces carries a `unicode-range`, so the browser skips them for ordinary
characters and only reaches for them on a glyph in that range — meaning they
are also only downloaded when a page actually contains one. Listing them last
would make them unreachable, because the generic `serif` in the fallback chain
matches everything and would win first.

## Weights

Only what the site uses: the 300–500 range, plus one italic for the serif.
Adding a heavier weight to the stylesheet means adding the file too, or the
browser will synthesise it and it will look wrong.

## Licence

Both families are under the SIL Open Font License 1.1, which permits
self-hosting and redistribution.

- Cormorant Garamond — Catharsis Fonts
- Inter — The Inter Project Authors
