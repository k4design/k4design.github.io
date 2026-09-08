AgentWhoKnows.com - New Construction - 300x250 HTML5 (animated)
================================================================
Unit:   AWK_NC_CC_EXT_300x250_v1   (closing-costs track, exterior image, v1)
Folder: AWK_NC_CC_EXT_300x250_v1/  index.html + bg-300x250.mp4 + bg-300x250-still.jpg
Zip:    AWK_NC_CC_EXT_300x250_v1.zip  (index.html at the root, as StackAdapt expects)
Backup: AWK_NC_CC_EXT_300x250_v1_backup.jpg  (final frame; upload separately if asked)

Copy (verbatim from the brief, Section 4)
  Category line (image layer only):  New construction has it all.
  Question Q2 (default, no number):  Wondering which builders are paying closing costs this month?
  Resolution (short):                Meet the Agent Who Knows new construction.
  CTA (primary):                     Learn More
  Logo:                              light lockup (white + #c8861a) on the #141b33 panel

Structure: image top (300x118, exterior house footage, 40px slow pan, 15 s ping-pong so
it never cuts), copy on a solid #141b33 panel below (brief 7: copy never over the photo).
Motion mirrors the buymyhouse units: category line up first and away by 3.9 s, question
slides in from the left, resolution from the right, CTA fades in and breathes; the final
frame holds question + resolution + CTA + logo (brief 9). Animations run 3 loops then
stop (IAB / StackAdapt), the video pauses with them. Whole unit clickable via clickTag
(placeholder URL - the landing page URL is to be supplied with the round-1 handoff).

FONTS - PLEASE READ
  The brief calls for Omnes (headlines) and Inter (body). Neither is installed on the
  build machine and Omnes is a licensed face, so this v1 is set in stand-ins:
    headline / category line  ->  Avenir Next Demi Bold   (for Omnes)
    resolution / CTA label    ->  Helvetica Neue          (for Inter)
  All text is vector outlines (no font files shipped, no external requests), so swapping
  to the real faces is a regeneration step once the OTF/TTF files are provided.

Compliance (brief 8): question is information-seeking, no number, no people or builder
marks in the footage, no buyer descriptors, no search/compare language. EHO mark not
required at 300x250 (landing page carries it).

---------------------------------------------------------------------------------
v2 - multi-frame cut:  AWK_NC_CC_EXT_300x250_v2/  +  AWK_NC_CC_EXT_300x250_v2.zip
Same copy, same rules, spread over five 3-second frames so the type can run large:
  1  0-3 s   image full-bleed, "New construction has it all." (26 px)
     3.0 s   navy panel rises from the bottom over the (fixed) video; CTA and logo with it
  2  3-6 s   "Wondering which builders are..."                (26 px, was 15.5)
  3  6-9 s   "paying closing costs this month?"               (26 px)
  4  9-12 s  "Meet the Agent Who Knows new construction."     (21 px, was 11; "Agent Who Knows" in #c8861a)
  5  12-15 s question + resolution + CTA + logo composite - HELD (final-frame rule)
Video: the 390x250 house asset (15 s ping-pong) serves both the full-bleed opener and the
band. Three loops then stop, as v1. Backup: AWK_NC_CC_EXT_300x250_v2_backup.jpg.
Font stand-ins as v1 (Avenir Next for Omnes, Helvetica Neue for Inter) - outlines, so a
swap to the real faces is a regeneration once the files are supplied.

---------------------------------------------------------------------------------
v2 footage: construction_ext.webm (832x464, 12.9 s, silent). Sampled to 225 frames and
played at 15 fps = 15 s (0.86x speed), cover-cropped to 340x250 - exactly the strip the
40 px pan reveals, so no bits are spent on pixels that are never shown. Encoded silent
H.264 with MULTI-PASS rate control for clarity at the size; the still is JPEG q70.

  !! COMPLIANCE FLAG - read before trafficking !!
  This clip shows two people (an agent and a client, silhouetted, at a build site).
  Brief section 6 "Not in the image - no exceptions": NO PEOPLE, no agents, no
  "meet your agent" imagery (fair-housing review). Section 2: the image layer must
  not sell AWK. This footage was used at the client's explicit request; expect it to
  be challenged in review. The house-exterior version of the footage is preserved in
  the buymyhouse lite-house build (dist/300x250/lite-house/bg-300x250.mp4) and can be
  swapped back in one step.

---------------------------------------------------------------------------------
v3 - the v2 multi-frame cut with newconstruction_2.mp4:  AWK_NC_CC_EXT_300x250_v3/ + .zip
Source 1936x1080, 24 fps, 5.2 s, silent, no people (framed house at sunset, hard hat and
keys in the foreground - within the brief's image rules; note Section 6 lists "keys in
hand" among stock cliches, these are on a post). Frames pulled straight from the MP4 with
AVFoundation and Lanczos-downscaled to the 340x250 strip (no browser round-trip), played
as a 15 s ping-pong (push-in, then pull-out), multi-pass H.264. Navy panel at 75%
opacity on v2 and v3 so the footage reads through it. Backup: ..._v3_backup.jpg.
v3 motion: the video rides up with the panel, half the panel's travel (66 px of 132), so the
band settles on the middle of the frame. v2's video stays fixed. Text blocks between the gold
bar and the button are vertically centred in that space on both cuts (v2/v3 share the layout).

---------------------------------------------------------------------------------
v1c / v2c - agentwhoknows_c.webm (1936x1080, 5.2 s, silent): a golden-hour streetscape of
finished homes - the brief's treatment C, no people. v1c = the v1 single-frame layout with
the footage in the top band (340x118); v2c = the v2 five-frame cut (340x250, 40 px pan).
Both play the 5.2 s clip as a 15 s ping-pong (no cuts); frames were resampled from the
1080p source with high-quality scaling and encoded multi-pass H.264 (60 / 68 kbps).

=================================================================================
728x90 leaderboards - AWK_NC_CC_EXT_728x90_v1..v4 (+ .zip, + _backup.jpg)
  v1 house exterior  |  v2 construction_ext (people - flagged)  |  v3 newconstruction_2  |  v4 agentwhoknows_c (streetscape)
Brief row for 728x90: image strip left, SHORT question + SHORT resolution + CTA + logo (no category overlay).
Layout: 160 px video strip (200 px asset, 30 px pan, inner shadow), 2 px gold rule, copy column 176-432,
CTA 96x26, STACKED logo (agentwhoknows_stackedlogo.svg) 160x45 px right. Three frames on the 15 s loop: question (20 px, "closing costs" gold bold
italic) -> resolution (17 px, "Agent Who Knows" bold gold) -> composite question + resolution held (final
frame rule). Three loops then stop; whole unit clickable; hidden-until-playing still for Safari.
Video: 200x90 strips resampled from each source (ping-pong for the 5 s clips, straight for the 12.9 s one),
multi-pass H.264 45 kbps. Fonts: same stand-ins as the 300x250s.

ENCODER NOTE: all videos are single-pass H.264 (AVFoundation). A multi-pass variant was trialled for
extra clarity, but Chromium pauses those files at ~1.8 s when the tab is in the background while the
single-pass files play on; the difference is in the container, not the pictures, and it was not worth
the risk for ~2% of file size. Do not re-encode with performsMultiPassEncodingIfSupported.

320x50 mobile banners - AWK_NC_CC_EXT_320x50_v1..v4 (+ .zip, + _backup.jpg)
Layout: 74 px video strip (reuses the 728 asset 200x90, CSS cover-cropped, 16 px pan), 2 px gold rule,
copy column 84-240 auto-fit (question ~12.9 px, resolution ~12 px), CTA 62x18 right.
Frames: question (0.4-6 s) -> resolution (6-10 s) -> end card (10.0-10.6 s, held): the navy panel and gold
rule slide left over the video strip; question left-aligned (x 8), CTA slides to the middle, stacked logo 21 px tall at right; question fits between
logo and CTA (~10 px, two lines), CTA stays at right. Logo is not persistent (no room); it lives in the end card.

HD builds (up to 700 KB zipped) - every unit above also exists as <folder>_HD (+ .zip, + _backup.jpg)
Same index.html (layout, edit, loop cap, fallback) with the video re-encoded at 2x resolution from the sources:
300x250 bands 680x236 @ 180 kbps, 300x250 strips 680x500 @ 300 kbps, 728x90/320x50 strips 400x180 @ 200 kbps
(single-pass H.264, 15 fps, same cover crops and ping-pong/stretch as the lite builds). Zips 430-696 KB.

v3 / v2c final frame (and their _HD twins): at 12.0-12.6 s the 75 % navy veil and the gold rule scroll to the top of the
frame (full-height overlay); the composite is re-set on three lines at ~23 px (question) + ~14 px (body), centred
between the top and the CTA row. v2 keeps the 75 % panel end frame.

kitchen.webm versions (832x464, 5.2 s, silent, no people - a bright kitchen interior):
  AWK_NC_CC_EXT_300x250_v1k (v1 single-frame layout, 340x118 band, 40 px pan)
  AWK_NC_CC_EXT_300x250_v2k (v2 five-frame cut, 340x250, 40 px pan, full-height end frame as v3/v2c)
  AWK_NC_CC_EXT_728x90_v5 and AWK_NC_CC_EXT_320x50_v5 (200x90 strip)
  each + .zip + _backup.jpg, and _HD twins (680x236 / 680x500 / 400x180). All 15 s ping-pong.
(v2/v3-template veil: vertical gradient navy 0.66 at the top -> 0.95 at the bottom, replacing the flat 0.75; v2, v3, v2c, v2k + HD twins)
(300x250 end frames: on the full-height frames (v3, v2c, v2k) the body is +50% (~20 px) on two lines; v1, v1c, v1k and v2 keep the 11 px single-line body. "new construction." is Helvetica Neue Italic on all.)
(300x250: the 'New construction has it all.' category line is removed from every unit - v1 template overlay and the v2-template frame 1; frame 1 is now the footage alone for 3 s.)
(v3 end frame: question ~23 px on four lines - Wondering which / builders are / paying closing costs / this month? - 1.5 px gold rule, then the ~17 px two-line body. AWK_Q_STYLE=accent. v2c and v2k use the same end-frame layout.)
(v2-template timeline, after the category line was removed: panel rises 0.3-0.9 s, CTA+logo 0.6-1.2 s, question 0.9-4.4 s, closing costs 4.4-7.9 s, resolution 7.9-11.4 s, composite in 11.4-12.0 s and held to 15 s. Each frame ~3.5 s, no empty opener.)
(300x250: CTA + logo row at y 207-233 (5 px below the original 202); copy positions unchanged.)

Equal Housing Opportunity logo (equal-housing-opportunity.svg, white, 20x20):
  300x250 v1/v1c/v1k - fades in 0-0.6 s, top right over the video band, stays through the loop (x 272, y 8).
  300x250 v2/v3/v2c/v2k - same spot, drawn above the veil, fades in with the final frame (11.4-12.0 s) and stays.
  728x90 (all) - static, bottom left of the video strip (x 8, y 62). 320x50 not marked.
(300x250 body: "new construction." is Helvetica Neue Medium Italic - one weight above the Regular sentence.)
(v1k: Equal Housing mark in gold #c8861a instead of white - AWK_EHL_COLOR.)

Large sizes (HD only, up to 700 KB zipped) - v1 house exterior, v3 newconstruction_2, v4 agentwhoknows_c, v5 kitchen:
  AWK_NC_CC_EXT_160x600_v*_HD  skyscraper: the 300x600 layout at 160 - 230 px band, stacked logo 100 px under the rule, five-line question (gold pair in Cormorant Garamond Bold Italic), short rule, body, CTA 120x32, elliptical panel corner, EHL top right.
  AWK_NC_CC_EXT_300x600_v*_HD  half page: 230 px band (340x270 asset, cover-cropped), stacked logo 120 px under the rule, four-line question (~27 px, 'paying closing costs' in Cormorant Garamond Bold Italic sized to match x-height), short gold rule, body, CTA 130x34 bottom left, EHL top right. Panel top-right corner rounded with an elliptical curve (80 wide x 54 tall, straightening level with the logo bottom).
  AWK_NC_CC_EXT_970x250_v*_HD  billboard: 400 px strip left (440x250 -> 880x500, 40 px pan), question 30 px on two lines, body 18 px,
                               stacked logo 170 px bottom left of the panel, CTA 110x30 bottom right, EHL bottom left of the strip.
  AWK_NC_CC_EXT_970x90_v*_HD   super leaderboard: the 728 three-frame cut on a 220 px strip (250x90 -> 500x180), copy capped at 26 px,
                               end frame question capped at 20 px. EHL bottom left of the strip.
  Single-frame sizes use the v1 motion (question 0.6-1.2 s, body 1.5-2.1 s, CTA 2.4-2.9 s, logo/EHL 0-0.6 s), 3 loops then hold.
(All AWK units: accent TEXT runs use #FFAE2B; rule, CTA, panel edges and logo stay #c8861a.)
(All AWK CTA pills: #FFAE2B. v1/v1c/v1k 300x250 panel: horizontal gradient #1b1f30 (left, low saturation) -> #0f1b4f (right, high saturation).)
(300x600 v1/v3/v4/v5 + HD: 'paying closing costs' one weight heavier - Cormorant Garamond Bold Italic is the family's top weight, so the
 outline carries a same-colour 1.2 px stroke; line width unchanged. tools/retext-tall.py.)
(160x600 v1/v3/v4/v5 HD: copy re-set larger - question 19 px Avenir Next Demi Bold / 25 px Cormorant (was 16 / ~21) on five lines:
 Wondering / which builders / are paying / closing costs / this month?; body 11.5 px Helvetica Neue (was 9.5) on three lines,
 'new construction.' Medium Italic; gold lines carry the same +0.8 px stroke. Text outlined with CoreText: tools/outline.swift.)
