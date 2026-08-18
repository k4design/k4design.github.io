# CLAUDE.md - Campaign Spec Automation

Read this before changing anything. It carries context that is not obvious
from the code and rules that must survive every future edit.

## What this is

One Vercel serverless function at `api/spec/[channel].js`. monday.com fires a
webhook when a status column flips to "Design Approved" on the Listing Orders
board. The function pulls the order, generates a StackAdapt campaign build
spec with the Anthropic API, optionally copies the reference campaign in
StackAdapt (paused), and posts everything as an update on the monday item.

Routes: `/api/spec/display` and `/api/spec/billboard`. The dynamic segment
maps to the channel. Owner: Kyle Foreman, marketing and creative operations,
LPT Realty / Aperture Global.

## Hard rules - never remove or weaken these in any refactor

1. **This function never activates, resumes, or unpauses a campaign.** No
   code path may call a resume or activate mutation. Campaigns that spend
   money require a human click in StackAdapt. This is the load-bearing
   safety property of the whole system.
2. **This function never deletes or archives anything** in StackAdapt or
   monday. On error, leave partial state for a human to inspect and post an
   AUTOMATION ERROR update.
3. **Duplicate protection stays.** Before creating, check for an existing
   campaign with the same name and refuse to create a second one.
4. **DRY_RUN fails safe.** The gate is `DRY_RUN !== "false"` - absent or
   typo'd means dry run. Do not invert this to an opt-in.
5. **Segment lists in the system prompt are verbatim only.** A previous
   version said "keep the eight standard segments" without naming them and
   the model fabricated plausible fake segment names (Zillow In-Market,
   Bombora, etc.) that do not exist in this account. Every keep list and
   strip list must be written out in full. If you add a list, write every
   name. The prompt also instructs the model to say a list is unavailable
   rather than invent - keep that instruction.

## The monday column trap - verified 2026-08-18 via API schema

Display names on board 6530567822 (Listing Orders) are misleading. These
mappings were verified by querying the board schema and must not be changed
by reading the UI:

| Displayed as        | Internal column ID    | Notes                        |
|---------------------|-----------------------|------------------------------|
| Billboard           | `dup__of_design1`     | Billboard trigger column     |
| Digital Ads         | `dup__of_billboard`   | Display trigger column. Yes. |
| Just Listed Mailer  | `dup__of_digital_ads` | NEVER trigger on this        |
| Design Approved     | `date__1`             | A DATE column, not a trigger |

If columns are added, renamed, or rebuilt, re-verify with:
`query { boards(ids: [6530567822]) { columns { id title type } } }`

## StackAdapt facts

- Reference campaigns (clone sources, never clone arbitrary properties):
  display Diamond 3251039, display fallback 3324372, billboard Diamond
  3251037, billboard fallback 3324366.
- Campaign groups: Diamond 195699, Opal 195605, Diamond Black 379913.
- The copy mutation name is discovered at runtime by schema introspection
  (copyCampaign or duplicateCampaign) because the public schema has not been
  hand-verified. Keep the introspection; do not hardcode a mutation name
  without confirming it against the live schema.
- The reference read query also introspects available fields first. Guessed
  field names caused hard errors in v2. Keep that pattern.
- Billboards carry no audience. Geography for billboards is a cluster of
  nine to thirteen US counties with DMA off, delivered as an xlsx built from
  a master template (not in this repo; Kyle has it).

## Business rules encoded in the system prompt

Only four things change per property: name, flight, geography, creative.
Group and budget change with tier. Naming is street address then channel.
Flights are thirty days. Display budget 20,000 or 30,000 impressions at $5
CPM IMP; billboard $300 at $15 CPM COST. Display targets the feeder market
(where the buyer lives), billboards target the local county cluster. Writing
style: no em or en dashes anywhere, including generated specs.

## Environment variables (Vercel)

ANTHROPIC_API_KEY, MONDAY_API_TOKEN, STACKADAPT_API_KEY (write-scoped),
STACKADAPT_WRITE_ENABLED ("true" to enable the write path), DRY_RUN
("false" to arm; anything else is dry run).

## Deployment

Vercel project connected to this repo; push to main deploys. The monday
webhooks point at the production URL - if the URL ever changes, both
automations on the Listing Orders board must be repointed by hand.

## Known open work

- Audience strip is not automated. The copied campaign inherits eleven
  segments that must be removed by hand (listed in the spec output). Before
  automating, inspect how a copied campaign's audience is shaped in the
  write API - do not guess the mutation.
- Geo is not automated. Display geo is a judgment call per property;
  billboard geo needs the xlsx upload.
- Tier table only covers Opal and Diamond with verified data. Diamond Black
  budgets were not audited.
