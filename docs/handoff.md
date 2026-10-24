# Handoff: where Keyed In stands

Last updated 2026-10-24, at the end of the first working session. Read this first, then [SPEC.md](../SPEC.md) for anything in detail.

## At a glance

- **Live site**: https://brendanauri.github.io/keyed-in/ (GitHub Pages, deployed by GitHub Actions on every push to `main`, live about 40–50 seconds after a push)
- **Repo**: https://github.com/BrendanAuri/keyed-in (public)
- **Live now**: Milestones 0 to 4 plus the two Drill fixes, bundle `index-CqpFbcG6.js`.
- **Not pushed**: only docs commits (this handoff and the session wrap-up). Pushing them redeploys the same app; there's no rush.
- **Health**: 227 tests in 26 files pass, including the Tonal checks (`src/theory/oracle.test.ts`) and a sweep of 300 questions per type (`src/exercises/questions.test.ts`). `npm run build` is clean.
- **Design**: [SPEC.md](../SPEC.md) is the source of truth: §17 milestones, §19 settled and open decisions, §20 the idea backlog. [plan.md](plan.md) is the original plan, kept for the app survey, research and sources. [setup.md](setup.md) was the one-off setup guide.

## What's built

| Milestone | What |
| --- | --- |
| 0 | Scaffold with Dial In's stack and versions; SPEC, CLAUDE.md, README and this handoff; Home with a link to Dial In; PWA shell (manifest, service worker, update prompt, amber piano-key icons drawn by `scripts/make-icons.mjs`); the GitHub Pages workflow; `storageKey()` with the `keyedin.` prefix |
| 1 | The theory engine in `src/theory/` (SPEC §5): spelled notes and pitches, intervals, 22 chord types, 13 scales and modes, keys and the circle of fifths, Roman numerals, chord naming, frequencies and harmonics, scale matching. Tonal is a dev dependency, used only as the answer key |
| 2 | Sound and keyboard (SPEC §6, §7, §13): a trimmed copy of Dial In's voice with four fixed sounds (Electric piano, Organ, Pluck, Pad, levelled to match); playback helpers (chords together, strummed or one at a time; scales; cadences; progressions voiced like a pianist, root in the bass); Start screen, tabs and hash routes; the multi-touch keyboard; saved settings; Explore |
| 3 | The tools (SPEC §14): Scale Finder (tap, type names or frequencies; grouped results, one-note-off matches, harmonics, A4 tuning, frequency table) and Scale Guide (feel and colour notes, chords with feel tags, What next? from 29 named moves, 15 looping progressions, bass frequencies). Feel words as data in `content/feel.ts`, logic in `src/tools/`. The circle of fifths in Explore. The blues spelling rule |
| 4 | The question types (SPEC §8): spell, change, fix, echo, identify, hearQuality and fact, made from a spec and a seed, checked by pitch class, with help that fades and teaching feedback (Yours / Correct / A-B); grading for review; the keyboard's toggle mode; the question screen; Drill (SPEC §11) from Home. Dial In's seeded RNG (`game/rng.ts`, plus `shuffle`) |
| after 4 | From phone testing: hints, tips and feedback appear below the keyboard so it never moves during a question; full help starts with the root chosen, and a hint or no help lights nothing ("nothing is ever lit without being chosen"); echo's given note starts chosen and echo never asks for an octave; wrong black keys are spelled the way the key leans |

Where the code is: `src/theory/` (music theory), `src/audio/` (voice, sounds, playback, loops), `src/tools/` (Scale Finder and Guide logic), `src/exercises/` (question types), `src/content/feel.ts` (feel words), `src/game/` (settings, RNG, drill), `src/storage/`, and `src/ui/` (screens, components, the shared `instrument.ts` for voices and computer keys, and pure helpers like `explore.ts` and `question.ts` with their tests). SPEC §4 has the full map.

## Decisions made this session

All in SPEC §19, settled with you as multiple-choice questions or from your phone feedback:

