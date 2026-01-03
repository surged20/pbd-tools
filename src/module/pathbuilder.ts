import {
    ArmorPF2e,
    CharacterPF2e,
    EquipmentPF2e,
    FeatPF2e,
    ItemPF2e,
    LorePF2e,
    Language,
    SenseData,
    SpellcastingEntryPF2e,
    WeaponPF2e,
} from "foundry-pf2e";
import type {
    Pathbuilder,
    PathbuilderBuild,
    PathbuilderWeapon,
    PathbuilderMoney,
    PathbuilderArmor,
    PathbuilderArmorClass,
    PathbuilderFamiliar,
    PathbuilderFormula,
    PathbuilderFocus,
    PathbuilderSpellcaster,
    PathbuilderSpellList,
} from "./pathbuilder-types.ts";
import { WEAPON_PROPERTY_RUNES } from "./runes.ts";

const sizeValues = {
    tiny: 0,
    sm: 1,
    med: 2,
    lg: 3,
    huge: 4,
    grg: 5,
};

const categoryName = {
    ancestry: "Ancestry Feat",
    class: "Class Feat",
    general: "General Feat",
    heritage: "Heritage",
    skill: "Skill Feat",
};

const profRankValues = [0, 2, 4, 6, 8];

interface CreatureLanguagesData {
    value: Language[];
    details: string;
}

function getAbilityScore(actor: CharacterPF2e, ability: string): number {
    return 10 + actor.abilities[ability].mod + actor.abilities[ability].base;
}

function getCastingProficiency(
    actor: CharacterPF2e,
    tradition: string,
): number {
    const entry = actor.spellcasting.regular.find(
        (se: SpellcastingEntryPF2e) =>
            (se.isPrepared || se.isSpontaneous) && se.tradition === tradition,
    );
    return entry && entry.system
        ? profRankValues[entry.system?.proficiency.value]
        : 0;
}

function getClassDCRank(actor: CharacterPF2e): number {
    if (!actor.class || !actor.classDCs || !actor.class.system.slug) return 0;
    return actor.classDCs[actor.class.system.slug].rank as number;
}

function getLanguages(languages: CreatureLanguagesData): string[] {
    const pbLanguages: string[] = [];
    languages.value.forEach((slug: Language) =>
        pbLanguages.push(game.i18n.localize(CONFIG.PF2E.languages[slug])),
    );
    return pbLanguages;
}

function getRituals(actor: CharacterPF2e): string[] {
    const rituals: string[] = [];
    actor.spellcasting.collections.forEach((c) => {
        if (c.entry.category !== "ritual") return;
        c.entry.spells?.forEach((spell: ItemPF2e) => rituals.push(spell.name));
    });
    return rituals;
}

function getFeats(actor: CharacterPF2e): [string, null, string, number][] {
    const feats: [string, null, string, number][] = [];
    actor.items.forEach((item: ItemPF2e) => {
        if (
            (item.type === "feat" &&
                (item as FeatPF2e).category !== "classfeature") ||
            item.type === "heritage"
        ) {
            feats.push([
                item.name,
                null,
                categoryName[
                    item.type === "heritage"
                        ? "heritage"
                        : (item as FeatPF2e).category
                ],
                1,
            ]);
        }
    });
    return feats;
}

type LabeledSenseData = Required<SenseData> & {
    label: string | null;
};

function getSpecials(actor: CharacterPF2e): string[] {
    const specials: string[] = [];
    actor.items.forEach((item: ItemPF2e) => {
        if (
            (item.type === "feat" &&
                (item as FeatPF2e).category === "classfeature") ||
            item.type === "heritage"
        ) {
            specials.push(item.name);
        }
    });
    actor.system.perception.senses.forEach((sense: LabeledSenseData) => {
        if (sense.label) {
            specials.push(sense.label);
        }
    });
    return specials;
}

function getLores(actor: CharacterPF2e): [string, number][] {
    const lores: [string, number][] = [];
    actor.items.forEach((item: ItemPF2e) => {
        if (item.type === "lore") {
            lores.push([
                item.name,
                profRankValues[(item as LorePF2e).system.proficient.value],
            ]);
        }
    });
    return lores;
}

