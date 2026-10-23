# Handoff: where Keyed In stands

Last updated 2026-10-24. Milestone 0 is committed, pushed and live.

- **Live site**: https://brendanauri.github.io/keyed-in/ (GitHub Pages, deployed by GitHub Actions on every push to `main`; the first deploy took about 50 seconds)
- **Repo**: https://github.com/BrendanAuri/keyed-in (public)
- **Design**: [SPEC.md](../SPEC.md) is the source of truth. §17 lists the milestones, §19 the settled and open decisions, §20 the idea backlog. [plan.md](plan.md) is the original plan, kept for the app survey, research and sources.
- **Health**: 3 tests pass; `npm run build` is clean.

## What's built

| Milestone | What |
| --- | --- |
| 0 | Scaffold with Dial In's stack and versions; SPEC, CLAUDE.md, README and this handoff; a Home screen listing the four modes and three tools as "Coming soon" with a link to Dial In; PWA shell (manifest, service worker, update prompt, icons drawn by `scripts/make-icons.mjs`); the GitHub Pages workflow; `storageKey()` with the `keyedin.` prefix |

## Still to do from setup ([setup.md](setup.md))

Steps 1–6 are done: GitHub Pages is on (Source: GitHub Actions), `origin` points at the GitHub repo, and `main` is pushed.

- **Link back from Dial In** (step 7): add a Keyed In link to Dial In's Home, in a Dial In session.

## Not checked yet

- Installing it on an Android phone alongside Dial In (both apps installed and working offline is a Milestone 9 check). The live site itself was checked in the browser pane: the bundle matches a local `/keyed-in/` build, the manifest and service worker are scoped to `/keyed-in/`, all five icons load, "Keyed In now works offline" shows on a first visit, and the console is clean.
- The "new version is ready" prompt: it needs a second deploy over a visited one, so check it after the next push.

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
