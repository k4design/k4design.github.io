# The AI Design Resource Collection

A verified collection of skills, DESIGN.md libraries, MCP servers, and assets for designing better websites with Claude and other AI tools. All links verified live July 2026; star counts from the GitHub API at time of research.

---

## 1. Official Anthropic Design Skills

| Resource | Link | What's inside |
|---|---|---|
| **anthropics/skills** ★164k | https://github.com/anthropics/skills | The canonical skill repo. Design skills: `frontend-design` (anti-AI-slop UI), `canvas-design` (poster/art via design manifesto), `brand-guidelines` (template for encoding your own brand), `theme-factory` (10 preset themes), `web-artifacts-builder` (React+Tailwind+shadcn bundled to one HTML), `algorithmic-art` (seeded p5.js) |
| frontend-design SKILL.md | https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md | The single most useful file in the collection — the two-pass design-plan-then-build process, forbidden default aesthetics, "spend boldness in one place" |
| frontend-design plugin (Claude Code) | https://github.com/anthropics/claude-code/tree/main/plugins/frontend-design | Same skill packaged as an installable plugin — every UI task in a repo gets it automatically |
| Agent Skills docs | https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview | How to write your own SKILL.md (YAML frontmatter + instructions "like an onboarding guide") |
| "Improving frontend design through Skills" | https://claude.com/blog/improving-frontend-design-through-skills | The "prompt at the right altitude" post — a ~400-token aesthetics skill measurably improves output |
| Frontend aesthetics cookbook | https://platform.claude.com/cookbook/coding-prompting-for-frontend-aesthetics | Prompting patterns: guide dimensions individually, negative prompting, isolated refinement passes |

## 2. DESIGN.md Collections (drop-in design specs)

| Resource | Link | What's inside |
|---|---|---|
| **VoltAgent/awesome-design-md** ★105k | https://github.com/VoltAgent/awesome-design-md | 73 DESIGN.md files reverse-engineered from real brands (Linear, Stripe, Apple, Claude, Tesla, retro Dell 1996 / Nintendo 2001). The biggest drop-in collection |
| **google-labs-code/design.md** ★26k | https://github.com/google-labs-code/design.md | The official Google Labs DESIGN.md format spec + CLI (`@google/design.md`): lint with WCAG contrast checks, diff, export to Tailwind/DTCG. The upstream standard |
| **rohitg00/awesome-claude-design** ★922 | https://github.com/rohitg00/awesome-claude-design | 30+ DESIGN.md files across 9 aesthetic families (Editorial Minimalism, Terminal-Core, Cinematic Dark, Neon Brutalist…), prompt packs, remix recipes, anti-slop fingerprint list |
| kzhrknt/awesome-design-md-jp ★881 | https://github.com/kzhrknt/awesome-design-md-jp | Japanese DESIGN.md collection with CJK typography rules |
| ShriPunta/generate-design-md | https://github.com/ShriPunta/generate-design-md | A skill that generates/validates/exports DESIGN.md files (Google format → Tailwind or DTCG) |

## 3. UI/UX Skill Packs

