# Plugin icons

Drop a logo here, then point at it from `plugins.js`:

```js
icon: 'assets/icons/dezzy-magazine.png',
```

- The slot is **1:1, 80×80**. Supply a **square** source at 240px or larger
  (3× covers retina); files here are downscaled from the full-size originals,
  which live alongside the guides. Keep the originals — they're the only copy.
- `object-fit: contain`, so nothing is ever cropped — but a wide wordmark
  letterboxes into a thin strip inside the square, leaving dead space above
  and below. A square lockup is what fills the slot.
  Compare `dezzy-magazine.png` (square, reads clearly) with
  `real-estate-autofill.png` (wordmark, doesn't).
- PNG or SVG. Logos sit on a white plate, since these are drawn for light
  backgrounds; transparency is fine.
- A single emoji works if there's no logo yet: `icon: '🎬'`.
- Leave `icon` off entirely and the slot shows the plugin's initials, so
  names stay aligned either way.
