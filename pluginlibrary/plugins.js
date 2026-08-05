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
  'Video & Motion',
  'Asset Prep',
  'Reporting',
  'Utilities',
];

const PLUGINS = [
  {
    slug: 'dezzy-magazine',
    name: 'Dezzy Magazine',
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
    slug: 'real-estate-autofill',
    name: 'Real Estate Autofill',
    tagline: 'Tag any flyer or listing sheet once, then fill every property from a form and a photo shoot.',
    category: 'Listings & Print',
    icon: 'assets/icons/real-estate-autofill.png',
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