| Resource | Link | What's inside |
|---|---|---|
| **nextlevelbuilder/ui-ux-pro-max-skill** ★110k | https://github.com/nextlevelbuilder/ui-ux-pro-max-skill | Searchable design database skill: 84 UI styles, 192 palettes, 74 font pairings, 99 UX guidelines, 161 reasoning rules. Works in Claude Code, Cursor, Windsurf |
| **Dammyjay93/interface-design** ★5.3k | https://github.com/Dammyjay93/interface-design | Design engineering kit: persistent design memory (`.interface-design/system.md`), design-review command scoring hierarchy/type/color/motion, direction boards |
| plugin87/ux-ui-agent-skills ★475 | https://github.com/plugin87/ux-ui-agent-skills | "Senior Design Architect": 17 skills, DTCG 3-tier tokens, 42+ component specs, WCAG 2.2 validation scripts, 6-dimension review scoring |
| Ilm-Alan/frontend-design ★89 | https://github.com/Ilm-Alan/frontend-design | Eight "aesthetic anchors" (Swiss, Brutalist, Retro-Futuristic, Organic, Lo-Fi…) each locking palette/type/texture to concrete CSS tokens |
| jiji262/claude-design-skill ★160 | https://github.com/jiji262/claude-design-skill | Portable adaptation of Claude.ai's internal design system prompt — decks, landing pages, posters |
| Koomook/claude-frontend-skills ★20 | https://github.com/Koomook/claude-frontend-skills | Anti-slop plugin: cultural theme systems (Cyberpunk, Brutalist, Vaporwave, Nordic), motion, layered backgrounds |
| lotfb86/web-design-skills | https://github.com/lotfb86/web-design-skills | 7 interconnected skills incl. a Vercel Web Interface Guidelines validator and a 14-phase site-rebuild pipeline (Astro 5 + Tailwind v4) |
| murphytrueman/design-system-ops ★148 | https://github.com/murphytrueman/design-system-ops | Design-system maintenance: governance encoder, codebase index, component decision tree |
| mattbx/shadcn-skills ★14 | https://github.com/mattbx/shadcn-skills | Discover among 1,500+ existing shadcn components before building custom; review against shadcn patterns |

## 4. Curated Meta-Lists & Rules

| Resource | Link | What's inside |
|---|---|---|
| **wilwaldon/Claude-Code-Frontend-Design-Toolkit** ★460 | https://github.com/wilwaldon/Claude-Code-Frontend-Design-Toolkit | 70+ tools in 10 sections with install profiles and MCP token-cost notes. Best starting index |
| ComposioHQ/awesome-claude-skills ★71k | https://github.com/ComposioHQ/awesome-claude-skills | 1000+ skill catalog with a design category |
| travisvn/awesome-claude-skills ★14k | https://github.com/travisvn/awesome-claude-skills | Curated skill index incl. canvas-design, algorithmic-art |
| PatrickJS/awesome-cursorrules ★40k | https://github.com/PatrickJS/awesome-cursorrules | Canonical .cursorrules collection — tailwind-shadcn, typescript-shadcn-nextjs, react component rules |
| spencergoldade/cursor-designer ★19 | https://github.com/spencergoldade/cursor-designer | Design-first Cursor rules template: UX/UI/IA/a11y rules with Core/Lean/Full profiles |
| x1xhlol/system-prompts-and-models-of-ai-tools ★142k | https://github.com/x1xhlol/system-prompts-and-models-of-ai-tools | Collected system prompts of v0, Lovable, Cursor, Devin — how design-focused AI builders prompt themselves |
| github/awesome-copilot ★37k | https://github.com/github/awesome-copilot | GitHub's community skill collection incl. production GSAP/Framer scroll-animation recipes |

## 5. Animation & Motion Skills

| Resource | Link | What's inside |
|---|---|---|
| **greensock/gsap-skills** ★12k | https://github.com/greensock/gsap-skills | Official GSAP AI skills: 8 skills (core, timeline, ScrollTrigger, SplitText/Flip/Draggable, React, performance). `npx skills add` into 40+ agents |
| freshtechbro/claudedesignskills ★613 | https://github.com/freshtechbro/claudedesignskills | 3D/animation skills: Three.js, React Three Fiber, Babylon.js, GSAP ScrollTrigger, Framer Motion |
| 199-biotechnologies/motion-dev-animations-skill ★78 | https://github.com/199-biotechnologies/motion-dev-animations-skill | Motion.dev (Framer Motion successor): spring physics, scroll effects, gestures |
| AThevon/genjutsu ★113 | https://github.com/AThevon/genjutsu | Creative-coding skills across React/Vue/Svelte/Canvas plus Compose and SwiftUI |
| Schoepplake/framer-motion-skill | https://github.com/Schoepplake/framer-motion-skill | Single-purpose Framer Motion skill |

## 6. Data Visualization Skills