- Keyed In as a sibling app to Dial In, for absolute beginners first, with Foundations reordered so chords come at level 3, and a placement check and Test out for people who know some basics.
- Two tools added to the plan: Scale Finder and Scale Guide, built before the question types.
- Numerals counted against the major scale (♭III, ♭VI, ♭VII in minor); chord symbols spelled out (Cdim, Cm7♭5); middle C is C4.
- Synth sounds only for now (a sampled piano is in the backlog); the four sounds were approved by ear.
- Blues blue note: ♭5, or ♯4 where ♭5 would need a double flat (E♭ blues has A).
- Answers checked by pitch class; Drill open to everything until Learn exists; game modes open from Home, so the tabs stay for the tools.
- From phone testing: the keyboard never moves during a question, and nothing is lit without being chosen.

## How we've been working

- Each milestone starts by settling its open questions as short multiple-choice questions, recommendation first. Then: build, tests, `npm run build`, a check in the browser pane at 320, 375 and 414 px and on desktop, SPEC and this file updated, and a local commit.
- Then you ask for a push. Before pushing, build locally with `KEYED_IN_BASE=/keyed-in/` to learn the bundle name to expect; after pushing, poll the live `index.html` until it shows that name (a background loop, about 40–50 seconds), then check the new feature on the live site. A tab with the old version cached is a good check of the "new version is ready" prompt.
- You then try it on your Android phone and report what feels wrong. Expect UX feedback of that kind; it's been the most useful testing so far.

## Not checked yet

- **The Drill fixes on your phone**: they're live and were checked on the live site in the browser pane (the keyboard stayed put through a tip, a hint and the feedback), but you haven't tried them by hand yet.
- **Ear questions' difficulty**: whether Hear it and Play it back are too hard or too easy as a beginner's start, and whether the feedback text reads well.
- **The feel words** in `content/feel.ts` are a first draft, hedged as "often heard as". The songs named are well-known uses of each progression ("Let It Be", "With or Without You", "Zombie", "Stand By Me", "Sweet Child O' Mine", "Oye Como Va"). They deserve a musician's read.
- **iPhone**: never tried.
- **Both apps installed side by side**, each working offline: a Milestone 9 check.

Checked by hand on an Android phone: the four sounds, multi-touch chords, readable key labels (after Milestone 2); the Finder, Guide loops, What next? pairs and the circle of fifths (after Milestone 3); Drill, which led to the two fixes (after Milestone 4).

## Still to do from setup

- **Link back from Dial In** (setup step 7): add a Keyed In link to Dial In's Home. It's a change in the Dial In repo, so it belongs in a Dial In session.

## Next: Milestone 5, packs and Learn

