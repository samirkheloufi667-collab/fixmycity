import { canTransition, requiresMessage, TRANSITIONS } from './status';

describe('cycle de vie', () => {
  it("suit le parcours normal jusqu'à la résolution", () => {
    expect(canTransition('NEW', 'ACKNOWLEDGED')).toBe(true);
    expect(canTransition('ACKNOWLEDGED', 'IN_PROGRESS')).toBe(true);
    expect(canTransition('IN_PROGRESS', 'RESOLVED')).toBe(true);
  });

  it('interdit de sauter directement de « nouveau » à « résolu »', () => {
    expect(canTransition('NEW', 'RESOLVED')).toBe(false);
    expect(canTransition('NEW', 'IN_PROGRESS')).toBe(false);
  });

  it('permet de rouvrir un signalement résolu ou de reconsidérer un refus', () => {
    expect(canTransition('RESOLVED', 'IN_PROGRESS')).toBe(true);
    expect(canTransition('REJECTED', 'ACKNOWLEDGED')).toBe(true);
  });

  it('ne propose jamais de rester sur le même statut', () => {
    for (const [from, targets] of Object.entries(TRANSITIONS)) {
      expect(targets).not.toContain(from);
    }
  });

  it('exige une explication pour un refus et pour une résolution', () => {
    expect(requiresMessage('REJECTED')).toBe(true);
    expect(requiresMessage('RESOLVED')).toBe(true);
    expect(requiresMessage('IN_PROGRESS')).toBe(false);
  });
});