| Resource | Link | What's inside |
|---|---|---|
| NTCoding/claude-skillz ★327 | https://github.com/NTCoding/claude-skillz | Thorough dataviz SKILL.md: perceptual foundations, chart selection, layout algorithms |
| careerhackeralex/visualize ★180 | https://github.com/careerhackeralex/visualize | One-prompt HTML visualizations: Chart.js, D3, Mermaid, Three.js, Leaflet, Reveal.js |
| dtran320/claud3 | https://github.com/dtran320/claud3 | D3.js plugin grounded in Tufte principles; picks charts by data question |

## 7. Component Libraries AI Works Well With

| Resource | Link | Why it fits AI workflows |
|---|---|---|
| **shadcn/ui** | https://github.com/shadcn-ui/ui | Copy-paste components living in your repo — agents read/modify source directly instead of fighting opaque packages. The de facto AI-native library |
| Radix Primitives | https://github.com/radix-ui/primitives | Unstyled accessible primitives — Radix guarantees the a11y/keyboard behavior agents get wrong |
| Magic UI | https://github.com/magicuidesign/magicui | 150+ animated components in shadcn-registry format — installable via the shadcn CLI/MCP |
| Aceternity UI | https://ui.aceternity.com | Premium animated Tailwind + Framer Motion components with full copy-paste source |
| daisyUI | https://github.com/saadeghi/daisyui | Semantic class components (`btn`, `card`) — tiny token cost, great for plain-HTML generation |
| HeroUI (ex-NextUI) | https://github.com/heroui-inc/heroui | Full React library with strong defaults for fast polished apps |
| Park UI | https://github.com/cschroeter/park-ui | shadcn-style copy-paste on Ark UI + Panda CSS for non-Tailwind stacks |
| HyperUI | https://github.com/markmead/hyperui | Free framework-free Tailwind HTML snippets (marketing, app, ecommerce) |

## 8. MCP Servers for Design Workflows

| Resource | Link | What it gives the agent |
|---|---|---|
| **Figma Dev Mode MCP** (official) | https://help.figma.com/hc/en-us/articles/32132100833559 | Structured design context from Figma frames: layout, variables, components |
| Framelink (Figma-Context-MCP) | https://github.com/GLips/Figma-Context-MCP | Community Figma MCP via API token — works without the desktop app |
| **Playwright MCP** | https://github.com/microsoft/playwright-mcp | The "look at what you built, then fix it" loop — drives a real browser via accessibility tree |
| Chrome DevTools MCP | https://github.com/ChromeDevTools/chrome-devtools-mcp | Console, network, performance traces, screenshots — for layout/CLS/perf debugging |
| shadcn MCP | https://ui.shadcn.com/docs/mcp | Browse/search/install components from any shadcn-compatible registry in natural language |
| Context7 | https://github.com/upstash/context7 | Injects version-correct library docs — eliminates hallucinated Tailwind/Next/Motion APIs |
| Magic MCP (21st.dev) | https://github.com/21st-dev/magic-mcp | Generates production-ready UI components from natural language into your codebase |
| screenshot-website-fast | https://github.com/just-every/mcp-screenshot-website-fast | Full-page screenshots sized for Claude's vision limits — cheap visual QA |

## 9. Theme & Token Tooling

| Resource | Link | AI workflow fit |
|---|---|---|
| **tweakcn** ★10k | https://github.com/jnsahaj/tweakcn (app: https://tweakcn.com) | Visual theme editor for shadcn/ui — paste the generated CSS-variable theme into `globals.css` for an instant non-default look |
| Style Dictionary | https://github.com/amzn/style-dictionary | One token JSON as source of truth → CSS/JS/iOS/Android outputs |
| W3C Design Tokens spec | https://github.com/design-tokens/community-group | The standard token format — instruct agents to emit spec-compliant tokens |
| uicolors.app | https://uicolors.app | Full Tailwind 50–950 shade scale from one brand color |
| Realtime Colors | https://www.realtimecolors.com | Palette + font pairing previewed on a live site; the URL encodes the palette — a shareable color spec |
| oklch.com | https://oklch.com | OKLCH picker/converter — the color space Tailwind v4 uses; perceptually uniform ramps |
| Huetone | https://github.com/ardov/huetone | APCA/LCh accessible color scales with predictable contrast; exports tokens |

