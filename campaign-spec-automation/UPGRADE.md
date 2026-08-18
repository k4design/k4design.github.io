# V2 Upgrade - Campaign Creation Behind a Dry Run Gate

## What changed from v1
Same spec generation and posting. New: when enabled, the function copies the
reference campaign in StackAdapt, renames it, sets the thirty day flight,
moves it to the tier campaign group, and leaves it PAUSED. The task update
then contains the spec, the new campaign ID, and the remaining by-hand steps.

Hard rules in the code: never activates, never deletes, refuses to create a
duplicate name.

## Deploy
1. Drag this folder's zip onto vercel.com/drop OR, to keep the same URL,
   replace the file in your existing project (Git route) - a fresh Drop
   creates a NEW project with a NEW URL and the monday webhooks would need
   repointing. If you Drop a new project, update both webhook URLs.
2. Environment variables (Settings > Environment Variables, then Redeploy):
   - ANTHROPIC_API_KEY        (unchanged)
   - MONDAY_API_TOKEN         (unchanged)
   - STACKADAPT_API_KEY       (REPLACE with the new write-scoped key)
   - STACKADAPT_WRITE_ENABLED (new) = true
   - DRY_RUN                  (new) = true

## Rollout
Phase 1 - DRY_RUN=true. Flip a label on a safe item. The task update shows
the exact mutations the function WOULD run. Read two or three of these.
Confirm: right reference ID, right group, right name, PAUSED state present.

Phase 2 - set DRY_RUN=false, Redeploy. Next label flip creates a real paused
campaign. Open it in StackAdapt, QA against the reference, finish the by-hand
list, activate yourself.

If anything looks wrong at any point, set STACKADAPT_WRITE_ENABLED=false and
Redeploy - the function instantly reverts to v1 behavior, specs only.

## Honest limits
- The copy mutation name is discovered at runtime via schema introspection
  (copyCampaign or duplicateCampaign). If neither exists on your key's
  schema, the update says WRITE PATH UNAVAILABLE and the spec still posts.
- The audience strip is NOT automated yet. The display punch list says to
  strip by hand. Automating it is a follow-up once we see how the copied
  campaign's audience is shaped in the API.
- Geo is NOT set by the automation. Display geo needs judgment per property;
  billboard geo needs the xlsx upload. Both stay on the punch list.
- Update field names (startTime, endTime, campaignGroupId) follow the SDK
  documentation shape but the first dry run to live transition should be
  watched. Any schema mismatch throws, posts an AUTOMATION ERROR update,
  and creates nothing.
