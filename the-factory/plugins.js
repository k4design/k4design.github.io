/* ============================================================
   THE PLUGIN LIST — the only file you edit to add a plugin.

   Plain JS rather than JSON on purpose: a <script> tag works when
   the page is opened straight off disk, so double-clicking
   index.html renders the library with no server involved.

   category: must match one of CATEGORIES below, which also sets
             the order the groups appear in the sidebar
   icon:     optional — 'assets/icons/name.png', or a single emoji.
             Omit it and the sidebar shows the plugin's initials.
   status:   live | beta | review | retired
             'review' shows as "in review". 'retired' sinks to the bottom
             of its category rather than vanishing.
   updated:  YYYY-MM-DD              (sorts newest-first within a group)
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
    /* Figma plugin plus an Illustrator panel. No icon yet, so the sidebar
       falls back to initials. */
    slug: 'impose-pro',
    name: 'Impose Pro',
    tagline: 'Lay one card out N-up on a real press sheet — duplex backs that line up, and booklet imposition that gets the page order right.',
    category: 'Print Production',
    status: 'live',
    owner: 'Kyle',
    updated: '2026-08-05',
    tags: ['imposition', 'print', 'illustrator', 'booklets'],
    guide: 'guides/impose-pro-guide.html',
  },
  {
    /* No icon yet — sidebar falls back to initials. */
    slug: 'csv-importer',
    name: 'CSV Importer',
    tagline: 'Map each CSV column onto a named layer once, then populate every card — pages duplicate themselves as the rows run over.',
    category: 'Print Production',
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
       Its guide carries no Figma Community link, so it has no floating CTA.
       No icon in assets/icons yet — the sidebar falls back to initials. */
    slug: 'creative-direction',
    name: 'Creative Direction',
    tagline: "A creative director's dashboard over monday.com — what's waiting, what's late, who's carrying what, on a Mac window or a phone screen.",
    category: 'Reporting',
    status: 'beta',
    owner: 'Kyle',
    updated: '2026-08-05',
    tags: ['monday', 'dashboard', 'macos', 'ios'],
    guide: 'guides/creative-direction.html',
  },
  {
    /* Chrome extension rather than a Figma plugin. No icon yet, so the
       sidebar falls back to initials. */
    slug: 'midjourney-prompt-injector',
    name: 'MidJourney Prompt Injector',
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
    /* Chrome extension rather than a Figma plugin.
       No icon yet, so the sidebar falls back to initials. */
    slug: 'mj-explore-grabber',
    name: 'MidJourney Explore Grabber',
    tagline: 'Describe a subject once, then collect matching MidJourney explore images at full resolution while you do something else.',
    category: 'Asset Prep',
    status: 'beta',
    version: '0.1',
    owner: 'Kyle',
    updated: '2026-08-05',
    tags: ['reference', 'chrome-extension', 'claude'],
    guide: 'guides/mj-explore-grabber.html',
  },
  {
    slug: 'frame-to-mp4',
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
];
