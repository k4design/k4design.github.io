# Full-size originals

The served icons next door are downscaled to 240px for an 80px slot. These are
the sources they were cut from — keep them, and re-cut from here if the slot
size ever changes:

```bash
sips -Z 240 originals/name.png --out name.png
```

`frametomp4.png` has no original here: its full-size file was overwritten in
place during an earlier downscale. Drop the original back in if you still have
it, then re-cut.
