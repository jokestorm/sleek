export const rarityWeightTotal = 10000;
const randomRange = 2 ** 32;

export type Art = 'pistol' | 'rifle' | 'sniper' | 'knife';
export type Rarity = { id: string; name: string; color: string; weight: number };
export type LootItem = { id: string; name: string; weapon: string; rarity: string; art: Art; image?: string; colors: { primary: string; secondary: string } };
export type LootCatalog = { id: 'origin'; name: string; rarities: Rarity[]; items: LootItem[] };
export type Condition = 'Factory New' | 'Minimal Wear' | 'Field-Tested' | 'Well-Worn' | 'Battle-Scarred';
export type OwnedItem = {
  instanceId: string;
  item: LootItem;
  rarity: Rarity;
  float: number;
  condition: Condition;
  wearSeed: number;
  openedAt: number;
};
export type RandomInt = (bound: number) => number;

const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const identifier = (value: unknown): value is string => typeof value === 'string' && /^[a-z][a-z0-9-]*$/.test(value);
const color = (value: unknown): value is string => typeof value === 'string' && /^#[a-f\d]{6}$/i.test(value);

// Bad catalog edits produce actionable messages instead of silently changing the odds.
export function validateCatalog(raw: unknown): { catalog: LootCatalog | null; errors: string[] } {
  const errors: string[] = [];
  if (!object(raw)) return { catalog: null, errors: ['The loot catalog must be a JSON object.'] };
  if (raw.id !== 'origin') errors.push('The case id must be "origin".');
  if (!text(raw.name)) errors.push('The case needs a name.');
  if (!Array.isArray(raw.rarities) || raw.rarities.length === 0) errors.push('Add at least one rarity tier.');
  if (!Array.isArray(raw.items) || raw.items.length === 0) errors.push('Add at least one item.');
  if (!Array.isArray(raw.rarities) || !Array.isArray(raw.items)) return { catalog: null, errors };

  const rarityIds = new Set<string>();
  let weight = 0;
  raw.rarities.forEach((rarity, index) => {
    const label = `Rarity ${index + 1}`;
    if (!object(rarity)) { errors.push(`${label} must be an object.`); return; }
    if (!identifier(rarity.id)) errors.push(`${label} needs a lowercase id using letters, numbers, and hyphens.`);
    else if (rarityIds.has(rarity.id)) errors.push(`Duplicate rarity id: ${rarity.id}.`);
    else rarityIds.add(rarity.id);
    if (!text(rarity.name)) errors.push(`${label} needs a name.`);
    if (!color(rarity.color)) errors.push(`${label} needs a six-digit hex color.`);
    if (!Number.isSafeInteger(rarity.weight) || (rarity.weight as number) <= 0) errors.push(`${label} needs a positive integer weight.`);
    else weight += rarity.weight as number;
  });
  if (weight !== rarityWeightTotal) errors.push(`Rarity weights must total ${rarityWeightTotal}; currently ${weight}.`);

  const itemIds = new Set<string>();
  const populatedRarities = new Set<string>();
  raw.items.forEach((item, index) => {
    const label = `Item ${index + 1}`;
    if (!object(item)) { errors.push(`${label} must be an object.`); return; }
    if (!identifier(item.id)) errors.push(`${label} needs a lowercase id using letters, numbers, and hyphens.`);
    else if (itemIds.has(item.id)) errors.push(`Duplicate item id: ${item.id}.`);
    else itemIds.add(item.id);
    if (!text(item.name) || !text(item.weapon)) errors.push(`${label} needs both a finish name and a weapon name.`);
    if (!text(item.rarity) || !rarityIds.has(item.rarity)) errors.push(`${label} references an unknown rarity.`);
    else populatedRarities.add(item.rarity);
    if (!['pistol', 'rifle', 'sniper', 'knife'].includes(item.art as string)) errors.push(`${label} art must be pistol, rifle, sniper, or knife.`);
    if (item.image !== undefined && (typeof item.image !== 'string' || !/^\/(?!\/)[a-zA-Z0-9_./-]+$/.test(item.image) || item.image.split('/').includes('..'))) errors.push(`${label} image must be a local absolute asset path such as /art/custom.png.`);
    if (!object(item.colors) || !color(item.colors.primary) || !color(item.colors.secondary)) errors.push(`${label} needs primary and secondary six-digit hex colors.`);
  });
  for (const id of rarityIds) if (!populatedRarities.has(id)) errors.push(`Rarity "${id}" needs at least one item; empty tiers cannot be rerolled.`);
  return { catalog: errors.length ? null : raw as unknown as LootCatalog, errors };
}

