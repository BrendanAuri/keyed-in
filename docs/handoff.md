# Handoff: where Keyed In stands

Last updated 2026-10-24. Milestone 4 is committed locally and not pushed; the live site is Milestone 3 (bundle `index-CmDf2COL.js`). Pushing would put Drill and the question types live.

- **Live site**: https://brendanauri.github.io/keyed-in/ (GitHub Pages, deployed by GitHub Actions on every push to `main`; the first deploy took about 50 seconds)
- **Repo**: https://github.com/BrendanAuri/keyed-in (public)
- **Design**: [SPEC.md](../SPEC.md) is the source of truth. §17 lists the milestones, §19 the settled and open decisions, §20 the idea backlog. [plan.md](plan.md) is the original plan, kept for the app survey, research and sources.
- **Health**: 225 tests pass (including the Tonal checks in `src/theory/oracle.test.ts` and a 300-questions-per-type sweep in `src/exercises/questions.test.ts`); `npm run build` is clean.

## What's built

| Milestone | What |
| --- | --- |
| 0 | Scaffold with Dial In's stack and versions; SPEC, CLAUDE.md, README and this handoff; a Home screen listing the four modes and three tools as "Coming soon" with a link to Dial In; PWA shell (manifest, service worker, update prompt, icons drawn by `scripts/make-icons.mjs`); the GitHub Pages workflow; `storageKey()` with the `keyedin.` prefix |
| 1 | The theory engine in `src/theory/` (SPEC §5): spelled notes and pitches, intervals, 22 chord types, 13 scales and modes, keys and the circle of fifths, Roman numerals, chord naming, frequencies and harmonics, and scale matching for the Scale Finder. Tonal added as a dev dependency and used as the answer key. Three style decisions settled (SPEC §19): numerals against the major scale (♭VI, ♭VII), chord symbols spelled out (Cdim, Cm7♭5), middle C = C4 |
| 2 | Sound and keyboard (SPEC §6, §7, §13): a trimmed copy of Dial In's voice with four fixed sounds (Electric piano, Organ, Pluck, Pad), each with a level so they match in loudness; playback helpers for chords (together, strum, one at a time), scales, cadences and progressions, voiced like a pianist with the root in the bass; the Start screen, tabs and hash routes; the multi-touch keyboard; saved settings (note names, sound); and Explore, which names whatever you play and lights up and plays any chord or scale. Sound settled as synth only for now (SPEC §19) |
| 3 | The tools (SPEC §14): the Scale Finder (tap, type names or type frequencies; grouped results, one-note-off matches, harmonics flagged, a saved A4 tuning with a suggestion when a song looks detuned, and a frequency table) and the Scale Guide (feel and colour notes, chords as triads or sevenths with feel tags, What next? from 29 named moves, 15 progressions that loop at a set tempo, bass frequencies). Feel words as data in `content/feel.ts`; logic in `src/tools/`. The circle of fifths in Explore. The blues spelling rule (E♭ blues has A, as a ♯4). Explore, Finder and Guide share `ui/instrument.ts` and `KeyboardBar` |
| 4 | The question types (SPEC §8): spell, change, fix, echo, identify, hearQuality and fact, made from specs and a seed, checked by pitch class, with help that fades (full, hint, none), teaching feedback and Yours / Correct / A-B; grading for review; the keyboard's toggle mode; the question screen; and Drill (SPEC §11), opened from Home. Dial In's seeded RNG came over (`game/rng.ts`, plus `shuffle`) |

## Still to do from setup ([setup.md](setup.md))

Steps 1–6 are done: GitHub Pages is on (Source: GitHub Actions), `origin` points at the GitHub repo, and `main` is pushed.

- **Link back from Dial In** (step 7): add a Keyed In link to Dial In's Home, in a Dial In session.

## Not checked yet

- Installing it on an Android phone alongside Dial In (both apps installed and working offline is a Milestone 9 check). The live site itself was checked in the browser pane: the bundle matches a local `/keyed-in/` build, the manifest and service worker are scoped to `/keyed-in/`, all five icons load, "Keyed In now works offline" shows on a first visit, and the console is clean.
- iPhone: nothing has been tried on one yet.
- **Drill by hand**: every type was driven in the browser pane (by computer keys and button clicks) and measured at 320, 375 and 414 px, but not tapped through on a phone. Worth checking: building chords with real taps in toggle mode, whether the ear questions are too hard or too easy at first, and whether the feedback reads well.
- **The feel words** in `content/feel.ts` are a first draft. They're hedged as "often heard as", and the songs named are well-known uses of each progression, but they deserve a musician's read.

