/* ============================================================
   THE PLUGIN LIST — the only file you edit to add a plugin.

   Plain JS rather than JSON on purpose: a <script> tag works when
   the page is opened straight off disk, so double-clicking
   index.html renders the library with no server involved.

   type:     what it actually is — 'Figma plugin', 'Chrome extension',
             'Mac + iPhone app'… shown under each row in the sidebar
   category: must match one of CATEGORIES below, which also sets
             the order the groups appear in the sidebar
   icon:     optional — 'assets/icons/name.png', or a single emoji.
             Omit it and the sidebar shows the plugin's initials.
   status:   live | beta | review | retired
             'review' shows as "in review". 'retired' sinks to the bottom
             of its category rather than vanishing.
   updated:  YYYY-MM-DD              (sorts newest-first within a group)
   order:    optional — lower sorts first inside a category, ahead of the
             date. Use it to pin one plugin above a newer sibling.
   ============================================================ */

/* Sidebar group order. Add a category here before using it. */
const CATEGORIES = [
  'Listings & Print',
  'Print Production',
  'Video & Motion',
  'Asset Prep',
  'Reporting',
  'Utilities',
];

const PLUGINS = [
  {
    slug: 'dezzy-magazine',
    type: 'Figma plugin',
    name: 'dezzy Magazine',
    tagline: 'Tag a luxury property template once, then pour a hundred pages of listing content in one pass.',
    category: 'Listings & Print',
    icon: 'assets/icons/dezzy-magazine.png',
    status: 'live',
    version: '0.1',
    owner: 'Kyle',
    updated: '2026-07-28',
    tags: ['listings', 'print', 'automation'],
    guide: 'guides/dezzy-magazine.html',
  },
  {
    slug: 'dezzy-autofill',
    type: 'Figma plugin',
    name: 'dezzy AutoFill',
    tagline: 'Tag any flyer or listing sheet once, then fill every property from a form and a photo shoot.',
    category: 'Listings & Print',
    icon: 'assets/icons/dezzy-autofill.png',
    status: 'live',
    owner: 'Kyle',
    updated: '2026-08-04',
    tags: ['listings', 'autofill', 'templates'],
    guide: 'guides/AutoLayout.html',
  },
  {
    slug: 'mockup-forge',
    /* pinned above Mockup Mason, which is newer and would otherwise sort first */
    order: -1,
    type: 'Figma plugin + render service',
    name: 'Mockup Forge',
    tagline: 'Drop artwork into a frame and get it back photographically warped onto phones, mugs, shirts, billboards — video included.',
    category: 'Asset Prep',
    icon: 'assets/icons/mockup-forge.png',
    status: 'beta',
    version: '0.1',
    owner: 'Kyle',
    updated: '2026-08-05',
    tags: ['mockups', 'compositing', 'render'],
    guide: 'guides/mockup-forge-guide.html',
  },
  {
    /* Figma plugin plus an Illustrator panel. */
    slug: 'impose-pro',
    type: 'Figma plugin + Illustrator panel',
    name: 'Impose Pro',
    tagline: 'Lay one card out N-up on a real press sheet — duplex backs that line up, and booklet imposition that gets the page order right.',
    category: 'Print Production',
    icon: 'assets/icons/impose-pro.png',
    status: 'live',
    owner: 'Kyle',
    updated: '2026-08-05',
    tags: ['imposition', 'print', 'illustrator', 'booklets'],
    guide: 'guides/impose-pro-guide.html',
  },
  {
    slug: 'csv-importer',
    type: 'Figma plugin',
    name: 'CSV Importer',
    tagline: 'Map each CSV column onto a named layer once, then populate every card — pages duplicate themselves as the rows run over.',
    category: 'Print Production',
    icon: 'assets/icons/csv-importer.png',
    status: 'live',
    owner: 'Kyle',
    updated: '2026-08-05',
    tags: ['csv', 'data-merge', 'cards', 'batch'],
    guide: 'guides/csv-importer-guide.html',
  },
  {
    /* Figma plugin plus an InDesign/Illustrator panel. Development install
       only for now. No icon yet — sidebar falls back to initials. */
    slug: 'text-replacer-tags',
    type: 'Figma plugin + Adobe panel',
    name: 'Text Replacer + Tags',
    tagline: 'Name a layer *Headline and it becomes an editable field; tags swap one phrase inside paragraphs across dozens of layers.',
    category: 'Asset Prep',
    status: 'beta',
    owner: 'Kyle',
    updated: '2026-08-05',
    tags: ['copy', 'tokens', 'adobe', 'weekly'],
    guide: 'guides/text-replacer-tags-guide.html',
  },
  {
    /* Not a Figma plugin: a Mac + iPhone app reading three monday.com boards.
       Its guide carries no Figma Community link, so it has no floating CTA. */
    slug: 'creative-direction',
    type: 'Mac + iPhone app',
    name: 'Creative Direction',
    tagline: "A creative director's dashboard over monday.com — what's waiting, what's late, who's carrying what, on a Mac window or a phone screen.",
    category: 'Reporting',
    icon: 'assets/icons/creative-direction.png',
    status: 'beta',
    owner: 'Kyle',
    updated: '2026-08-05',
    tags: ['monday', 'dashboard', 'macos', 'ios'],
    guide: 'guides/creative-direction.html',
  },
  {
    /* Chrome extension rather than a Figma plugin. */
    slug: 'midjourney-prompt-injector',
    type: 'Chrome extension',
    name: 'MidJourney Prompt Injector',
    icon: 'assets/icons/midjourney-prompt-injector.png',
    tagline: 'Separate a batch of prompts with a $ and it types every one into the MidJourney prompt bar for you.',
    category: 'Asset Prep',
    status: 'beta',
    version: '1.1',
    owner: 'Kyle',
    updated: '2026-08-05',
    tags: ['midjourney', 'chrome-extension', 'batch'],
    guide: 'guides/midjourney-prompt-injector.html',
  },
  {
    /* Chrome extension rather than a Figma plugin. */
    slug: 'midjourney-abducter',
    type: 'Chrome extension',
    name: 'MidJourney Abducter',
    icon: 'assets/icons/midjourney-abducter.png',
    tagline: 'Describe a subject once, then collect matching MidJourney explore images at full resolution while you do something else.',
    category: 'Asset Prep',
    status: 'beta',
    version: '0.1',
    owner: 'Kyle',
    updated: '2026-08-05',
    tags: ['reference', 'chrome-extension', 'claude'],
    guide: 'guides/midjourney-abducter.html',
  },
  {
    slug: 'frame-to-mp4',
    type: 'Figma plugin',
    name: 'Frame to MP4',
    tagline: 'Export a run of frames as one video — embedded videos play for real, audio included, encoded locally.',
    category: 'Video & Motion',
    icon: 'assets/icons/frametomp4.png',
    status: 'review',
    version: '1.0',
    owner: 'Kyle',
    updated: '2026-08-04',
    tags: ['video', 'export', 'motion'],
    guide: 'guides/frametoMP4.html',
  },
  {
    slug: 'mockup-mason',
    type: 'Photoshop panel',
    name: 'Mockup Mason',
    tagline: 'Bake displacement, shadow and highlight maps from a real product photo, straight into a Mockup Forge item.',
    category: 'Asset Prep',
    icon: 'assets/icons/mockup-mason.png',
    status: 'beta',
    version: '1.0',
    owner: 'Kyle',
    updated: '2026-08-06',
    tags: ['mockups', 'photoshop', 'maps', 'uxp'],
    guide: 'guides/mockup-mason-guide.html',
  },
];
