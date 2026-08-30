"""
Turn a handful of photographs of one cake into a rotation the website can play.

The source is 28 frames of a single cake on a turntable, shot on a phone. They
cannot be used as they are: a hand is in shot in most of them, the backdrop
carries a vase and lilies, and the cake wanders about eight per cent of the
frame width between shots. Played in sequence that reads as a flicking
slideshow rather than one object turning.

Four things happen here, in order, and each exists because of a specific fault
in the source.

1. The background is removed, which takes the hand, the vase, the flowers and
   the changing backdrop with it. A cake photographed against a shifting
   background cannot be made to look like it is turning; a cake against nothing
   can.

2. Only the largest connected region is kept. Segmentation leaves small islands
   behind -- a wisp of lily, a scrap of the stand -- and an island that appears
   for two frames and vanishes is exactly the kind of flicker the eye catches.

3. Every frame is aligned. The scale comes from the width of the cake's body,
   which is the one measurement a rotating cylinder does not change; the
   toppers are excluded because their height changes with the angle and would
   make the cake pump in and out. The bottom of the stand is pinned to a fixed
   line, and the body is centred horizontally. After this the cake only turns.

4. A soft contact shadow is drawn underneath, so the cake sits on the page
   instead of hovering above it.

Run:  python scripts/build-turntable.py
Needs: pip install "rembg[cpu]" pillow scipy
"""

from __future__ import annotations

import os
import re
import sys
import time

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

SRC_DIR = "assets-source"
OUT_DIR = os.path.join("public", "turntable")

# The canvas each frame is drawn onto. Portrait, because the cake is.
CANVAS_W, CANVAS_H = 900, 1200

# The cake body's width, as a fraction of the canvas. Leaves room either side
# for the palm fans, which lean well outside the body as it turns.
BODY_WIDTH_RATIO = 0.52

# Where the bottom of the stand sits, leaving room for the shadow beneath it.
BASELINE_RATIO = 0.90

# Anything dimmer than this is treated as background. Deliberately low: the
# wafer ruffles have soft edges worth keeping.
ALPHA_FLOOR = 24

# Exported widths. The site serves the second to phones.
SIZES = {"desktop": 760, "mobile": 440}


def capture_order(name: str) -> tuple[int, int]:
    """Sort as the photographs were taken, not as Windows lists them.

    The names carry a time to the second and a duplicate counter, so "(10)"
    sorts before "(2)" alphabetically while being eight frames later. Getting
    this wrong shuffles the rotation into nonsense.
    """
    stamp = re.search(r"at (\d+)\.(\d+)\.(\d+)", name)
    seconds = int(stamp[1]) * 3600 + int(stamp[2]) * 60 + int(stamp[3])
    counter = re.search(r"\((\d+)\)", name)
    return seconds, int(counter[1]) if counter else 0


def largest_region(alpha: np.ndarray) -> np.ndarray:
    """Keep the cake and discard every other island the segmentation left."""
    labelled, count = ndimage.label(alpha > ALPHA_FLOOR)
    if count <= 1:
        return alpha

    sizes = ndimage.sum(np.ones_like(labelled), labelled, range(1, count + 1))
    keep = int(np.argmax(sizes)) + 1
    return np.where(labelled == keep, alpha, 0).astype(np.uint8)


def body_metrics(alpha: np.ndarray) -> tuple[float, float, int]:
    """Width and centre of the cake's body, and where its base sits.

    Measured across the lower part of the shape only. That is the cylinder,
    whose width a rotation does not change, so it is a stable thing to scale
    by. Including the toppers would scale the cake by how tall its decoration
    happened to look from that angle.
    """
    rows = np.where(alpha.max(axis=1) > ALPHA_FLOOR)[0]
    cols = np.where(alpha.max(axis=0) > ALPHA_FLOOR)[0]
    if rows.size == 0 or cols.size == 0:
        raise ValueError("nothing left after cutting out the background")

    top, bottom = int(rows[0]), int(rows[-1])
    height = bottom - top

    # The bottom third: cake body and stand, never the fans.
    band = alpha[bottom - int(height * 0.33) : bottom, :]
    band_cols = np.where(band.max(axis=0) > ALPHA_FLOOR)[0]
    if band_cols.size == 0:
        band_cols = cols

    left, right = float(band_cols[0]), float(band_cols[-1])
    return right - left, (left + right) / 2.0, bottom