function getEquipment(actor: CharacterPF2e): [string, number, string][] {
    const equipment: [string, number, string][] = [];
    actor.items
        .filter((i) => ["backpack", "consumable", "equipment"].includes(i.type))
        .forEach((item: ItemPF2e) => {
            equipment.push([
                item.name,
                (item as EquipmentPF2e).quantity,
                "Invested",
            ]);
        });

    return equipment;
}

const strikingRunes: string[] = [
    "",
    "striking",
    "greater striking",
    "major striking",
];

const resilientRunes: string[] = [
    "",
    "resilient",
    "greater resilient",
    "major resilient",
];

const damageTypes = {
    bludgeoning: "B",
    piercing: "P",
    slashing: "S",
};

function getMaterial(item: WeaponPF2e | ArmorPF2e): string | null {
    if (item.system.material.type === null) return null;

    let materialString = game.i18n.localize(
        CONFIG.PF2E.preciousMaterials[item.system.material.type],
    );

    if (item.system.material.grade !== null) {
        materialString +=
            " (" +
            game.i18n.localize(
                CONFIG.PF2E.preciousMaterialGrades[item.system.material.grade],
            ) +
            ")";
    }

    return materialString;
}

function getPropertyRunes(item: WeaponPF2e | ArmorPF2e): string[] {
    const runes: string[] = [];
    item.system.runes.property.forEach((rune) =>
        runes.push(game.i18n.localize(`PF2E.WeaponPropertyRune.${rune}.Name`)),
    );
    return runes;
}

function getExtraDamage(item: WeaponPF2e): string[] {
    const extraDamage: string[] = [];
    item.system.runes.property.forEach((rune) => {
        if (rune in WEAPON_PROPERTY_RUNES) {
            const runeData = WEAPON_PROPERTY_RUNES[rune];
            if ("damage" in runeData && "additional" in runeData.damage) {
                runeData.damage.additional.forEach((entry) => {
                    if (
                        "category" in entry === false ||
                        entry.category !== "persistent"
                    ) {
                        extraDamage.push(
                            entry.diceNumber +
                                entry.dieSize +
                                " " +
                                game.i18n.localize(
                                    CONFIG.PF2E.damageTypes[entry.damageType],
                                ),
                        );
                    }
                });
            }
        }
    });
    return extraDamage;
}

/**
 * Returns an array of PathbuilderWeapon objects from a Character actor.
 * @param {CharacterPF2e} actor The actor to get weapons from.
 * @returns {PathbuilderWeapon[]} An array of PathbuilderWeapon objects.
 */
function getWeapons(actor: CharacterPF2e): PathbuilderWeapon[] {
    const weapons: PathbuilderWeapon[] = [];
    actor.system.actions.forEach((action) => {
        if (action.type !== "strike" || action.slug === "basic-unarmed") return;
        const weapon = action.item;
        weapons.push({
            name: weapon.name,
            qty: weapon.quantity,
            prof: weapon.system.category,
            die: weapon.baseDamage.die,
            pot: weapon.system.runes.potency,
            display: weapon.name,
            str: strikingRunes[weapon.system.runes.striking],
            mat: getMaterial(weapon),
            runes: getPropertyRunes(weapon),
            damageType: damageTypes[weapon.system.damage.damageType],
            attack: action.totalModifier,
            damageBonus: 0,
            extraDamage: getExtraDamage(weapon),
            increaseDice: false,
            isInventor: false,
        });
    });
    return weapons;
}

function getArmor(actor: CharacterPF2e): PathbuilderArmor[] {
    const armors: PathbuilderArmor[] = [];
    actor.items.forEach((item: ItemPF2e) => {
        if (item.type === "armor") {
            const armor = item as ArmorPF2e;
            armors.push({
                name: armor.name,
                qty: armor.quantity,
                prof: armor.system.category,
                pot: armor.system.runes.potency,
                res: resilientRunes[armor.system.runes.resilient],
                mat: getMaterial(armor),
                display: armor.name,
                worn: armor.isWorn,
                runes: getPropertyRunes(armor),
            });
        }
    });
    return armors;
}

function getArmorClassModifier(actor: CharacterPF2e, type: string): number {
    const modifiers = actor.system.attributes.ac.modifiers;
    return modifiers.find((m) => m.type === type)?.modifier ?? 0;
}

function getArmorClass(actor: CharacterPF2e): PathbuilderArmorClass {
    return {
        acProfBonus: getArmorClassModifier(actor, "proficiency"),
        acAbilityBonus: getArmorClassModifier(actor, "ability"),
        acItemBonus: getArmorClassModifier(actor, "item"),
        acTotal: actor.system.attributes.ac.value,
        shieldBonus: actor.system.attributes.shield.ac ?? null,
    };
}

