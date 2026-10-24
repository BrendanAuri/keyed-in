# Keyed In: chords, scales and theory by eye, hand and ear

## 1. Concept

A game for learning chords, scales and the theory around them, made for absolute beginners. Every question shows one of three things, a **name**, **keys** on a keyboard or a **sound**, and asks for another: "tap the notes of C major", "which chord is lit up?", "was that major or minor?", "play back what you heard". Feedback teaches, as in Dial In: it says what you did, what was asked and what the difference is, and lets you hear both.

A sibling app to [Dial In](https://brendanauri.github.io/dial-in/) (hear a sound, recreate it on a synth), with the same stack, look and deploy, and links between the two Home screens. Alongside the game, **tools** make it useful when you're writing or picking apart music: find the scales a set of notes belongs to, and look up the chords of a scale and how they feel. It runs in a browser on desktop and phones, and installs as an offline-capable app (PWA).

### Modes

| Mode | What it is |
| --- | --- |
| **Learn** | Packs of levels. Each level opens with a short interactive intro of its new items, then rounds of 10 questions. Stars and unlocks, as in Dial In (§9) |
| **Review** | The flash-card queue: everything due today, mixed across packs and question types. A few minutes a day (§10) |
| **Drill** | Endless questions from items you've learned, narrowed however you like ("just minor vs diminished") (§11) |
| **Daily** | The same 10 questions for everyone each day, with a score, a streak and spoiler-free share text. No backend (§12) |

Later: **Challenges** (send a friend a drill as a link, as Dial In does with sounds).

### Tools

| Tool | What it is |
| --- | --- |
| **Explore** | The playground: a keyboard that shows and plays any chord or scale and names whatever you play, and a circle of fifths you can tap. No scores. Dial In's Free Play, for theory (§13) |
| **Scale Finder** | Enter notes (tap them, type names, or type frequencies read off a spectrum analyser) and see the scales they fit, plus each note's frequency in every octave (§14.1) |
| **Scale Guide** | Pick a scale and see its chords with their names and Roman numerals, how each tends to feel, where each likes to go next, and common progressions to loop (§14.2) |

## 2. Goals and non-goals

**Audience**: absolute beginners first. Nothing assumes you can read music, name a note or know what a chord is. People with some experience can skip ahead (§9.4). Later packs (Electronic and Bass Music) and the tools also serve self-taught producers, Dial In's audience.

**Goals (v1)**
- Runs in modern desktop and mobile browsers; installs as a PWA and works offline after the first visit
- Phone-first: an on-screen keyboard you can play chords on with one hand
- Teaching built on what the evidence supports (§21): being asked rather than shown, spaced reviews, mixed practice, ear questions in a key, building answers rather than picking them, contrast, and several views of the same thing at once
- Plain words first: no term ("triad", "interval", "W W H") appears until an intro has shown what it means
- Content is data: levels live in packs, so a new pack needs no code changes
- Feedback that teaches, and lets you hear the difference

**v1 content**: the Foundations pack (§9.2).

**Non-goals (v1)**: accounts, backend, multiplayer, app-store builds, notation, fretboard, microphone input and Web MIDI. These come later (§17, §20).

## 3. Tech stack

The same as Dial In:

- **TypeScript** (strict) + **Vite** + **React**
- **Web Audio API** directly (no Tone.js). The voice engine is copied from Dial In in Milestone 2
- **vite-plugin-pwa** (with its `workbox-window` peer) for the manifest, service worker and offline cache. App icons are drawn by `scripts/make-icons.mjs` (`npm run icons`), with no image dependency
- **Vitest** for unit tests
- **localStorage** behind a small storage interface, with this app's own key prefix (§16)
- **GitHub Pages** through GitHub Actions

Two new dependencies were agreed in the plan: **ts-fsrs** (runtime, Milestone 6, review scheduling) and **tonal** (dev only, Milestone 1, a test oracle for the theory engine, the way Dial In uses Meyda). Ask before adding anything else.

## 4. Architecture

```
src/
  constants.ts   # every tunable number lives here
  theory/        # pure TS: notes, intervals, chords, scales, keys, numerals, chord naming, frequencies, scale matching
  tools/         # pure TS: the Scale Finder's input and tables, the Scale Guide's chords, moves and progressions
  audio/         # Web Audio: voice (from Dial In), patches, play note / chord / cadence / progression, loops
  exercises/     # pure TS: one module per question type: generate, check, feedback
  srs/           # pure TS: items, FSRS wrapper, session builder, confusions
  content/       # plain data: schema.ts, packs/, feel.ts (how chords and moves tend to feel)
  game/          # rng, pack registry and unlocks, progress, placement, daily, share codes
  storage/       # key-value interface over localStorage, keyedin. prefix
  ui/
    components/  # Keyboard, AnswerGrid, NotePicker, CircleOfFifths, ResultCard, PlayButtons, UpdatePrompt
    screens/     # Start, Home, LevelSelect, Round, Result, Review, Drill, Daily, Explore, ScaleFinder, ScaleGuide, Stats
```

Built so far: `constants.ts`, `storage/`, `ui/components/UpdatePrompt.tsx` and `ui/screens/Home.tsx` (Milestone 0); `theory/` (Milestone 1, §5); `audio/`, `game/settings.ts`, the router, the Keyboard, Segmented and NotePicker components, and the Start and Explore screens (Milestone 2, §6, §7, §13); `content/feel.ts`, `tools/` (pure TypeScript for the two tools, like `theory/`), `ui/instrument.ts`, the CircleOfFifths and KeyboardBar components, and the ScaleFinder and ScaleGuide screens (Milestone 3, §14); `exercises/`, `game/rng.ts` (from Dial In) and `game/drill.ts`, `ui/question.ts`, the QuestionView component and the Drill screen (Milestone 4, §8, §11).

Rules, in the same spirit as Dial In:
- `theory/`, `tools/`, `exercises/` and `srs/` never import React or touch the DOM.
- Every question comes from a seed, so any round can be replayed.
- `content/` is plain, JSON-serialisable data: no functions, no imports beyond types. Nothing outside it names a specific pack or level.
- No magic numbers outside `constants.ts` (small named constants at the top of a module are fine).
- Saved data is versioned, with a migration stub.

## 5. Theory engine (`src/theory/`)

Written in-house (Milestone 1): it's the heart of the app and not big. **Tonal** is a dev dependency, used only as an answer key in `oracle.test.ts`. That file checks, on all 21 natural, sharp and flat roots: every note's MIDI number and frequency, the interval between every pair of notes, every transposition, every chord type and scale, key signatures, the chords of major and minor keys (triads and sevenths, natural and harmonic minor), numeral roots, and the chord names for every inversion of every chord type.

| Module | What |
| --- | --- |
| `notes.ts` | Spelled notes (`Note`: a letter and an accidental) and pitches (`Pitch`: plus an octave; C4 is middle C, MIDI 60), because spelling matters (E♭ and D♯ are the same key but different notes). Reading ("Eb", "E♭", "F#4"), Unicode text for the screen and ASCII for ids, spoken names ("E flat"), pitch classes, and 12-bit sets of pitch classes |
| `intervals.ts` | Intervals as number and quality (m3, P5, A4, d5, up to doubly augmented or diminished), their size in semitones, names in words ("minor 3rd"), scale-degree labels (♭3, ♯4), the interval between two spelled notes, and transposing |
| `chords.ts` | 22 chord types as interval recipes from the root, each with a name in words, a symbol and a Roman-numeral ending: major, minor, 7, m7, maj7, 5, sus4, sus2, dim, aug, 6, m6, add9, madd9, m7♭5, dim7, 7sus4, 9, maj9, m9, m(maj7) and maj7♯5. Building, symbols, names, voicings and inversions |
| `scales.ts` | 13 scales and modes (major, the three minors, the other five modes, both pentatonics, blues and major blues), each with how common it is; building, names and degree labels |
| `keys.ts` | Key signatures, the line and circle of fifths, relative and parallel keys, and the chords of any seven-note scale with their numerals |
| `numerals.ts` | Roman numerals with quality (ii, V7, vii°, ♭VII): reading and writing them, the chord a numeral stands for in a key and back, and progressions ("I–V–vi–IV") |
| `naming.ts` | Keys in, every reasonable chord name out, best first (C, E, G, A is C6, then Am7/C); and whether what's played is one note, an interval or a chord, for Explore |
| `frequency.ts` | Note to frequency and back for any A4 reference (440 Hz by default), the nearest note and how many cents off, harmonics of a lower frequency, and a suggested A4 when every frequency is off by the same amount (§14.1) |
| `scaleMatch.ts` | The Scale Finder's matching: groups of scales that contain every note entered, and common scales that miss one (§14.1) |

How it spells and ranks things:
- **Spelling comes from intervals**, so every note is spelled for its job in the chord or scale: C augmented is C E G♯, and F major has B♭.
- **When nothing gives a spelling** (keys tapped on the keyboard), a root gets whichever of its sharp or flat names gives the chord or scale fewer accidentals: D♭ major, C♯ minor. Ties go to flats: G♭ major, E♭ minor. A slash chord's bass is spelled as the chord spells it, unless a plainer spelling exists (Eaug/C, not Eaug/B♯).
- **Double sharps and flats** show as ♯♯ and ♭♭, because many phone fonts can't show 𝄪 and 𝄫.
- **Chord names** that have the bass as the root come first, then the more common chord types, in the order of `CHORD_TYPES`.
- **Between two notes**, an interval goes up to the next note of that name: E to C is a minor 6th, and C to C♭ is a diminished octave.
- **Numerals** count against the major scale in every key and mode (§19).

## 6. Sound (`src/audio/`)

- **The voice** (`voice.ts`, `modulation.ts`, `output.ts`) is a trimmed copy of Dial In's: two detunable oscillators, a resonant lowpass with its own envelope, an amp envelope, an LFO on cutoff, pitch or level, and a master bus with a safety limiter. Dial In's noise, sub, drive, tempo-synced LFO and live knob changes were left out, because the fixed sounds don't use them; bring them over if Dial In sounds ever play here. Each voice is quieter than Dial In's (`VOICE_GAIN` 0.22 against 0.5), since chords stack five or six of them.
- **Four fixed sounds** (`patches.ts`), with no knobs: Electric piano (the default), Organ, Pluck and Pad. Each has a level (`amp.level`, which Dial In doesn't have) so they play at about the same loudness: measured offline, their peaks on a C major chord with bass are within 1.5 dB of each other, and nothing clips.
- **Playing** (`schedule.ts`, pure and tested; `player.ts` turns its events into voices): a chord together, strummed or one note at a time; a scale up, or up and back down; a cadence that sets a key (I–IV–V–I, or i–iv–V–i in minor with harmonic minor's major V); and a progression at a tempo. Cadences and progressions are voiced the way a pianist would play them, each chord as close to the one before as it can be (C, F and G come out as C E G, C F A, B D G), with the root in the bass between E2 and D♯3.
- **The keyboard** plays through a voice manager from Dial In (polyphony up to 12 voices, with voice stealing).
- Still to come: register and voicing randomised within a level's limits (Milestone 4), so players learn the sound of "minor", not of one particular minor chord.
- A Start screen with **Tap to start**, since mobile browsers need a tap before they play audio (as in Dial In).
- Maybe later (§20): a sampled piano, and Dial In sounds from a pasted share code.
- Real songs appear by title and chord progression only, played on our own synth. No recordings.

## 7. Input

- **The on-screen keyboard is the main control.** Phone-first, and built in Milestone 2:
  - One octave plus the C on top on phones, two octaves from 640 px wide. It stretches to up to three octaves when a chord or scale needs the room.
  - Octave − and + buttons (and Z and X on a computer), C1 to C6.
  - Multi-touch, so you can play chords: each finger plays its own key.
  - Note names on the white keys, with the octave on each C, on by default and saved. Keys lit up for a chord or scale show their spelled names (E♭, not D♯). Black-key names hide when the keys get too narrow (two or more octaves on a phone), since the picker lists the spelled notes anyway.
  - Colours: lit keys pale amber, the root full amber, keys being pressed blue.
  - The computer letter on each key, on devices with a mouse.
  - A toggle mode for building answers (Milestone 4): tap a key to choose it (it plays, and turns blue with a ring), tap again to clear it, then Check. After checking, the right answer lights up in amber next to yours.
  - Still to come: a landscape layout.
  - Check at 320, 375 and 414 px.
- **Answer buttons** in a large grid, and a **note picker** (letter plus accidental) for spelling.
- **Computer keys**: a piano row on the letter keys, number keys for answers.
- Later: **Web MIDI** for a real keyboard (Chrome, Edge and Android Chrome; not iPhone), a fretboard view, staff notation and the microphone.

## 8. Question types (`src/exercises/`)

Each type is a pure module with `generate(params, rng)`, `check(question, answer)` and `feedback(result)`.

| Type | Shown → asked | Example | Answer with |
| --- | --- | --- | --- |
| `spell` | Name → keys | Tap the notes of D minor | Keyboard. Later levels also check spelling (E♭, not D♯) with a note picker |
| `change` | Keys and a new name → keys | Here's C major: make it C minor by moving one note | Keyboard |
| `fix` | Keys → keys | This should be A major, but one note is wrong: fix it | Keyboard |
| `identify` | Keys → name | Lit keys → "G major, first inversion" | Answer buttons |
| `hearQuality` | Sound → name | Interval, chord or scale quality, random root and register | Answer buttons |
| `echo` | Sound → keys | Hear a note, interval or chord (root given), play it back | Keyboard |
| `hearDegree` | Cadence and a note → degree | "That was the 3rd", then the note resolves home | Degree buttons 1–7 |
| `hearFunction` | Cadence and chord(s) → numerals | "I–V–vi–IV" | Numeral buttons |
| `progression` | Numerals in a key → keys, chord by chord | Build I–V–vi–IV in G, then hear it loop | Keyboard |
| `fact` | Name → name | Key signatures, relative minors, "the 5th of B♭" | Buttons or note picker |
| `sing` | Name → voice | "Sing the 3rd", then hear it | Self-graded at first; microphone later |

**Help that fades.** Keyboard questions take a `guide` parameter, so a level can start with plenty of help and take it away:
- `full`: the root starts already chosen and the recipe is shown in plain words ("count 4 keys up, then 3 more"). A wrong key says why.
- `hint`: nothing is chosen or lit, so finding the root is part of the question; a Show a hint button shows the recipe, which names the root ("Start on D"). Using it rates the answer Hard for review.
- `none`: just the name.

Nothing is ever lit without being chosen: a key that's coloured but not part of the answer you're building was confusing (found on a phone after Milestone 4). What a question gives you (full help's root, echo's starting note, the chord to edit in change and fix) starts chosen, and can be cleared like any other key.

**Feedback teaches**, like Dial In's tips. For example: "You played C, E, G: that's C major. C minor has E♭. The middle note is one key lower, and that's what makes it sound darker." Every miss offers **Yours / Correct / A-B**, so you hear the difference, not just read it.

**Grading.** Right or wrong, plus how long you took, sets the review rating automatically: wrong is Again, right but slow (or with a hint) is Hard, right is Good, right and fast is Easy. Time limits are per type, in `constants.ts`. The clock is never shown in Learn, so beginners aren't rushed; speed only feeds the review schedule. A `spell` answer with two of three notes right shows as partly right, but counts as wrong for scheduling.

**As built (Milestone 4).** `spell`, `change`, `fix`, `echo`, `identify`, `hearQuality` and `fact` are in `src/exercises/`: `keys.ts` for the keyboard answers, `choices.ts` for the buttons, shared shapes in `types.ts`, and one way in through `questions.ts` (`generateQuestion`, `checkAnswer`, `feedbackFor`). `hearDegree`, `hearFunction` and `progression` come in Milestone 7, and `sing` later.
- **A question comes from a spec**: its type, what it's about (notes, chords, intervals, scales or facts), a set (which chord types, intervals, scales or facts), optional roots, and the help level. Pack levels (Milestone 5) and the Drill picker both write specs. `catalogue.ts` says which subjects each type takes and what can go in a set.
- **Keyboard answers are checked by pitch class**: any octave, any order, doubled notes allowed. Some right notes and no wrong ones is partly right ("Nearly."). Change and fix questions start from a chord to edit; Start again puts it back.
- **Roots** are the twelve usual spellings (C, D♭, D, E♭, E, F, F♯, G, A♭, A, B♭, B) unless a spec gives others. Ear questions put their root anywhere from F3 to F4, so the sound of "minor" is learned rather than one minor chord. Choices are up to four, shuffled; a set with only one chord type gets a contrasting one added (minor for major, and so on).
- **Help**: `full` starts with the root chosen, shows the recipe, and says why a wrong key is wrong ("G♭ isn't in E♭ major", then the recipe; a wrong black key is spelled with sharps in a sharp key and flats otherwise). `hint` puts the recipe behind Show a hint and lights nothing. Recipes count keys ("Start on D. Count up 3 keys to the next note, then 4 more"); change questions say which note moves ("Move G♯ down 1 key, to G"); single notes say where the key is ("D♭ is the black key just left of D").
- **Names on the keys** are hidden when they'd give the answer away: finding a single note with no help, and naming a lit note. Otherwise lit keys show their spelled names.
- **Feedback** names what you played and what was asked, lists what's missing and what's extra, and for a chord mistaken for another on the same root, says which note differs and what that does: "E♭ major's 3rd is G, 1 key higher than E♭ minor's G♭. A higher 3rd makes a chord major and brighter." Facts explain themselves ("E♭ major has 3 flats: B♭, E♭ and A♭"). After a miss: Yours, Correct and A-B (yours, then the right one); after a right answer, Hear it.
- **On a computer**: A to K play the keyboard (toggling notes in a keyboard question), 1 to 4 pick an answer, and Enter checks or moves on.
- **The keyboard never moves during a question.** Above it is only what stays put (the prompt, and Play again for ear questions); the Check, Clear and Show a hint buttons, the hint or recipe, wrong-key tips and the feedback all appear below it.
- **Echo** gives its starting note already chosen ("Here's C, already chosen. Listen, then add the other note you hear.") and never asks for an octave, which the chosen note alone would answer.
- **Grading** is `grading.ts`'s `rate`; full help counts as a hint, so a right answer with it is Hard. Nothing stores the rating yet; Review (Milestone 6) will.
- **Items** for review are named like `spell:minor@F#`, `change:major>minor@C`, `echo:minor` and `hearQuality:minor` (ear items per concept, the root random each time).
- A test makes 300 questions of every type and subject with every item in its set, and checks each one accepts its own right answer, and that change and fix questions don't start out already right.

## 9. Content: packs as data (`src/content/`)

### 9.1 Levels and items

Packs are plain, JSON-serialisable data, and nothing outside `content/` names a pack or level. A level lists: an intro (steps to hear, see and play the new items), the question types it uses with their parameters (including `guide`) and weights, its new items, and a pass rule. Rounds are 10 questions, about 70% on the level's new items and 30% on earlier ones (this settles Dial In's open "level focus" question from the start). Stars come from accuracy: 70% to pass, 85% for two stars and 95% for three, kept in `constants.ts`.

**Items** are what the review queue schedules:
- *Facts and spelling* are tracked per concept and root, such as `spell:minorTriad@F#` or `fact:keySignature@Ab`.
- *Ear skills* are tracked per concept, with the root random each time, such as `hearQuality:minor` within the level's set of choices. What you're learning is the sound, not one pitch.

**Ear questions start easy**: two choices that sound very different, with more added as you improve. When you mix two things up, they're played back to back.

### 9.2 Foundations (v1, 14 levels)

Chords come early, at level 3, because building them is the fun part. Key signatures wait until level 10, just before they're needed for the chords of a key.

| # | Level | New | Mostly |
| --- | --- | --- | --- |
| 1 | The keyboard | Note names, white and black keys, finding C | `spell` (single notes), `identify` |
| 2 | Half steps and whole steps | Half and whole steps, sharps and flats | `spell`, `identify` |
| 3 | Your first chord: major | A major chord as "a note, count 4 keys up, then 3 more" | `spell` (guide full, then hint), `identify` |
| 4 | Minor chords | Minor is major with the middle note one key lower | `change`, `spell`, `identify` |
| 5 | Major or minor? | Hearing major against minor | `hearQuality` (two choices), `echo` |
| 6 | The major scale | Whole, whole, half, whole, whole, whole, half | `spell`, `fix` |
| 7 | How far apart: intervals | Counting the distance; hearing the octave, fifth and third | `identify`, `hearQuality` |
| 8 | Interval quality | Major, minor and perfect; a minor 3rd against a major 3rd by ear | `identify`, `hearQuality` |
| 9 | Diminished and augmented | The other two three-note chords | `spell`, `change`, `hearQuality` |
| 10 | Key signatures and the circle of fifths | The sharps or flats in each key, neighbouring keys | `fact`, `spell` |
| 11 | Scale degrees by ear, part 1 | 1, 3 and 5 in a major key | `hearDegree` |
| 12 | Scale degrees by ear, part 2 | All seven | `hearDegree` |
| 13 | The chords of a key | The seven chords of a major key, Roman numerals | `spell`, `identify`, `fact` |
| 14 | First progressions | Hearing I, IV, V and vi; I–IV–V–I, I–V–vi–IV, ii–V–I | `hearFunction`, `progression` |

**Spelling**: enharmonics are accepted (D♯ for E♭) up to level 9. From key signatures on, answers must be spelt for the key.

### 9.3 More packs

1. **Chords and Colour**: inversions, sus2 and sus4, seventh chords, add9, hearing each, simple voice leading
2. **Minor Keys and Modes**: the three minors, relative and parallel keys, each mode by its colour note (Dorian's ♮6, Phrygian's ♭2, Lydian's ♯4, Mixolydian's ♭7), hearing modes over a drone
3. **Electronic and Bass Music**: minor-key loops (i–♭VI–♭III–♭VII and friends), Phrygian and harmonic-minor colour, fifths and power chords, following the root with a bassline, chord stabs, "build a four-chord loop in this key"
4. Later: jazz harmony, pentatonics and blues, reading notation, rhythm

### 9.4 Where you start: beginners and skipping ahead

- First launch asks: **New to music** (start at level 1) or **I know some basics**.
- **I know some basics** runs a short **placement check**: about two questions from each of levels 1–9 in order, stopping after a couple of misses. Every level it passes is unlocked and marked passed (with no stars), and its items go into Review so they come back soon.
- Every locked level has **Test out**: one round with no intro. Pass it to unlock that level and everything before it.
- Settings has **Show note names** (on by default) and **Replay intros**.

## 10. Review: the flash-card system (`src/srs/`)

- Scheduled with **FSRS**, the modern spaced-repetition algorithm (Anki has it built in), through the `ts-fsrs` package. Aim for 90% recall. Ratings come from §8's grading, so there are no "how well did you know this?" buttons, except on `sing` cards.
- The Review screen says how many are due today. Sessions are capped (about 20 questions or 5 minutes) and so are new items per day, so a day's review stays short.
- Mixed across types and packs, never the same item twice in a row.
- **Confusions**: when you take A for B, the next sessions add A-against-B questions until you tell them apart.
- **Stats**: recall per item, weakest items, and a confusion grid (what you hear as what), like Dial In's weakest controls.

## 11. Drill

- Pick from the items you've learned; questions are endless and mixed by default. Narrow by type, concept or pack ("just minor vs diminished").
- Later, an **arcade** variant: chord names fall and you build each before it lands. Opt-in, and never in Learn: timers stress beginners and reward guessing.

As built (Milestone 4, `ui/screens/Drill.tsx` and `game/drill.ts`), opened from its card on Home (`#/drill`):
- **The picker**: what to practise (Build it, Name it, Change one note, Fix it, Hear it, Play it back, Facts), what it's about where there's a choice, which ones (chips; major and minor to start), and for keyboard types how much help (Lots of help, A hint, No help). Every type and item is open until Learn exists; then it narrows to what you've learned, with a way to show everything (SPEC §19).
- **A run** is one question type with one set, endless, with "7 of 9 right" and End drill. One seed makes the whole run, so it can be replayed, and the same item never comes twice in a row when the set has more than one.
- Not yet: mixing several types in one run, and remembering the last picks.

## 12. Daily challenge

- The same 10 questions for everyone on a date, seeded from the date, with no backend. Tiers by pack progress, as in Dial In.
- Score and time, a streak, and a spoiler-free share line with an emoji grid.
- Copy Dial In's `rng.ts` and `daily.ts`, and fingerprint the dailies in a stability test from the first release.

## 13. Explore

Built in Milestone 2 (`ui/screens/Explore.tsx`, with its logic in `ui/explore.ts`):

- **Play anything and it's named**, in a panel above the keyboard: one note ("C♯ / D♭"), an interval ("Major 3rd: C up to E, 4 half steps"), or a chord in words with its symbol, inversion and other names ("C major 6th: C6, also Am7/C"). Once the keys are let go, the panel keeps showing the most notes held at once, faded, so there's time to read it; moving one finger to a new chord shows the new one.
- **Light up a chord or scale**: Chord or Scale, a root (letter, then ♭, ♮ or ♯), the chord or scale type, and for chords the inversion. The notes light up on the keyboard, starting in its lowest octave, and are listed with their degrees (C 1, E♭ ♭3, G 5). Buttons: Play, Strum and One at a time for chords; Play up, Up and down, and Hear the key (a cadence, for the major and minor scales) for scales. Hide turns the lights off until the picker changes. Space plays it from a computer keyboard.
- **Sound**: the four fixed sounds, chosen from a menu next to the keyboard and saved.
- **Open in Scale Guide** for any scale picked (Milestone 3).
- **The circle of fifths** (Milestone 3, `ui/components/CircleOfFifths.tsx`): the twelve major keys round the outside, each with its key signature ("2♯") and its other spelling at the bottom of the circle (F♯/G♭, D♭/C♯, B/C♭), and the relative minors inside. Tapping a key opens it in the Scale Guide. The buttons are sized as a share of the circle, so at 320 px the closest two are still about 2 px apart.
- Still to come: naming from a MIDI keyboard.

## 14. Tools

These aren't games. They make the app useful when you're writing or picking apart music, and they reuse the theory engine. They link up: Scale Finder's results open in the Scale Guide.

Built in Milestone 3. The logic is pure TypeScript in `tools/` (`finder.ts`, `guide.ts`, tested); the screens are `ui/screens/ScaleFinder.tsx` and `ScaleGuide.tsx`, with routes `#/finder` and `#/guide/<root>/<scale>` (for example `#/guide/Eb/naturalMinor`). All three screens with a keyboard share `ui/instrument.ts` (voices, playback, loops and computer keys) and the `KeyboardBar` component. The A4 tuning is a saved setting, shared by both tools.

### 14.1 Scale Finder

**Input**, in any mix:
- tap notes on the keyboard
- type note names (C, E♭, F♯ and so on)
- type frequencies in Hz, read off a spectrum analyser. Each snaps to the nearest note and shows how far off it is ("49.4 Hz → G1, +14 cents").

Optionally, mark the **home note**: the one the music feels like it rests on.

**Results**
- Scales that contain every note entered, ranked: fewest extra notes first, then common scales before rare ones (major and natural minor; then pentatonics and blues; then the other modes and the harmonic and melodic minors), with scales built on the home note first.
- Scales with the same notes are grouped. C major, A minor and D Dorian are the same seven notes with a different home, so they show as one result with the home choices under it, not as seven results.
- **One note off**: near matches that contain all but one of the notes ("A minor, except G♯: that's A harmonic minor"), because songs borrow chords, and analyser peaks get misread.
- With only a few notes, lots of scales fit. The results say so and suggest adding notes.
- Tap a result to hear it or to open it in the Scale Guide.

**Frequencies**
- Each note entered shows its frequency in every octave from 0 to 8, with the sub and bass range (about 20–250 Hz) highlighted. Its neighbours either side are shown too, so you can see how close notes are down low (a half step at 41 Hz is under 2.5 Hz).
- **A4 reference**: 440 Hz by default, with 432 and 442 Hz presets, or any value. If every frequency entered is off by about the same amount, it suggests the song is tuned differently and offers to switch.
- **Harmonics check**: one bass note shows several peaks on an analyser, at 2, 3, 4 and 5 times its frequency (an octave up, an octave and a fifth, two octaves, two octaves and a major 3rd). When a frequency entered is a whole-number multiple of another one (within a tolerance), it's flagged ("165 Hz is the 3rd harmonic of 55 Hz (A1), so it's probably part of that note"), and a tap leaves it out of the search.
- A short tip on reading analysers: the lowest strong peak is usually the note; low notes are hard to read exactly, so check a harmonic an octave or two up.

As built, and where it differs from the above:
- Tapping a key adds its note, and tapping it again takes it away; computer keys do the same. Typed input takes names and frequencies in any mix, separated by spaces or commas ("A C E", "55 110hz 165.5"); anything unreadable is shown back.
- Frequencies show their nearest note and cents ("49.4 Hz: G1, +14 cents"). A harmonic is flagged as a question ("3rd harmonic of 55 Hz?") and stays in the search until Leave out is pressed.
- Results show the first six groups, then Show all. Each shows its best scale, the notes it adds that weren't entered, Play, Open in Scale Guide, and the same notes with other homes as links. Near matches are listed under "One note off" once four or more notes are entered.
- The neighbours of each note aren't shown in every row; instead, one line gives the gap between the lowest entered note and the next one up in octave 1 ("C1 and the note above it are only 1.9 Hz apart").
- The notes entered aren't kept when leaving the screen.

**Later**: drop in an audio file (decoded in the browser, never uploaded) or listen through the microphone, and get a key estimate from the notes it hears (a chromagram compared with key profiles). It's shown as a guess with its confidence, since key detection is often wrong on real tracks. Web MIDI input when that arrives.

### 14.2 Scale Guide

Pick a root and a scale, or arrive from Scale Finder, Explore or the circle of fifths.

- **The scale**: its notes on the keyboard, its steps, how it tends to feel ("bright", "dark", "dreamy") always next to its real name, and, for modes, the colour note that sets it apart from major or minor (Dorian's ♮6).
- **Bass frequencies**: each note's frequency in octaves 1 and 2 (about 32–130 Hz), for tuning a kick, sub or 808 to the key.
- **Its chords**: the three-note and seventh chord on each degree, with name (Am, Am7), Roman numeral (vi), notes and a play button. Each has a feel tag that comes from its job in the key, for example:
  - I: home, settled
  - IV: opens up, lifts away
  - V: tension, pulls back home
  - vi: soft, a little sad
  - ii: gentle, on the move
  - iii: in between, uncertain
  - vii°: unstable, tense
  - and in minor: i, a dark home; ♭VI, lifting and hopeful; ♭VII, bold; iv, mournful; V (from harmonic minor), a dramatic pull home.
- **What next?**: tap a chord to see where it likes to go, each move with how it tends to feel and an A-B play of the two chords. It's built from a small set of named moves rather than text for every pair:
  - **Going home** (V → I): resolved, finished
  - **Soft landing** (IV → I): the gentle "amen" ending
  - **The fake-out** (V → vi): you expect home and land somewhere sadder, which can feel unsettling
  - **Lift** (I → IV): opening up
  - **Building tension** (IV → V, ii → V)
  - **Darkening** (IV → iv, a chord borrowed from minor): bittersweet
- **Progressions**: common ones in the scale, with how they feel and where you hear them (I–V–vi–IV in pop; vi–IV–I–V; ii–V–I in jazz; i–♭VI–♭III–♭VII, epic and emotional, common in trance and EDM; i–♭VII–♭VI–V, the Andalusian cadence), looped at a tempo you pick.
- **Links into Learn**: each section links to the level that teaches it ("How this works: Foundations 13"). Still to come, once Learn exists (Milestone 5).

Feel words are written as "often heard as". A chord's feel depends on the key, the tempo, the sound and the listener. They live in `content/feel.ts` as data, per scale degree and chord quality and per move, so the guide needs no text for each key.

As built:
- **Content** (`content/feel.ts`): a feel for each of the 13 scales; a feel for each chord of the nine seven-note scales, by degree, with a fallback by chord type; 29 named moves, two of them borrowed (IV → iv and I → ♭VII in major) and one borrowed into natural minor (iv → V); and 15 progressions, each listed under the scales that have its chords (the flamenco i–♭VII–♭VI–V under natural minor only, borrowing its V). Songs named: "Let It Be", "With or Without You", "Zombie", "Stand By Me", "Sweet Child O' Mine" and "Oye Como Va".
- **Colour notes** come from comparing a scale's degrees with those of major or natural minor (set per scale in the content): Dorian's 6 against ♭6, Lydian's ♯4 against 4, harmonic minor's 7 against ♭7.
- **Chords** show as three-note chords or sevenths. Tapping one plays it with its root in the bass and lights it on the keyboard. What next? always works from the three-note chord on that degree.
- **Progressions** loop with each chord lasting a bar, at 60–160 BPM in steps of 5 (100 to start), and keep looping in time when the tempo changes. The player schedules each time round half a second ahead, so there's no gap.
- **Bass notes**: octaves 1 and 2 at the saved A4.
- **Scales without seven letters** (the pentatonics and blues) have no chords of their own; the guide says so and links to the scale whose chords fit (major or natural minor on the same root).

**Later**: more borrowed chords (♭VI and ♭VII in a major key), copying a progression as text, and exporting it as a MIDI file to drop into a DAW (a small hand-written encoder, no dependency).

## 15. UI and UX

- Portrait-first, dark theme, large touch targets. Dial In's look, with its own accent colour (amber, where Dial In is teal), so the two apps are easy to tell apart.
- **PWA**, as in Dial In: a manifest (standalone, dark theme, 192, 512 and maskable icons, an Apple touch icon and iOS meta tags), everything precached, a "Keyed In now works offline" notice the first time, and "A new version of Keyed In is ready" with **Reload** / **Later**, so an update never interrupts a round. An install card comes in Milestone 9.
- **Navigation**: Tap to start first (§6), then tabs for Home, Explore, Finder and Guide, with more as screens arrive. Below 520 px wide the tabs take their own row under the title. Screens are hash routes (`#/`, `#/explore`, `#/finder`, `#/guide/<root>/<scale>`), so the back button and reloads keep your place; changing the scale in the guide replaces the address rather than adding to history.
- **Home**: the modes under **Play** and the tools under **Tools**, as cards, and a card linking to Dial In. Cards that work are outlined in amber and marked "Open" (Explore from Milestone 2, Scale Finder and Scale Guide from Milestone 3, Drill from Milestone 4); the rest say "Coming soon". The game modes open from Home rather than from tabs, so the tabs stay for the tools. From Milestone 5 it also shows where to continue, and later today's daily and how many reviews are due.

## 16. Persistence

All storage goes through `storage/storage.ts`, and every key starts with `keyedin.` (build them with `storageKey()` in `storage/keys.ts`). Both apps live on the `brendanauri.github.io` origin, so they share localStorage, and Dial In's keys start with `dialin.`. Service workers and their caches are scoped by path (`/dial-in/` and `/keyed-in/`), so the two apps can be installed side by side and both work offline; check this once in Milestone 9.

Keys, each versioned:
- `keyedin.settings` (Milestone 2, `game/settings.ts`): note names on or off, the sound, and (from Milestone 3) the A4 tuning, 400 to 480 Hz. Missing or unreadable values fall back to the defaults, so settings saved before a field existed still load.
- Planned: `keyedin.progress` (levels, stars, the run in progress, placement) and `keyedin.review` (an FSRS card per item, confusions), each with a migration stub. Ask for persistent storage on the first progress save.

## 17. Milestones

Build in order. Each milestone ends with `npm test` and `npm run build` passing, a check in the browser at phone widths, SPEC.md and docs/handoff.md updated, and a commit.

**Status (2026-10-24)**: Milestones 0 to 4 are done and live, with two Drill fixes after phone testing. Milestone 5 is next.

| # | Milestone | What |
| --- | --- | --- |
| 0 | Set up | Scaffold, SPEC.md, CLAUDE.md, README and handoff; a Home screen that links to Dial In; PWA shell and icons; deploy workflow |
| 1 | Theory engine | Notes, intervals, chords, scales, keys, numerals and naming, with correct spelling; frequencies and scale matching. Thorough tests, checked against Tonal |
| 2 | Sound and keyboard | Audio from Dial In with four fixed sounds, playback helpers, the multi-touch phone keyboard, the Start screen and routes, Explore v1 |
| 3 | Tools | Scale Finder and Scale Guide (chords, feel, What next?, progressions), with feel content as data; the circle of fifths in Explore |
| 4 | Questions | `spell` (with `guide`), `change`, `fix`, `identify`, `hearQuality`, `echo` and `fact`; the question screen; feedback with A-B; a Drill picker |
| 5 | Packs and Learn | Pack schema and validation, Foundations levels 1–10 with intros, progress, stars, unlocks; the first-launch choice, placement check and Test out |
| 6 | Review | Item tracking, FSRS, the daily queue, confusions, Stats |
| 7 | Ear in context | Cadences, `hearDegree`, `hearFunction` and `progression`; Foundations levels 11–14 |
| 8 | Daily | Daily challenge, streaks, share text, stability test |
| 9 | Polish and links | Install card, an offline check with both apps installed, the link back from Dial In, a phone pass |
| 10+ | More | Chords and Colour, Minor Keys and Modes, Electronic and Bass Music; Web MIDI; fretboard; singing with the microphone; notation; challenge links; Drill arcade; Scale Finder audio input; MIDI export |

## 18. Conventions

- TypeScript strict; no `any`.
- No magic numbers outside `src/constants.ts`.
- Small, documented functions in `theory/`, `exercises/` and `srs/`.
- Match the surrounding code: comments that say why, plain names.
- On-screen text uses plain words, and introduces a term before using it.
- Stop after each milestone, summarise what was built and how to run it, and recommend the next step.

## 19. Decisions

### Settled (2026-10-24)

| Decision | Settled |
| --- | --- |
| Name | **Keyed In**. It pairs with Dial In: both mean "focused", and a key is a musical key. A quick search found no app with that name |
| One app or two | **A sibling app**, with links between the Home screens. The core loop is different (discrete questions and reviews, not knob settings), it keeps Dial In's dailies and share codes stable, and it gets its own icon and releases. The pieces worth sharing (seeded RNG, daily and streak logic, PWA setup, deploy workflow, voice) are copied once and left to diverge |
| Audience | **Absolute beginners first**, with a way to skip ahead (§9.4) |
| Foundations order | **Chords from level 3**; key signatures at level 10 (§9.2) |
| Beginner defaults | Note names shown, enharmonics accepted up to level 9, no visible clock in Learn, plain words before terms |
| Main mechanic | Building chords on the keyboard (`spell`, `change`, `fix`, `progression`), with help that fades (§8) |
| Theory library | Our own engine; Tonal as a dev-only test oracle |
| Numerals in minor keys and modes | **Counted against the major scale**: a minor key's chords are i, ii°, ♭III, iv, v, ♭VI and ♭VII. One rule for every key, mode and borrowed chord, as in pop and producer theory (textbooks often write VI and VII in minor instead) |
| Chord symbols | **Spelled out**: Cdim, Caug, Cm7♭5, easier for beginners to read. Roman numerals still use ° and + (vii°, ♭III+) |
| Octave numbers | **Middle C is C4** (scientific pitch), as in Dial In and most analysers and tuners. A setting for DAW numbering can come later (§20) |
| Sound | **Dial In's synth with four fixed sounds, for now**: small, and offline from the start. A sampled piano can come later (§20). All four were checked by ear on an Android phone after Milestone 2 |
| Tools timing | **Milestone 3, before the question types**: useful straight away, and the Scale Guide's feel words and progressions feed Learn's intros later |
| Answer checking | **By pitch class** (Milestone 4): any octave and any order counts, since keys on a keyboard carry no spelling. Spelling is checked later with the note picker, from the key-signature level on (§9.2) |
| Drill before Learn | **Everything open** (Milestone 4) until Learn exists; then Drill offers what you've learned, with a way to show everything |
| Where the modes live | **On Home**, not in the tabs (Milestone 4): the tabs are for the tools, so they stay four at 320 px |
| Blues scale spelling | **♭5, or ♯4 where ♭5 would need a double flat**: C blues has G♭, E♭ blues has A rather than B♭♭. The same rule covers major blues's ♭3 (G♭ major blues has A rather than B♭♭). Built in Milestone 3 (`scaleSteps` in `scales.ts`), where the degree follows the spelling (E♭ blues shows A as ♯4), and the Tonal check expects it |
| Tools | **Scale Finder** and **Scale Guide**, linked to each other, in Milestone 3 (§14) |
| Repo and hosting | github.com/BrendanAuri/keyed-in (public), `main` branch, deployed to brendanauri.github.io/keyed-in/ |

### Open

Settle each at the milestone that needs it. The first option is the recommendation.

1. **Ear items in Review** (Milestone 6): FSRS is built for remembering facts. It should still schedule ear skills sensibly, but a rolling accuracy may judge them better. Revisit after testing.
2. **Streak** (Milestone 8): a day counts when you play the daily *or* clear your reviews, or the daily only.
3. **Notation** (later): none in v1; Hooktheory, Meludia and Ableton all manage without it. A pack later.
4. **Second instrument view** (later): a fretboard for guitar and bass, or staff notation first.

## 20. Idea backlog (proposed, not committed)

- **Challenges**: send a friend a drill as a link.
- **Dial In sounds**: play this app's chords with a Dial In sound, from a pasted share code.
- **Sampled piano**: beginners may recognise a piano more easily than a synth. The reduced Salamander Grand Piano set at tonejs.github.io/audio/salamander is CC BY 3.0 (credit Alexander Holm); C2 to C7 is 16 MP3s, about 1.2 MB, which the offline cache would hold. Check the licence before adding it.
- **Drill arcade** (§11).
- **Scale Finder audio input** (§14.1).
- **Progression export**: copy as text, or a MIDI file for a DAW (§14.2).
- **Progression sketchpad**: pick numerals in a key and loop them, freely, beyond the Scale Guide's list. Useful for writing bass music.
- **DAW octave numbers**: a setting to show octaves as your DAW does. Ableton, Logic and Cubase call middle C "C3", and FL Studio calls it "C5". Matters most in the Scale Finder's frequency table.

## 21. Background: what this is built on

The full survey of existing apps, and the sources, are in [docs/plan.md](docs/plan.md) (§1, §2 and §17). In short:

**Borrowed from other apps**: a tiny lesson followed straight away by a drill (musictheory.net); drills you can narrow to your weak spots (teoria, ToneSavvy); set the key before any ear question, and resolve after every answer (Functional Ear Trainer); Roman numerals and real-song references (Hooktheory); play-first lessons with very little text (Ableton Learning Music); levels with stars that start with two choices (Perfect Ear, Music Theory Pro); daily workouts and streaks (ToneGym); feel words next to real names (Meludia); a keyboard designed for chords on phones (Duolingo Music's weak spot); spaced repetition (Anki); a playground with no scores (Chrome Music Lab).

**Methods with the best backing** (mostly general learning science; research on music apps themselves is thin):
1. **Retrieval and spacing**: being asked beats rereading, and spaced reviews beat cramming. Hence Review.
2. **Interleaving**: mixed practice beat practising one interval at a time in a study of melodic intervals (Wong, Chen and Lim, *Psychology of Music*), though learners believed the opposite. New items appear on their own briefly, then mixed in; mixed is the default.
3. **Hear notes in a key**: play a cadence before ear questions; reference songs are hints, not the method.
4. **Do it, don't just recognise it**: building a chord sticks better than picking it from a list (the generation effect). Hence building chords as the main mechanic.
5. **Contrast**: start with choices that sound very different, then close the gap; play confusions back to back.
6. **Several views at once**: every answer shows the name, the keys and the sound together.
7. **Singing**: optional, self-graded at first.
