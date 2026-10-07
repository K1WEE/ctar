// Voice coaching for Zen Balloon. Each recorded clip is paired with the exact
// sentence it speaks, so the on-screen cue and the praise star always match
// what the user hears.

export interface VoiceLine {
  file: string;
  textKey: string;
  starKey?: string;
  fallback?: string;
}

export type VoiceCue = 'intro' | 'squeeze' | 'hold' | 'release' | 'tooHard' | 'restWarning' | 'success';

// Only files shipped with the Thai voice pack.
export const VOICE_LINES: Record<VoiceCue, readonly VoiceLine[]> = {
  intro: [{ file: 'game_intro.mp3', textKey: 'game.voice.intro', fallback: 'intro.mp3' }],
  squeeze: [
    { file: 'game_squeeze_01.mp3', textKey: 'game.feedback.squeeze1', fallback: 'cue_squeeze.mp3' },
    { file: 'game_squeeze_02.mp3', textKey: 'game.feedback.squeeze2', fallback: 'cue_squeeze.mp3' },
    { file: 'game_squeeze_03.mp3', textKey: 'game.feedback.squeeze3', fallback: 'cue_squeeze.mp3' },
    { file: 'game_squeeze_04.mp3', textKey: 'game.feedback.squeeze4', fallback: 'cue_squeeze.mp3' },
  ],
  hold: [{ file: 'cue_hold.mp3', textKey: 'game.feedback.hold1' }],
  release: [{ file: 'cue_release.mp3', textKey: 'game.feedback.release1' }],
  tooHard: [{ file: 'cue_too_hard.mp3', textKey: 'game.feedback.tooHard1' }],
  restWarning: [{ file: 'cue_rest_warning.mp3', textKey: 'game.feedback.restWarning' }],
  success: [
    { file: 'cue_rep_success_01.mp3', textKey: 'game.feedback.success1', starKey: 'game.praise.1' },
    { file: 'cue_rep_success_02.mp3', textKey: 'game.feedback.success2', starKey: 'game.praise.2' },
    { file: 'cue_rep_success_03.mp3', textKey: 'game.feedback.success3', starKey: 'game.praise.3' },
    { file: 'cue_rep_success_04.mp3', textKey: 'game.feedback.success4', starKey: 'game.praise.4' },
  ],
};

// Praise, the intro and warnings always finish. Instructions describe a phase
// that may already be over, so they give way at once.
const UNINTERRUPTIBLE: ReadonlySet<VoiceCue> = new Set<VoiceCue>(['intro', 'success', 'restWarning']);
const INSTRUCTIONS: ReadonlySet<VoiceCue> = new Set<VoiceCue>(['squeeze', 'hold', 'release', 'tooHard']);
export const TOO_HARD_WARN_MS = 1500;

/**
 * Decides what to say and when. The first rep is a spoken tutorial (each phase
 * once); later reps only get praise and corrections for sustained mistakes.
 * `speak` returns false when nothing could play (muted, no voice pack).
 */
export class ZenBalloonVoiceCoach {
  private tutorial = false;
  private saidThisRep = new Set<VoiceCue>();
  private tooHardMs = 0;
  private phase = 0;
  private readonly indices: Partial<Record<VoiceCue, number>> = {};
  private active: VoiceCue | null = null;
  private pending: { cue: VoiceCue; line: VoiceLine; phase: number } | null = null;

  constructor(private readonly speak: (line: VoiceLine, cue: VoiceCue) => boolean) {}

  start() {
    this.say('intro');
  }

  beginRep(tutorial: boolean) {
    this.tutorial = tutorial;
    this.saidThisRep.clear();
    this.tooHardMs = 0;
    this.phase++;
    if (tutorial) this.say('squeeze');
  }

  enteredZone() {
    this.tooHardMs = 0;
    if (!this.tutorial || this.saidThisRep.has('hold')) return;
    this.phase++;
    this.say('hold');
  }

  holdCompleted() {
    this.tooHardMs = 0;
    this.phase++;
    if (this.tutorial) this.say('release');
  }

  /** Called every game tick while squeezing; warns once per rep after a sustained over-press. */
  trackTooHard(isTooHard: boolean, elapsedMs: number) {
    this.tooHardMs = isTooHard ? this.tooHardMs + elapsedMs : 0;
    if (this.tooHardMs >= TOO_HARD_WARN_MS && !this.saidThisRep.has('tooHard')) this.say('tooHard');
  }

  restViolation() {
    this.say('restWarning');
  }

  /** Picks this rep's praise (voice, cue text and star share it) even when muted. */
  repCompleted(): VoiceLine {
    this.phase++;
    return this.say('success');
  }

  /** The speaking clip ended or failed; play whatever was waiting behind it. */
  finished() {
    this.active = null;
    const next = this.pending;
    this.pending = null;
    // An instruction for a phase the user has already left would be wrong now.
    if (next && !(INSTRUCTIONS.has(next.cue) && next.phase !== this.phase)) this.play(next.cue, next.line);
  }

  /** Muted, paused or destroyed: forget the speaking clip and anything waiting. */
  reset() {
    this.active = null;
    this.pending = null;
  }

  private say(cue: VoiceCue): VoiceLine {
    const lines = VOICE_LINES[cue];
    const index = this.indices[cue] ?? 0;
    const line = lines[index];
    this.saidThisRep.add(cue);
    // Variants advance per rep, not per playback, so muted runs still rotate.
    this.indices[cue] = (index + 1) % lines.length;
    if (this.active && UNINTERRUPTIBLE.has(this.active)) {
      this.pending = { cue, line, phase: this.phase };
    } else {
      this.pending = null;
      this.play(cue, line);
    }
    return line;
  }

  private play(cue: VoiceCue, line: VoiceLine) {
    this.active = this.speak(line, cue) ? cue : null;
  }
}