SPEC §17 and §9: the pack schema and its validation (every level's question specs checked against `exercises/catalogue.ts`), Foundations levels 1–10 with their intros (§9.2), progress saved under `keyedin.progress`, stars (70 / 85 / 95%) and unlocks, the first-launch choice (New to music / I know some basics), the placement check and Test out (§9.4), Home's Continue card, and Drill narrowing to what's been learned (§19). Rounds are 10 questions, about 70% on the level's new items.

Questions to settle first, as multiple choice:
- **What an intro is**: a few guided steps (hear it, see it lit, play it yourself) before the round, or a short page of text and examples. The intros are the biggest design job in this milestone (§9.1).
- **How Learn shows the packs and levels** on a phone: one list of levels, or chapters.
- **What the placement check asks** and how many misses end it (§9.4 suggests about two questions per level for levels 1–9, stopping after a couple of misses).
- **Whether a level's round can be left halfway** and picked up later, as in Dial In.

Pieces already in place for it: question specs (`exercises/types.ts` `QuestionSpec`), the question screen (`ui/components/QuestionView.tsx`), grading (`exercises/grading.ts` `rate`), item ids for review, `game/rng.ts`, and `storage/` with `storageKey()`.

## How to work on it

```bash
npm install
npm run dev        # http://localhost:5174
npm test
npm run build
npm run preview    # http://localhost:4174, with the service worker
```

- **Pushing to `main` deploys the live site**, so it's done only when asked.
- **Checking a deploy**: watch the bundle name in the live `index.html` change. Don't poll the GitHub API, which limits unauthenticated calls to about 60 an hour.

## Lessons learned

**Windows and the tools**
- There's no Python. Scripted multi-line edits go through Node from a script file, or the Edit tool: `\n` inside a Bash heredoc can become a real newline (it broke a scripted edit in Milestone 0, failing before it wrote anything).
- Windows PowerShell 5.1 mangles double quotes inside arguments to programs like git: write commit messages to a file in the scratchpad and use `git commit -F <file>`.
- Files restored by git have Windows line endings in the working copy, so exact-text replacements written with `\n` may not match. The Edit tool handles them.
- Git Bash turns `/keyed-in/` into a Windows path, so sub-path builds need `MSYS_NO_PATHCONV=1`. In PowerShell, set `$env:KEYED_IN_BASE` and remove it afterwards.
- `package-lock.json` was copied from Dial In before the first install, so shared packages are on exactly Dial In's versions.

**The dev server and the browser pane**
- After adding exports to `constants.ts` (or any big change), the dev server can serve a stale module and the page goes blank, though `tsc` and the build pass. Restart the dev server (stop it, then `preview_start` `dev`) and reload the page.
- Dev and preview use ports 5174 and 4174, one above Dial In's. Service workers belong to an origin, so on a shared port one app's worker could serve the other's pages. After testing the service worker, unregister it from a page on the same port: it keeps serving its cached page even after the server stops, which is also how to reach it.
- When the pane is hidden or a phone-sized viewport is set, screenshots come back magnified or stale and coordinate clicks land in the wrong place (a click meant for a button played a key). Measure layout with JavaScript instead (`scrollWidth` against `innerWidth`; an element's `getBoundingClientRect`), and drive the page with JavaScript: `element.click()`, setting a select's value and firing `change`, and computer-key `KeyboardEvent`s (`code: 'KeyA'` and so on) for the keyboard.
- Fake pointer events don't work on the keyboard: `setPointerCapture` rejects a pointer id the browser doesn't know. The keyboard now ignores that failure, but computer keys are the reliable way to play it from a script.
- Clicking two things in one script runs both before React re-renders, so the second can act on stale state; wait between clicks.
- Tap to start needs a real click (audio only starts from a genuine gesture): use `find` for the button's ref, then `computer` `left_click` with the ref, at the pane's own size. If the pane hasn't drawn yet, the click fails; just try again.
- Sounds can be checked without ears: in the dev server, `await import('/src/audio/voice.ts')` in the page, render into an `OfflineAudioContext` through `createOutputBus`, and measure peak and RMS. That's how the organ was found about 4.5 dB too loud.

**Tonal as the answer key**
- Tonal writes intervals number first ("3m", "9M"); `oracle.test.ts` converts.
- `Progression.fromRomanNumerals` ignores case ("ii" in C gives D major), so only numeral roots are compared with it; chord qualities come from its key tables.
- `Chord.detect` ranks rare types first and writes the minor-major 7th as "Cm/ma7", so the check compares sets of names and only treats a trailing "/note" as a bass.
- Tonal spells triply augmented intervals; this engine stops at doubly and returns null past that. Tonal keeps the blues scale's double flats; the check expects our respelling.
- To try Tonal without a test, a Node script in the scratchpad can load it with `createRequire('<project>/package.json')`.

**Code**
- A handler passed to `useComputerKeys` must keep the same identity between renders, or the hook re-subscribes and its clean-up cuts held notes off. Wrap a changing handler in a ref (the Scale Finder and QuestionView do).
- Content tests catch real mistakes: one found the flamenco progression listed under harmonic minor, which has no ♭VII. `guide.test.ts` checks each progression's chords are in every scale it's listed under.
- The 300-questions-per-type sweep in `questions.test.ts` is the guard for new question types and sets: every question must accept its own right answer, must not start out already right, and keyboard questions must light nothing they haven't chosen. It caught that echo with an octave would start out solved once its root was pre-chosen.
- UX rules that came from phone testing, now in SPEC §8: the keyboard never moves while a question is being answered (anything that comes and goes goes below it), and a key is never coloured without being chosen.
