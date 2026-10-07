import { TOO_HARD_WARN_MS, VOICE_LINES, VoiceCue, ZenBalloonVoiceCoach } from './zen-balloon-voice';

describe('ZenBalloonVoiceCoach', () => {
  let spoken: string[];
  let canSpeak: boolean;
  let coach: ZenBalloonVoiceCoach;

  beforeEach(() => {
    spoken = [];
    canSpeak = true;
    coach = new ZenBalloonVoiceCoach(line => {
      if (canSpeak) spoken.push(line.file);
      return canSpeak;
    });
  });

  const overPress = (ms: number) => {
    for (let t = 0; t < ms; t += 50) coach.trackTooHard(true, 50);
  };

  it('talks the first rep through each phase exactly once', () => {
    coach.beginRep(true);
    coach.enteredZone();
    coach.enteredZone(); // Slipping out and back in is not re-announced.
    coach.holdCompleted();
    coach.finished();
    coach.repCompleted();
    expect(spoken).toEqual(['game_squeeze_01.mp3', 'cue_hold.mp3', 'cue_release.mp3', 'cue_rep_success_01.mp3']);
  });

  it('only praises later reps', () => {
    coach.beginRep(false);
    coach.enteredZone();
    coach.holdCompleted();
    coach.repCompleted();
    expect(spoken).toEqual(['cue_rep_success_01.mp3']);
  });

  it('warns about over-pressing once per rep, only when it is sustained', () => {
    coach.beginRep(false);
    overPress(TOO_HARD_WARN_MS - 50);
    coach.trackTooHard(false, 50);
    overPress(TOO_HARD_WARN_MS - 50);
    expect(spoken).toEqual([]);
    coach.trackTooHard(true, 50);
    overPress(TOO_HARD_WARN_MS * 2);
    expect(spoken).toEqual(['cue_too_hard.mp3']);
    coach.beginRep(false);
    overPress(TOO_HARD_WARN_MS);
    expect(spoken).toEqual(['cue_too_hard.mp3', 'cue_too_hard.mp3']);
  });

  it('cuts off an instruction the user has moved past', () => {
    coach.beginRep(true);
    coach.enteredZone();
    expect(spoken).toEqual(['game_squeeze_01.mp3', 'cue_hold.mp3']);
  });

  it('lets praise and warnings finish before speaking again', () => {
    coach.beginRep(false);
    coach.repCompleted();
    coach.beginRep(false);
    overPress(TOO_HARD_WARN_MS);
    expect(spoken).toEqual(['cue_rep_success_01.mp3']);
    coach.finished();
    expect(spoken).toEqual(['cue_rep_success_01.mp3', 'cue_too_hard.mp3']);
    coach.restViolation();
    coach.repCompleted();
    expect(spoken.at(-1)).toBe('cue_rest_warning.mp3');
    coach.finished();
    expect(spoken.at(-1)).toBe('cue_rep_success_02.mp3');
  });

  it('drops a waiting instruction once its phase is over', () => {
    coach.beginRep(false);
    coach.restViolation();
    overPress(TOO_HARD_WARN_MS);
    coach.holdCompleted();
    coach.finished();
    expect(spoken).toEqual(['cue_rest_warning.mp3']);
  });

  it('forgets the waiting cue on reset', () => {
    coach.start();
    coach.beginRep(true);
    coach.reset();
    coach.finished();
    expect(spoken).toEqual(['game_intro.mp3']);
  });

  it('rotates praise every rep even when nothing can be spoken', () => {
    canSpeak = false;
    const picked = [1, 2, 3, 4, 5].map(() => coach.repCompleted());
    expect(picked.map(line => line.starKey)).toEqual(
      ['game.praise.1', 'game.praise.2', 'game.praise.3', 'game.praise.4', 'game.praise.1']);
    expect(picked.map(line => line.textKey)).toEqual(
      ['game.feedback.success1', 'game.feedback.success2', 'game.feedback.success3', 'game.feedback.success4', 'game.feedback.success1']);
  });

  it('pairs every success clip with its own star word', () => {
    const lines = VOICE_LINES.success;
    expect(new Set(lines.map(line => line.starKey)).size).toBe(lines.length);
    for (const cue of Object.keys(VOICE_LINES) as VoiceCue[]) {
      for (const line of VOICE_LINES[cue]) expect(line.textKey).withContext(line.file).toMatch(/^game\./);
    }
  });
});
