# Drake Arena icons, V2 animated

Every icon of the game redrawn at 4K density (a 10x10 glyph is 40x40 here, 12x12 is 48x48, the 11x11 roulette 44x44),
with an idle loop. Each item has a still (`<id>.png`, the loop's first frame, for when animation is off) and the loop
(`<id>-anim.png`, an APNG that loops forever; an `<img>` plays it as is). `manifest.json` lists every item with its
kind, size, frame count and frame time.

- 4K: show at 1:1 (40 px for a 10x10 icon), `image-rendering: pixelated`.
- 1080p: show at half size (20 px), smoothed (`image-rendering: auto`).
- A title badge is the rarity frame (`frames/frame-<rarity>-anim.png`, 48x48) with the note's glyph drawn on top at
  (4, 4), same scale; the two loop on their own.
- No glow is baked in: the fire glow stays in the overlay's CSS.