function getSpellCasters(actor: CharacterPF2e): PathbuilderSpellcaster[] {
    const spellcasters: PathbuilderSpellcaster[] = [];

    actor.spellcasting.regular.forEach((se) => {
        if (["innate", "prepared", "spontaneous"].includes(se.category)) {
            if (!se || !se.system) return;
            const caster = {} as PathbuilderSpellcaster;
            caster["name"] = se.name;
            caster["magicTradition"] = se.tradition as string;
            caster["spellcastingType"] = se.category as string;
            caster["ability"] = se.attribute as string;
            caster["proficiency"] = profRankValues[se.system.proficiency.value];
            caster["focusPoints"] = 0;
            caster["innate"] = se.isInnate;

            const slots = Object.values(se.system.slots);
            const perDay: number[] = [];
            slots.forEach((slot) => perDay.push(slot.max));
            const spells: PathbuilderSpellList[] = [];
            const prepared: PathbuilderSpellList[] = [];
            for (let slot = 0; slot < se.highestRank + 1; slot++) {
                spells.push({ spellLevel: slot, list: [] as string[] });
                if (se.category === "prepared") {
                    prepared.push({ spellLevel: slot, list: [] as string[] });
                    slots[slot].prepared.forEach((p) => {
                        if (p.id && se.spells) {
                            const spell = se.spells.get(p.id);
                            if (spell) {
                                prepared[slot].list.push(spell.name);
                            }
                        }
                    });
                }
            }
            se.spells?.forEach((s) => {
                // Innate and spontaneous cantrips need to be counted in perDay[0]
                if (
                    ["innate", "spontaneous"].includes(se.category) &&
                    s.isCantrip
                )
                    perDay[0] += 1;
                const rank = s.isCantrip ? 0 : s.rank;
                spells[rank].list.push(s.name);
            });

            caster["perDay"] = perDay;
            caster["spells"] = spells;
            caster["prepared"] = prepared;

            spellcasters.push(caster);
        }
    });

    return spellcasters;
}

function getFocus(actor: CharacterPF2e): PathbuilderFocus {
    let focus = {};
    const focusColl = actor.spellcasting.collections.find(
        (c) => c.entry.category === "focus",
    );
    if (focusColl && focusColl.entry) {
        const entry = focusColl.entry;
        const tradition = entry.tradition as string;
        const attribute = entry.attribute as string;
        const abilityBonus = entry.statistic?.attributeModifier?.modifier ?? 0;
        const proficiency = profRankValues[entry.statistic?.rank ?? 0];
        const focusCantrips: string[] = [];
        const focusSpells: string[] = [];
        entry.spells?.forEach((s) => {
            if (s.isCantrip) focusCantrips.push(s.name);
            else focusSpells.push(s.name);
        });
        focus = {
            [tradition]: {
                [attribute]: {
                    abilityBonus: abilityBonus,
                    proficiency: proficiency,
                    itemBonus: 0,
                    focusCantrips: focusCantrips,
                    focusSpells: focusSpells,
                },
            },
        };
    }
    return focus;
}

function getFormulas(actor: CharacterPF2e): PathbuilderFormula[] {
    const formulas: PathbuilderFormula[] = [];
    if (actor.system.crafting.formulas.length > 0) {
        formulas.push({
            type: actor.class?.name ?? "other",
            known: actor.system.crafting.formulas
                .map((f) => fromUuidSync(f.uuid)?.name ?? "")
                .filter((n) => !!n),
        });
    }
    return formulas;
}

function getFamiliars(actor: CharacterPF2e): PathbuilderFamiliar[] {
    const familiar = actor.familiar;
    if (!familiar) return [];

    const abilities = familiar.items
        .filter((i) => i.type === "action")
        .map((i) => i.name);
    return [
        {
            type: "Familiar",
            name: familiar.name,
            equipment: [],
            specific: null,
            abilities,
        },
    ];
}

