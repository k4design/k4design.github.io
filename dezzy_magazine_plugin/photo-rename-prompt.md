# Photo auto-rename prompt — Dezzy Magazine

A ready-to-use prompt for an AI agent with **file access + image vision** (e.g. Claude Code,
or a script calling the Claude API with images) that scans a folder of listing photos, looks
at each one, and renames it to the naming convention the **Dezzy Magazine** plugin's
auto-assign understands. Correctly named files drop straight into the right room slots when
you Auto-assign in the plugin (or the intake site).

## How to use
1. Put the photos for one property in a single folder.
2. Give the agent the prompt below, replacing `{{FOLDER}}` with the folder path.
3. Review the proposed rename plan, then let it apply.

---

## The prompt

```
You are renaming real-estate listing photos so a downstream tool can auto-place them by room.

FOLDER: {{FOLDER}}

TASK
1. List every image in FOLDER (.jpg/.jpeg/.png/.gif/.webp). Ignore non-images.
2. Look at each image and classify it into exactly ONE category slug from the list below,
   based on what the photo shows — not its current filename.
3. Rename each file to:  <slug>-NN.<ext>
   - <slug> is the category slug (lowercase, exactly as written below).
   - NN is a zero-padded 2-digit counter, numbered per category in the order you process
     them (kitchen-01, kitchen-02, master-bath-01, …).
   - <ext> is the file's original extension, lowercased and unchanged.
4. Do a DRY RUN first: print a table of  old name -> new name  and a per-category count.
   Then apply the renames.

CATEGORY SLUGS (choose one per photo)
  exterior           Front of the home, facade, aerial/drone, street view, curb, elevation
  entry              Front porch, entryway, foyer, entrance, front door
  living             Living room, family room, great room, sitting room
  kitchen            Kitchen, butler's pantry
  dining             Dining room, breakfast nook
  master             Primary / master BEDROOM
  master-bath        Primary / master BATHROOM (ensuite off the primary bedroom)
  secondary-bedroom  Any other bedroom — guest room, kids' room, bunk room, nursery
  secondary-bath     Any other bathroom — guest bath, powder room, hall bath
  office             Office, study, den, library
  amenities          Gym, home theater/media, wine room, bar, game room, laundry,
                     mudroom, sauna, bonus room
  garage             Garage
  outdoor            Pool, patio, deck, spa/hot tub, yard, garden, balcony, fire pit,
                     outdoor living / kitchen
  interior           A general interior shot that doesn't fit a specific room —
                     hallway, staircase, landing, entryway hall, atrium
  floorplan          A floor plan, site plan, survey, or map (a drawing, not a photo)
  headshot           A portrait/photo of a PERSON (the listing agent)
  photo              Use ONLY if you genuinely cannot tell what the room is

PRIORITY RULES (apply top-down; first match wins — this mirrors the plugin's matcher)
  1. A person's portrait/headshot            -> headshot
  2. A drawn floor plan / site map           -> floorplan
  3. A BATHROOM off the primary bedroom      -> master-bath   (bath beats bedroom)
  4. Any other bathroom / powder room        -> secondary-bath
  5. The primary/master BEDROOM              -> master
  6. Any other bedroom                       -> secondary-bedroom
  7. Kitchen / dining / living / office / garage, by what's clearly shown
  8. Pool, patio, deck, yard, balcony        -> outdoor
  9. Facade, aerial, street/curb view        -> exterior
 10. Porch, foyer, front entrance            -> entry
 11. Gym, theater, bar, wine, laundry, sauna -> amenities
 12. Hallway, stairs, or unclear interior    -> interior
 13. Truly indeterminate                     -> photo

RULES
- Never delete, move out of the folder, edit, crop, or re-compress any image. Rename only.
- Keep the original file extension; only change the name.
- Do NOT invent slugs outside the list above.
- Avoid collisions: compute the full plan first, then rename (rename to a temporary name
  first if a target name would overwrite a not-yet-renamed source).
- When unsure between a specific room and "interior", prefer the specific room only if the
  room is clearly identifiable; otherwise use interior.
- Finish with a summary: total files, count per category, and any files left as "photo".
```

---

## Why these names

The plugin's auto-assign reads each filename, normalizes it (lowercasing, turning `-`/`_`
into spaces), and matches keywords to a room category, then fills that room's slots in
filename order. The slugs above are chosen so they match cleanly:

- `master-bath-01.jpg` → normalizes to `master bath 01` → **master bath** slot (bath is
  matched before bedroom, so it never lands in the bedroom).
- `secondary-bedroom-02.jpg` → **secondary bedroom** slot.
- `headshot-01.jpg` → recognized as the **agent headshot** and reserved for the agent slot.
- `floorplan-01.jpg`, `exterior-01.jpg`, `kitchen-01.jpg`, etc. → their matching slots.
- `photo-05.jpg` (unclassified) → flows into the generic numbered slots.

You do **not** need to name anything for the *Full page*, *Preview*, or *Mini preview*
slots — those draw from the whole photo pool automatically, so ordinary room names are all
you need.

## Numbering note
Numbering is per-category and only sets the order *within* that category (e.g. which kitchen
photo is `kitchen-01` vs `kitchen-02`). If a particular sequence matters (best shot first),
tell the agent to order by quality or by the sequence you prefer.
