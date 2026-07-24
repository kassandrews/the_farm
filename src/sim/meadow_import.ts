// The Meadow import path — a READ-ONLY adapter for The Meadow's export JSON
// (CLAUDE.md §Saves: "a separate read-only adapter … never write back"). We
// treat their backup string as a foreign format with its own shape declared
// right here; we never import cozy_sprites code and never hand anything back.
//
// The Meadow's backup is base64 of encodeURIComponent(JSON) wrapping
// { v, pet, farm, discovered } (see cozy_sprites/src/pet/persistence.ts). A pet
// (or the most recent retiree) becomes a Farm sprite, and its raising history
// seeds the villager's memory so its dialogue can reference a life you actually
// gave it — nobody else's town has your specific import.

import type { AdultForm } from "../content/canon/forms";
import { FORMS } from "../content/canon/forms";
import type { MemoryLog } from "./memory";

// --- The foreign shape (only the fields we read) -----------------------------
interface MeadowHidden {
  cakeEaten?: number;
  carrotEaten?: number;
  cubeEaten?: number;
}
interface MeadowPet {
  name?: string;
  form?: string | null;
  createdAt?: number;
  hidden?: MeadowHidden;
}
interface MeadowFarmEntry {
  name?: string;
  form?: string | null;
  hatchedAt?: number;
  hidden?: MeadowHidden;
}
interface MeadowBackup {
  v?: number;
  pet?: MeadowPet | null;
  farm?: MeadowFarmEntry[];
}

export interface MeadowImport {
  name: string;
  form: AdultForm;
  /** Memories seeded from the imported life, ready to hand to makeVillager. */
  memorySeed: MemoryLog;
}

function isForm(f: unknown): f is AdultForm {
  return typeof f === "string" && f in FORMS;
}

/** Which food a Meadow pet leaned on most, as a phrase for "they fed me ___". */
function favoriteFood(hidden: MeadowHidden | undefined): string | null {
  if (!hidden) return null;
  const tally: [string, number][] = [
    ["cake", hidden.cakeEaten ?? 0],
    ["carrots", hidden.carrotEaten ?? 0],
    ["the cube", hidden.cubeEaten ?? 0],
  ];
  tally.sort((a, b) => b[1] - a[1]);
  return tally[0][1] > 0 ? tally[0][0] : null;
}

/** Turn a decoded pet-ish record into a Farm import, seeding memory. Returns
 *  null if it has no usable form (a fresh egg with no adult form can't be a
 *  villager). */
function toImport(name: string | undefined, form: unknown, hatchedAt: number | undefined, hidden: MeadowHidden | undefined): MeadowImport | null {
  if (!isForm(form)) return null;
  const seed: MemoryLog = [];
  const fav = favoriteFood(hidden);
  const at = hatchedAt ?? Date.now();
  if (fav) seed.push({ kind: "raised_favorite", at, value: fav });
  return { name: name?.trim() || FORMS[form].name, form, memorySeed: seed };
}

/** Parse a Meadow backup string. Returns the importable sprite, or null if the
 *  string isn't a valid Meadow backup or holds nothing with an adult form.
 *  Prefers the active pet; falls back to the most recent retiree. */
export function importFromMeadow(code: string): MeadowImport | null {
  let backup: MeadowBackup;
  try {
    backup = JSON.parse(decodeURIComponent(atob(code.trim()))) as MeadowBackup;
  } catch {
    return null;
  }
  if (!backup || typeof backup !== "object" || typeof backup.v !== "number") return null;

  if (backup.pet) {
    const fromPet = toImport(backup.pet.name, backup.pet.form, backup.pet.createdAt, backup.pet.hidden);
    if (fromPet) return fromPet;
  }
  if (Array.isArray(backup.farm)) {
    for (const e of backup.farm) {
      const fromFarm = toImport(e.name, e.form, e.hatchedAt, e.hidden);
      if (fromFarm) return fromFarm;
    }
  }
  return null;
}
