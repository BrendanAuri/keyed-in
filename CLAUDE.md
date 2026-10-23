# Keyed In

A browser/PWA game for learning chords, scales and the theory around them, made for absolute beginners: name it, build it on the keyboard, hear it. Tools alongside (Explore, Scale Finder, Scale Guide) make it useful when writing music. A sibling of Dial In (`../Dial In`, live at https://brendanauri.github.io/dial-in/). This app will be live at https://brendanauri.github.io/keyed-in/.

**Start here**: [docs/handoff.md](docs/handoff.md) says where things stand, what's untested, which decisions are waiting and what's next. [SPEC.md](SPEC.md) is the design source of truth; keep it up to date with every change. [docs/plan.md](docs/plan.md) is the original plan, kept for its research and sources.

## Commands

```bash
npm run dev        # http://localhost:5174
npm test           # Vitest
npm run build      # tsc --noEmit, then vite build
npm run preview    # serve the build with the service worker, at http://localhost:4174
npm run icons      # redraw the app icons
```

`.claude/launch.json` has `dev` and `preview` for the browser pane. The ports are one above Dial In's on purpose (`vite.config.ts`): service workers belong to an origin, so a shared port lets one app's cached pages load in place of the other's.

## Conventions (SPEC §4 and §18)

- TypeScript strict, no `any`. No magic numbers outside `src/constants.ts` (small named constants at the top of a module are fine).
- `theory/`, `exercises/` and `srs/` are pure TypeScript: no React, no DOM.
- `content/` is plain, JSON-serialisable data. Nothing outside it names a specific pack or level.
- Every question comes from a seed. Once dailies ship, they're fingerprinted in a stability test: don't re-record a fingerprint to make a test pass.
- Storage keys come from `storageKey()` and start with `keyedin.`: this app shares the brendanauri.github.io origin, and its localStorage, with Dial In (`dialin.`).
- Ask before adding a dependency not listed in SPEC §3.
- On-screen text is for absolute beginners: plain words, and no term before an intro has shown what it means.
- Match the surrounding code: comments that say why, plain names, short documented functions.

## Workflow

- Milestone routine: build it; `npm test` and `npm run build` pass; check it in the browser at phone widths (320, 375 and 414 px) and on desktop; update SPEC.md and docs/handoff.md; commit with a `Co-Authored-By` line.
- **Pushing to `main` deploys the live site, so push only when asked.** After pushing, confirm the deploy by watching the bundle name in the live `index.html` change (about a minute), not by polling the GitHub API.
- Settle open questions first, as short multiple-choice questions with the recommendation first.
- End each milestone with a summary of what was built and how to run it, and a recommended next step.

## About me

- I know synths and bass music (I built Dial In). Keyed In's later packs and its tools lean on that.
- I test on Windows and on an Android phone.

## Environment (Windows)

- Shells: PowerShell and Git Bash. There's no Python: script edits with Node, from a script file rather than inline `node -e` (Bash mangles backticks and `${}`), or use the Edit tool.
- Git Bash rewrites `/keyed-in/`: use `MSYS_NO_PATHCONV=1` for `KEYED_IN_BASE` builds.
- Files checked out by git have Windows line endings, so prefer the Edit tool to exact-text scripts on them.
- Restart the dev server if it serves stale modules after a big refactor.
- Windows PowerShell 5.1 mangles double quotes inside arguments to programs like git, so write commit messages to a file and use `git commit -F <file>`.
