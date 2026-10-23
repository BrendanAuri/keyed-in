# Handoff: where Keyed In stands

Last updated 2026-10-24. Milestone 0 is committed locally on `main`. Nothing has been pushed, and the repo has no remote yet.

- **Live site**: not yet. It will be https://brendanauri.github.io/keyed-in/ (GitHub Pages, deployed by GitHub Actions on every push to `main`)
- **Repo**: https://github.com/BrendanAuri/keyed-in (public, empty until the first push)
- **Design**: [SPEC.md](../SPEC.md) is the source of truth. §17 lists the milestones, §19 the settled and open decisions, §20 the idea backlog. [plan.md](plan.md) is the original plan, kept for the app survey, research and sources.
- **Health**: 3 tests pass; `npm run build` is clean.

## What's built

| Milestone | What |
| --- | --- |
| 0 | Scaffold with Dial In's stack and versions; SPEC, CLAUDE.md, README and this handoff; a Home screen listing the four modes and three tools as "Coming soon" with a link to Dial In; PWA shell (manifest, service worker, update prompt, icons drawn by `scripts/make-icons.mjs`); the GitHub Pages workflow; `storageKey()` with the `keyedin.` prefix |

## Still to do from setup ([setup.md](setup.md))

1. **Turn on GitHub Pages**: the repo doesn't have Pages enabled yet. Settings → Pages → Build and deployment → Source: **GitHub Actions**. Without it, the first deploy fails at the Pages steps.
2. **Connect and push** (step 6): `git remote add origin https://github.com/BrendanAuri/keyed-in.git`, then `git push -u origin main`. Pushing deploys.
3. **Link back from Dial In** (step 7): once the site is live, add a Keyed In link to Dial In's Home, in a Dial In session.

## Not checked yet

- The deployed site, and installing it on an Android phone alongside Dial In (both apps installed and working offline is a Milestone 9 check).
- The "new version is ready" prompt: it needs a second build served over an installed one, so check it after the second deploy. ("Keyed In now works offline" was checked with `npm run preview`: it shows on a first visit and clears after 4 seconds.)

## Decisions waiting (SPEC §19)

Each at the milestone that needs it: synth patches or a sampled piano (Milestone 2); whether the tools come before the question types (Milestone 3); FSRS or rolling accuracy for ear items (Milestone 6); what counts towards the streak (Milestone 8); notation and a second instrument view (later).

## Next

**Milestone 1: the theory engine.** Spelled notes, intervals, chords, scales, keys, numerals and chord naming, plus frequencies and scale matching for the Scale Finder. Pure TypeScript with thorough tests, checked against Tonal (a dev dependency, already agreed).

## How to work on it

```bash
npm install
npm run dev        # http://localhost:5174
npm test
npm run build
npm run preview    # http://localhost:4174, with the service worker
```

- **Milestone routine**: build it, `npm test` and `npm run build` pass, check it in the browser at 320, 375 and 414 px, update SPEC.md and this file, commit. **Pushing deploys the live site**, so it's done only when asked.
- **Checking a deploy**: the live `index.html` names the bundle (`assets/index-<hash>.js`). Note it before pushing, then poll until it changes (about a minute). This avoids the GitHub API, which limits unauthenticated calls to about 60 an hour.

## Lessons learned

Carried over from Dial In, plus what Milestone 0 turned up:

- There's no Python here. Scripted multi-line edits go through Node from a script file, or the Edit tool: `\n` inside a Bash heredoc can end up as a real newline, which broke a scripted edit to `make-icons.mjs` in Milestone 0 (it failed before writing, so nothing was damaged).
- Files restored by git have Windows line endings in the working copy, so exact-text replacements written with `\n` may not match them. The Edit tool handles them.
- Git Bash turns `/keyed-in/` into a Windows path, so sub-path builds need `MSYS_NO_PATHCONV=1`. In PowerShell, set `$env:KEYED_IN_BASE` instead.
- Dev and preview run on 5174 and 4174, one above Dial In's ports. Service workers and caches belong to an origin (`localhost:4173` is one origin whichever app serves it), so on a shared port one app's worker could serve its cached pages in place of the other app. When testing the service worker, unregister it afterwards from a page on the same port: it keeps serving its cached page even after the server stops, which is also how to reach it to remove it.
- `package-lock.json` was copied from Dial In before the first `npm install`, so every shared package is on exactly Dial In's version.
- The browser pane's viewport can be set to 320, 375 and 414 px; measuring layout with JavaScript (`scrollWidth` against `innerWidth`) catches sideways overflow that screenshots can miss.