Checked by hand on an Android phone after the Milestone 2 deploy: all four sounds are good, multi-touch chords work on the on-screen keyboard, and the keys' labels are readable. After the Milestone 3 deploy: the Finder, Guide (loops and What next? pairs) and circle of fifths all play well.

Checked on the live site after the Milestone 2 push: a browser that had Milestone 0 cached showed "A new version of Keyed In is ready" with Reload and Later, and Reload switched it to the new bundle. Then Start, the Explore tab, chord naming and Strum all worked, with a clean console.

## Decisions waiting (SPEC §19)

Each at the milestone that needs it: FSRS or rolling accuracy for ear items (Milestone 6); what counts towards the streak (Milestone 8); notation and a second instrument view (later).

## Next

**Milestone 5: packs and Learn.** The pack schema and its validation (every level's question specs checked against `exercises/catalogue.ts`), Foundations levels 1–10 with their intros (SPEC §9.2), progress (`keyedin.progress`), stars and unlocks, the first-launch choice (New to music / I know some basics), the placement check and Test out (SPEC §9.4), and Home's Continue card. Rounds are 10 questions, about 70% on the level's new items. Settle any open questions first; the intros (SPEC §9.1) are the biggest design job.

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

From Milestone 1, on using Tonal as the answer key:
- Tonal writes intervals number first ("3m", "9M"); `oracle.test.ts` converts.
- `Progression.fromRomanNumerals` ignores upper and lower case ("ii" in C gives D major), so only numeral *roots* are compared with it; chord qualities are compared through its key tables.
- `Chord.detect` ranks rare types first (E G C comes back as "Em#5" before "CM/E"), so the oracle compares the set of names, not their order. Its minor-major 7th is written "Cm/ma7", with a slash of its own, so only a trailing "/note" counts as a bass.
- Tonal spells triply augmented and diminished intervals (F♭ up to B♯ is "AAA4"); this engine stops at doubly, and returns null past that.
- To try Tonal out without a test, a Node script in the scratchpad can load it from the project with `createRequire('<project>/package.json')`.

From Milestone 2:
- After adding exports to `constants.ts`, the dev server served a stale copy ("does not provide an export named LIMITER_ATTACK") and the page went blank, though `tsc` and the build passed. Restarting the dev server fixed it.
- With a phone-sized viewport set, the browser pane scales the page to fit, and coordinate clicks (even by element ref) land in the wrong place: a click meant for the root picker played a key instead. Driving the page with JavaScript (`element.click()`, setting a select's value and firing `change`) worked, as in Dial In. Clicking two things in one script runs both before React re-renders, so the second can act on stale state.
- Fake pointer events (`new PointerEvent('pointerdown', { pointerId: 99 })`) don't work on the keyboard for testing: `setPointerCapture` rejects an id the browser doesn't know. The keyboard now ignores that failure, but computer keys (`KeyboardEvent` with `code: 'KeyA'` and so on) are the reliable way to drive it from a script.
- A question test that makes hundreds of questions of every type from the catalogue (`questions.test.ts`) is the cheap way to find a type that can produce an unanswerable question. It passed first time here, but it's the guard for new types and sets.
- A handler passed to `useComputerKeys` must keep the same identity between renders: the hook re-subscribes when it changes, and its clean-up releases held keys, which would cut notes off. The Scale Finder wraps its changing tap handler in a ref for this.
- Writing content tests caught a real mistake: the flamenco progression was listed under harmonic minor, which has no ♭VII. `guide.test.ts` now checks that every progression's chords are in each scale it's listed under (one borrowed exception allowed).
- Sounds can be checked without ears: in the dev server, `await import('/src/audio/voice.ts')` in the page, render into an `OfflineAudioContext` through `createOutputBus`, and measure peak and RMS. That's how the organ was found about 4.5 dB hotter than the rest and given a lower level.