## 10. Icons, Fonts & Assets (inline/offline-friendly)

| Resource | Link | AI workflow fit |
|---|---|---|
| Lucide | https://github.com/lucide-icons/lucide | 1,500+ consistent SVG icons; agents know the React API deeply, SVGs inline cleanly |
| Heroicons | https://github.com/tailwindlabs/heroicons | Tailwind Labs' MIT set — safest default for Tailwind projects |
| Phosphor Icons | https://github.com/phosphor-icons/homepage | 9,000+ icons, six weights — shift visual tone without changing icon vocabulary |
| Tabler Icons | https://github.com/tabler/tabler-icons | 5,900+ MIT stroke icons on a strict grid; huge dashboard coverage |
| Fontsource | https://github.com/fontsource/fontsource | Google Fonts as npm packages — self-host with one import, no external links |
| google/fonts | https://github.com/google/fonts | Raw font binaries + licenses for fully self-contained builds |
| unDraw | https://undraw.co | Open-license SVG illustrations, runtime-tintable to match generated palettes |

## 11. Inspiration & Reference

| Resource | Link | Use |
|---|---|---|
| Godly | https://godly.website | Curated best-of web design — screenshot a reference as a style target for vision-capable agents |
| Land-book | https://land-book.com | 5,000+ landing pages filterable by category/color (blocks bots; browse manually or via browser MCP) |
| Mobbin | https://mobbin.com | Real-product UI screenshot library — "make it look like a real app" reference set |
| SaaS Landing Page | https://saaslandingpage.com | Landing pages organized by section type (hero, pricing, testimonials) — prompt section-by-section |
| Dark Mode Design | https://www.darkmodedesign.com | Dark-mode-only gallery — reference for a common agent weak spot |
| design-resources-for-developers ★60k+ | https://github.com/bradtraversy/design-resources-for-developers | Mega-list of design assets — a greppable lookup index |
| Awesome-Design-Tools | https://github.com/goabstract/Awesome-Design-Tools | Design tools by category (tokens, a11y, animation) |

## 12. Animation Libraries (the code itself)

| Resource | Link | AI workflow fit |
|---|---|---|
| GSAP | https://github.com/greensock/GSAP | Industry-standard, now 100% free incl. all plugins — scroll-triggered and timeline-heavy builds |
| Motion (framer-motion) | https://github.com/motiondivision/motion | Declarative React animation agents know extremely well — props map cleanly from natural language |
| Animata | https://github.com/codse/animata | Copy-paste React + Tailwind animation effects, source-in-repo like shadcn |
| Vaul | https://github.com/emilkowalski/vaul | Native-feeling drawer/bottom-sheet an agent shouldn't hand-roll |
| AutoAnimate | https://github.com/formkit/auto-animate | One-line drop-in animating list/DOM changes — cheapest possible polish |
| ldrs | https://github.com/GriffinJohnston/ldrs | Modern loaders as framework-agnostic web components |

---

## Recommended starter stacks

**Minimal (any project):**
anthropics/skills `frontend-design` + a DESIGN.md from VoltAgent/awesome-design-md + Playwright MCP (so the agent can see its output).

**shadcn/Next.js project:**
frontend-design skill + shadcn MCP + tweakcn theme + Context7 + Magic UI registry + Lucide.

**Design-system / Figma team:**
Figma Dev Mode MCP + Code Connect + plugin87/ux-ui-agent-skills (DTCG tokens, WCAG scripts) + Style Dictionary.

**Marketing/landing pages:**
UI/UX Pro Max skill + greensock/gsap-skills + Aceternity/Magic UI + Godly/Land-book references.
