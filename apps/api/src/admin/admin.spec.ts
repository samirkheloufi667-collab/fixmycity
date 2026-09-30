import { median } from '../categories/categories.controller';
import { weekStart } from './admin.service';

describe('median', () => {
  it('prend la valeur du milieu, ou la moyenne des deux du milieu', () => {
    expect(median([5, 1, 3])).toBe(3);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });

  it('résiste à une valeur extrême, contrairement à la moyenne', () => {
    expect(median([1, 2, 2, 3, 90])).toBe(2);
  });

  it('renvoie null sans données', () => {
    expect(median([])).toBeNull();
  });
});

describe('weekStart', () => {
  it('ramène au lundi à minuit', () => {
    const monday = weekStart(new Date(2026, 8, 30, 15, 0)); // mercredi 30 septembre 2026
    expect(monday.getDay()).toBe(1);
    expect(monday.getDate()).toBe(28);
    expect(monday.getHours()).toBe(0);
  });

  it('laisse un dimanche dans la semaine qui se termine', () => {
    expect(weekStart(new Date(2026, 9, 4, 12)).getDate()).toBe(28);
  });
});
