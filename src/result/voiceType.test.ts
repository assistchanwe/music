import { describe, it, expect } from 'vitest';
import { classifyVoice, rangeWidthLabel } from './voiceType';
import { noteNameToMidi as n } from '../audio/notes';

describe('classifyVoice', () => {
  it('전형적인 남성 저음역은 베이스/바리톤', () => {
    expect(['bass', 'baritone']).toContain(classifyVoice(n('E2'), n('E4')).id);
  });

  it('전형적인 테너 음역', () => {
    expect(classifyVoice(n('C3'), n('C5')).id).toBe('tenor');
  });

  it('전형적인 소프라노 음역', () => {
    expect(classifyVoice(n('C4'), n('C6')).id).toBe('soprano');
  });

  it('전형적인 알토 음역', () => {
    expect(classifyVoice(n('F3'), n('F5')).id).toBe('alto');
  });
});

describe('rangeWidthLabel', () => {
  it('12반음 = 1옥타브', () => {
    expect(rangeWidthLabel(48, 60)).toBe('1옥타브');
  });
  it('26반음 = 2옥타브 2반음', () => {
    expect(rangeWidthLabel(48, 74)).toBe('2옥타브 2반음');
  });
  it('옥타브 미만', () => {
    expect(rangeWidthLabel(60, 67)).toBe('7반음');
  });
});
