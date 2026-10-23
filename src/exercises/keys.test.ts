import { describe, expect, it } from 'vitest';
import { createRng } from '../game/rng';
import { n, p } from '../theory/fixtures';
import { formatPitch, midi, pitchClass, pitchFromMidi } from '../theory/notes';
import { CHANGE_PAIRS, checkKeys, generateChange, generateEcho, generateFix, generateSpell, keysFeedback, notesApart, wrongKeyTip } from './keys';
import { targetPitchClasses, voiceTarget } from './targets';
import type { KeysQuestion, QuestionSpec } from './types';

const keys = (...pitches: string[]) => pitches.map((text) => midi(p(text)));
const names = (midis: readonly number[]) => midis.map((m) => formatPitch(pitchFromMidi(m, 'flat'))).join(' ');
const spec = (fields: Partial<QuestionSpec>): QuestionSpec => ({ type: 'spell', about: 'chords', set: ['minor'], roots: ['C'], ...fields });

describe('spell', () => {
  it('asks for a chord by name, the same way for the same seed', () => {
    const q = generateSpell(spec({}), createRng(1));
    expect(q.prompt).toBe('Tap the notes of C minor.');
    expect(q.item).toBe('spell:minor@C');
    expect(generateSpell(spec({}), createRng(1))).toEqual(q);
  });

  it('starts full help with the root chosen and the recipe; less help lights nothing', () => {
    const full = generateSpell(spec({ guide: 'full' }), createRng(1));
    expect(names(full.start)).toBe('C4');
    expect(full.shown).toEqual([]);
    expect(full.recipe).toContain('Count up 3 keys');
    const hint = generateSpell(spec({ guide: 'hint' }), createRng(1));
    expect(hint.start).toEqual([]);
    expect(hint.shown).toEqual([]);
    expect(hint.recipe).not.toBeNull();
    const none = generateSpell(spec({ guide: 'none' }), createRng(1));
    expect(none.start).toEqual([]);
    expect(none.recipe).toBeNull();
  });

  it('asks for single notes, hiding the names when there is no help', () => {
    const q = generateSpell(spec({ about: 'notes', roots: ['Eb'], guide: 'none' }), createRng(2));
    expect(q.prompt).toBe('Find E♭.');
    expect(q.hideNames).toBe(true);
    expect(generateSpell(spec({ about: 'notes', roots: ['Eb'], guide: 'full' }), createRng(2)).recipe).toBe('E♭ is the black key just left of E.');
  });

  it('asks for scales', () => {
    const q = generateSpell(spec({ about: 'scales', set: ['major'], roots: ['D'] }), createRng(3));
    expect(q.prompt).toBe('Tap the notes of the D major scale.');
    expect(targetPitchClasses(q.target)).toEqual([1, 2, 4, 6, 7, 9, 11]);
  });
});

describe('checking keys', () => {
  const q = generateSpell(spec({}), createRng(1));

  it('accepts the notes in any octave and order, doubled or not', () => {
    expect(checkKeys(q, keys('C4', 'Eb4', 'G4')).correct).toBe(true);
    expect(checkKeys(q, keys('G3', 'C4', 'Eb5', 'C5')).correct).toBe(true);
  });

  it('calls some right notes and no wrong ones partly right', () => {
    expect(checkKeys(q, keys('C4', 'G4'))).toEqual({ correct: false, partial: true });
    expect(checkKeys(q, keys('C4', 'E4', 'G4'))).toEqual({ correct: false, partial: false });
    expect(checkKeys(q, [])).toEqual({ correct: false, partial: false });
  });
});