export function createPathbuilderJson(actor: CharacterPF2e): string {
    if (
        !actor ||
        !actor.class ||
        !actor.classDC ||
        !actor.ancestry ||
        !actor.heritage ||
        !actor.background
    )
        return "";

    const details = actor.system.details;
    const attributes = actor.system.attributes;
    const movement = (
        actor.system as unknown as {
            movement?: {
                speeds?: { land?: { value?: number; totalModifier?: number } };
            };
        }
    ).movement;
    const saves = actor.system.saves;
    const profs = actor.system.proficiencies;
    const skills = actor.system.skills;

    const build: PathbuilderBuild = {
        name: actor.name,
        class: actor.class.name,
        dualClass: null,
        level: actor.level,
        ancestry: actor.ancestry.name,
        heritage: actor.heritage.name,
        background: actor.background.name,
        gender: details.gender.value,
        age: details.age.value,
        deity: actor.deity ? actor.deity.name : "Not set",
        size: sizeValues[actor.size],
        sizeName: game.i18n.localize(CONFIG.PF2E.actorSizes[actor.size]),
        keyability: actor.keyAttribute,
        languages: getLanguages(details.languages),
        rituals: getRituals(actor),
        resistances: [],
        inventorMods: [],
        attributes: {
            ancestryhp: attributes.ancestryhp,
            classhp: attributes.classhp,
            bonushp: 0, // TODO
            bonushpPerLevel: 0, // TODO
            speed: movement?.speeds?.land?.value || 0,
            speedBonus: movement?.speeds?.land?.totalModifier || 0,
        },
        abilities: {
            str: getAbilityScore(actor, "str"),
            dex: getAbilityScore(actor, "dex"),
            con: getAbilityScore(actor, "con"),
            int: getAbilityScore(actor, "int"),
            wis: getAbilityScore(actor, "wis"),
            cha: getAbilityScore(actor, "cha"),
        },
        proficiencies: {
            classDC: profRankValues[getClassDCRank(actor)],
            perception: profRankValues[actor.system.perception.rank],
            fortitude: profRankValues[saves.fortitude.rank],
            reflex: profRankValues[saves.reflex.rank],
            will: profRankValues[saves.will.rank],
            heavy: profRankValues[profs.defenses.heavy.rank],
            medium: profRankValues[profs.defenses.medium.rank],
            light: profRankValues[profs.defenses.light.rank],
            unarmored: profRankValues[profs.defenses.unarmored.rank],
            advanced: profRankValues[profs.attacks.advanced.rank],
            martial: profRankValues[profs.attacks.martial.rank],
            simple: profRankValues[profs.attacks.simple.rank],
            unarmed: profRankValues[profs.attacks.unarmed.rank],
            castingArcane: getCastingProficiency(actor, "arcane"),
            castingDivine: getCastingProficiency(actor, "divine"),
            castingOccult: getCastingProficiency(actor, "occult"),
            castingPrimal: getCastingProficiency(actor, "primal"),
            acrobatics: profRankValues[skills.acrobatics.rank],
            arcana: profRankValues[skills.arcana.rank],
            athletics: profRankValues[skills.athletics.rank],
            computers: profRankValues[skills?.computers?.rank],
            crafting: profRankValues[skills.crafting.rank],
            deception: profRankValues[skills.deception.rank],
            diplomacy: profRankValues[skills.diplomacy.rank],
            intimidation: profRankValues[skills.intimidation.rank],
            medicine: profRankValues[skills.medicine.rank],
            nature: profRankValues[skills.nature.rank],
            occultism: profRankValues[skills.occultism.rank],
            performance: profRankValues[skills.performance.rank],
            piloting: profRankValues[skills?.piloting?.rank],
            religion: profRankValues[skills.religion.rank],
            society: profRankValues[skills.society.rank],
            stealth: profRankValues[skills.stealth.rank],
            survival: profRankValues[skills.survival.rank],
            thievery: profRankValues[skills.thievery.rank],
        },
        mods: {},
        feats: getFeats(actor),
        specials: getSpecials(actor),
        lores: getLores(actor),
        equipment: getEquipment(actor),
        weapons: getWeapons(actor),
        money: actor.inventory.coins as PathbuilderMoney,
        armor: getArmor(actor),
        spellCasters: getSpellCasters(actor),
        focusPoints: actor.system.resources.focus.value,
        focus: getFocus(actor),
        formula: getFormulas(actor),
        acTotal: getArmorClass(actor),
        pets: [],
        familiars: getFamiliars(actor),
    };
    const data: Pathbuilder = { success: true, build: build };

    return JSON.stringify(data);
}
