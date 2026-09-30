import { publicName } from './display';

describe('publicName', () => {
  it("réduit le nom d'un habitant à l'initiale", () => {
    expect(publicName({ name: 'Léa Martin', role: 'CITIZEN' })).toBe('Léa M.');
    expect(publicName({ name: 'Jean Pierre de la Fontaine', role: 'CITIZEN' })).toBe('Jean F.');
  });

  it('garde un prénom seul tel quel', () => {
    expect(publicName({ name: 'Nadia', role: 'CITIZEN' })).toBe('Nadia');
  });

  it("affiche le nom complet d'un agent", () => {
    expect(publicName({ name: 'Karim Benali', role: 'AGENT' })).toBe('Karim Benali');
  });
});