def contact_shadow(width: int) -> Image.Image:
    """A blurred ellipse, so the cake reads as resting on something."""
    shadow = Image.new("L", (CANVAS_W, CANVAS_H), 0)
    ellipse = Image.new("L", (CANVAS_W, CANVAS_H), 0)

    from PIL import ImageDraw

    draw = ImageDraw.Draw(ellipse)
    half = width * 0.46
    centre_y = CANVAS_H * BASELINE_RATIO
    draw.ellipse(
        [CANVAS_W / 2 - half, centre_y - width * 0.045,
         CANVAS_W / 2 + half, centre_y + width * 0.055],
        fill=90,
    )
    shadow = ellipse.filter(ImageFilter.GaussianBlur(width * 0.05))

    tinted = Image.new("RGBA", (CANVAS_W, CANVAS_H), (74, 56, 44, 0))
    tinted.putalpha(shadow)
    return tinted


def main() -> int:
    try:
        from rembg import new_session, remove
    except ImportError:
        print('rembg is not installed. Run:  pip install "rembg[cpu]" pillow scipy')
        return 1

    files = sorted(
        (f for f in os.listdir(SRC_DIR) if re.search(r"whatsapp", f, re.I)),
        key=capture_order,
    )
    if not files:
        print(f"No source frames found in {SRC_DIR}/")
        return 1

    print(f"{len(files)} frames, in capture order")

    for name in SIZES:
        os.makedirs(os.path.join(OUT_DIR, name), exist_ok=True)

    session = new_session("u2net")
    target_body = CANVAS_W * BODY_WIDTH_RATIO
    baseline = CANVAS_H * BASELINE_RATIO

    widths: list[float] = []
    started = time.time()

    for index, name in enumerate(files, start=1):
        source = Image.open(os.path.join(SRC_DIR, name)).convert("RGB")
        cut = remove(source, session=session)

        pixels = np.array(cut)
        # Just the largest region, deliberately.
        #
        # Two further filters were tried here and both removed again. A colour
        # filter for the hand cut holes through the cake, because warm ivory
        # and gold occupy the same range as skin. A morphological opening to
        # clear the lily wisps eroded the stand plate's thin rim, which in turn
        # made the plate-detection clip slice the base off the cake.
        #
        # What survives is a wisp of lily on a handful of frames and, where the
        # hand touches the cake, a sliver of it. Both are small, both are
        # moving, and both are a better outcome than a cake with holes in it.
        pixels[:, :, 3] = largest_region(pixels[:, :, 3])
        cut = Image.fromarray(pixels, "RGBA")

        body_width, body_centre, base = body_metrics(pixels[:, :, 3])
        widths.append(body_width)

        # Scale from the body, then place: body centred, base on the line.
        scale = target_body / body_width
        scaled = cut.resize(
            (max(1, int(cut.width * scale)), max(1, int(cut.height * scale))),
            Image.LANCZOS,
        )

        left = int(CANVAS_W / 2 - body_centre * scale)
        top = int(baseline - base * scale)

        frame = Image.new("RGBA", (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
        frame.alpha_composite(contact_shadow(target_body))
        frame.alpha_composite(scaled, (left, top))

        for label, width in SIZES.items():
            # Phones get every second frame; half the download, and at that
            # size the coarser step between angles is not noticeable.
            if label == "mobile" and index % 2 == 0:
                continue

            number = index if label == "desktop" else (index + 1) // 2
            out = frame.resize(
                (width, int(CANVAS_H * width / CANVAS_W)), Image.LANCZOS
            )
            out.save(
                os.path.join(OUT_DIR, label, f"{number:02d}.webp"),
                "WEBP",
                quality=82,
                method=6,
            )

        print(f"  {index:2d}/{len(files)}  body {body_width:6.1f}px  {name[-14:]}")

    spread = (max(widths) - min(widths)) / (sum(widths) / len(widths)) * 100
    print(f"\ndone in {time.time() - started:.1f}s")
    print(f"body width varied {spread:.1f}% across the turn (all frames scaled to match)")

    for label in SIZES:
        folder = os.path.join(OUT_DIR, label)
        total = sum(
            os.path.getsize(os.path.join(folder, f)) for f in os.listdir(folder)
        )
        print(f"{label:8s} {len(os.listdir(folder)):2d} frames, {total / 1024:6.0f} KB total")

    return 0


if __name__ == "__main__":
    sys.exit(main())
