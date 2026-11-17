// LUMEN DRIFT — the upgrade cards offered between waves.
// One clear job: the pool of upgrades, what each one does, and picking
// three different cards for the player to choose from.

export const UPGRADE_POOL = [
  {
    id: 'damage',
    name: 'Overcharged Rounds',
    icon: '✦',
    description: '+6 bullet damage',
    apply: (player) => { player.bulletDamage += 6; },
  },
  {
    id: 'firerate',
    name: 'Rapid Cycler',
    icon: '≫',
    description: 'Fire 18% faster',
    apply: (player) => { player.fireInterval = Math.max(0.07, player.fireInterval * 0.82); },
  },
  {
    id: 'multishot',
    name: 'Twin Barrels',
    icon: '✜',
    description: '+1 bullet per shot',
    apply: (player) => { player.multishot += 1; },
    max: 3,
  },
  {
    id: 'speed',
    name: 'Ion Thrusters',
    icon: '➤',
    description: '+12% move speed',
    apply: (player) => { player.speed *= 1.12; },
  },
  {
    id: 'hull',
    name: 'Ablative Plating',
    icon: '⬢',
    description: '+25 max hull and repair 25',
    apply: (player) => { player.maxHull += 25; player.heal(25); },
  },
  {
    id: 'halo',
    name: 'Halo Ring',
    icon: '◉',
    description: 'Orbiting orbs that burn enemies on touch',
    apply: (player) => {
      player.haloOrbs = player.haloOrbs === 0 ? 2 : player.haloOrbs + 1;
      player.haloDamage += 4;
    },
    max: 5,
  },
  {
    id: 'magnet',
    name: 'Shard Magnet',
    icon: '◎',
    description: '+60% shard pickup radius',
    apply: (player) => { player.magnetRadius *= 1.6; },
  },
  {
    id: 'pierce',
    name: 'Lance Rounds',
    icon: '⟶',
    description: 'Bullets pierce +1 enemy',
    apply: (player) => { player.pierce += 1; },
    max: 3,
  },
  {
    id: 'dash',
    name: 'Phase Dash',
    icon: '↯',
    description: 'Dash recharges 35% faster',
    apply: (player) => { player.dashCooldown = Math.max(0.6, player.dashCooldown * 0.65); },
  },
  {
    id: 'velocity',
    name: 'Railgun Coils',
    icon: '➢',
    description: '+20% bullet speed and +3 damage',
    apply: (player) => { player.bulletSpeed *= 1.2; player.bulletDamage += 3; },
  },
];

/**
 * Pick three different upgrades the player can still take.
 * `taken` maps upgrade id to how many times it was already chosen.
 */
export function rollUpgrades(rng, taken) {
  const available = UPGRADE_POOL.filter((upgrade) => {
    const count = taken[upgrade.id] || 0;
    return upgrade.max === undefined || count < upgrade.max;
  });
  const pool = available.length >= 3 ? available : UPGRADE_POOL;
  const picks = [];
  const copy = [...pool];
  while (picks.length < 3 && copy.length > 0) {
    const index = Math.floor(rng() * copy.length);
    picks.push(copy.splice(index, 1)[0]);
  }
  return picks;
}