describe('feedback for keys', () => {
  const q = generateSpell(spec({}), createRng(1));

  it('says what was played, what was asked and what differs', () => {
    const answer = keys('C4', 'E4', 'G4');
    const fb = keysFeedback(q, answer, checkKeys(q, answer));
    expect(fb.headline).toBe('Not quite.');
    expect(fb.lines).toEqual([
      "You played C, E and G: that's C major.",
      'C minor is C, E♭ and G.',
      'Missing: E♭.',
      'Not in it: E.',
      "C minor's 3rd is E♭, 1 key lower than C major's E.",
      'A lower 3rd makes a chord minor and darker.',
    ]);
    expect(names(fb.yours)).toBe('C4 E4 G4');
    expect(names(fb.correct)).toBe('C4 E♭4 G4');
  });

  it('says nearly for some right notes, and yes when right', () => {
    expect(keysFeedback(q, keys('C4', 'G4'), checkKeys(q, keys('C4', 'G4'))).headline).toBe('Nearly.');
    const right = keys('C4', 'Eb4', 'G4');
    expect(keysFeedback(q, right, checkKeys(q, right))).toMatchObject({ headline: "Yes, that's it.", lines: ['C minor is C, E♭ and G.'] });
  });

  it('notices nothing lit', () => {
    expect(keysFeedback(q, [], checkKeys(q, [])).lines[0]).toBe('No keys were lit.');
  });

  it('tips a wrong key with full help only', () => {
    const full = generateSpell(spec({ guide: 'full' }), createRng(1));
    expect(wrongKeyTip(full, midi(p('E4')))).toMatch(/^E isn't in C minor\. Start on C/);
    expect(wrongKeyTip(full, midi(p('Eb4')))).toBeNull();
    expect(wrongKeyTip(q, midi(p('E4')))).toBeNull();
  });

  it('spells a wrong black key the way the key leans: sharps near F♯ major, flats near C minor', () => {
    const sharpKey = generateSpell(spec({ set: ['major'], roots: ['F#'], guide: 'full' }), createRng(1));
    expect(wrongKeyTip(sharpKey, midi(p('D#4')))).toMatch(/^D♯ isn't in F♯ major/);
    const flatKey = generateSpell(spec({ guide: 'full' }), createRng(1));
    expect(wrongKeyTip(flatKey, midi(p('C#4')))).toMatch(/^D♭ isn't in C minor/);
  });
});

describe('change, fix and echo', () => {
  it('pairs chords that are really one note apart', () => {
    for (const [from, to] of CHANGE_PAIRS) expect(notesApart(n('C'), from, to), `${from} → ${to}`).toBe(2);
  });

  it('starts a change from the first chord and says which note moves', () => {
    const q = generateChange(spec({ type: 'change', set: ['major', 'minor'] }), createRng(4));
    expect(q.prompt).toMatch(/^Here's C (major|minor)\. Make it C (minor|major) by moving one note\.$/);
    expect(checkKeys(q, q.start).correct).toBe(false);
    const toMinor = generateChange(spec({ type: 'change', set: ['major', 'minor'], guide: 'full' }), createRng(4));
    expect(toMinor.recipe).toMatch(/^Move E(♭)? (down|up) 1 key, to E(♭)?\.$/);
  });

  it('starts a fix with exactly one wrong note, never the root', () => {
    for (let seed = 0; seed < 40; seed++) {
      const q = generateFix(spec({ type: 'fix', set: ['major', 'minor', 'dominant7'], roots: undefined }), createRng(seed));
      const right = voiceTarget(q.target, 4);
      const wrong = q.start.filter((m, i) => m !== right[i]);
      expect(wrong, q.prompt).toHaveLength(1);
      expect(q.start[0]).toBe(right[0]);
      expect(checkKeys(q, q.start).correct).toBe(false);
    }
  });

  it('plays back a chord or interval with the given note already chosen', () => {
    const chord = generateEcho(spec({ type: 'echo', set: ['minor'] }), createRng(5));
    expect(names(chord.start)).toBe('C4');
    expect(chord.shown).toEqual([]);
    expect(chord.prompt).toBe("Here's C, the lowest note, already chosen. Listen, then add the rest of the chord you hear.");
    expect(names(chord.sound ?? [])).toBe('C4 E♭4 G4');
    expect(chord.item).toBe('echo:minor');
    const interval: KeysQuestion = generateEcho(spec({ type: 'echo', about: 'intervals', set: ['P5'] }), createRng(5));
    expect(names(interval.sound ?? [])).toBe('C4 G4');
    expect(checkKeys(interval, keys('C3', 'G3')).correct).toBe(true);
    expect(checkKeys(interval, interval.start).correct).toBe(false);
    expect(pitchClass(n('C'))).toBe(0);
  });

  it("never plays back an octave, which the chosen root alone would answer", () => {
    for (let seed = 0; seed < 20; seed++) {
      const q = generateEcho(spec({ type: 'echo', about: 'intervals', set: ['P8', 'M3'] }), createRng(seed));
      expect(q.item).toBe('echo:M3');
    }
    expect(generateEcho(spec({ type: 'echo', about: 'intervals', set: ['P8'] }), createRng(1)).item).toBe('echo:P5');
  });
});
