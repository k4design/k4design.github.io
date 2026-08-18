# Campaign Spec Automation

monday.com label flip -> Vercel function -> Claude generates a StackAdapt
campaign build spec -> optional paused campaign created via StackAdapt API ->
spec posted as an update on the monday task.

- `api/spec/[channel].js` - the entire function (routes: display, billboard)
- `CLAUDE.md` - hard rules and verified facts; read first, especially before
  editing with a coding agent
- `SETUP.md` - original deploy and webhook setup walkthrough
- `UPGRADE.md` - the v2 write-path rollout notes (dry run phases)

Deploys via Vercel on push once the repo is connected to the Vercel project.
Never commit API keys; they live in Vercel environment variables only.