// Rejection sampling avoids modulo bias for bounds that do not divide 2^32.
export function cryptoRandomInt(bound: number): number {
  if (!Number.isSafeInteger(bound) || bound < 1 || bound > randomRange) throw new RangeError('Random bounds must be integers from 1 through 2^32.');
  const ceiling = Math.floor(randomRange / bound) * bound;
  const sample = new Uint32Array(1);
  do { globalThis.crypto.getRandomValues(sample); } while (sample[0] >= ceiling);
  return sample[0] % bound;
}

function draw(randomInt: RandomInt, bound: number): number {
  const result = randomInt(bound);
  if (!Number.isSafeInteger(result) || result < 0 || result >= bound) throw new RangeError('The random source returned a value outside its requested bound.');
  return result;
}

// Pick the tier independently of how many items it contains, then pick its item uniformly.
export function rollItem(catalog: LootCatalog, randomInt: RandomInt = cryptoRandomInt): LootItem {
  let roll = draw(randomInt, rarityWeightTotal);
  const rarity = catalog.rarities.find(tier => {
    if (roll < tier.weight) return true;
    roll -= tier.weight;
    return false;
  });
  if (!rarity) throw new Error('The loot catalog has invalid rarity weights.');
  const items = catalog.items.filter(item => item.rarity === rarity.id);
  if (items.length === 0) throw new Error(`Rarity "${rarity.id}" has no items. Fix the catalog before opening.`);
  return items[draw(randomInt, items.length)];
}

export function conditionForFloat(value: number): Condition {
  if (!Number.isFinite(value) || value < 0 || value >= 1) throw new RangeError('Item float must be at least zero and less than one.');
  if (value < 0.07) return 'Factory New';
  if (value < 0.15) return 'Minimal Wear';
  if (value < 0.38) return 'Field-Tested';
  if (value < 0.45) return 'Well-Worn';
  return 'Battle-Scarred';
}

export function rollInstance(catalog: LootCatalog, options: { randomInt?: RandomInt; instanceId?: string; openedAt?: number } = {}): OwnedItem {
  const randomInt = options.randomInt ?? cryptoRandomInt;
  const selected = rollItem(catalog, randomInt);
  const rarity = catalog.rarities.find(tier => tier.id === selected.rarity);
  if (!rarity) throw new Error('The selected item references an unknown rarity.');
  const float = draw(randomInt, randomRange) / randomRange;
  const wearSeed = draw(randomInt, randomRange);
  const instanceId = options.instanceId ?? globalThis.crypto.randomUUID();
  const openedAt = options.openedAt ?? Date.now();
  if (!text(instanceId) || !Number.isSafeInteger(openedAt) || openedAt < 0) throw new Error('The opening needs a unique id and a valid timestamp.');
  // Each owned item keeps its own catalog snapshot, including the rarity presentation.
  return { instanceId, item: { ...selected, colors: { ...selected.colors } }, rarity: { ...rarity }, float, condition: conditionForFloat(float), wearSeed, openedAt };
}

export function makeReel(catalog: LootCatalog, winner: OwnedItem, options: { randomInt?: RandomInt; length?: number; winnerIndex?: number } = {}) {
  const length = options.length ?? 54;
  const winnerIndex = options.winnerIndex ?? 46;
  if (!Number.isSafeInteger(length) || length < 1 || length > 500 || !Number.isSafeInteger(winnerIndex) || winnerIndex < 0 || winnerIndex >= length) throw new RangeError('The reel needs a valid length and winning index.');
  const items = Array.from({ length }, (_, index) => index === winnerIndex ? winner.item : rollItem(catalog, options.randomInt ?? cryptoRandomInt));
  return { items, winnerIndex };
}
