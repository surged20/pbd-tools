export interface PathbuilderAttributes {
    ancestryhp: number;
    classhp: number;
    bonushp: number;
    bonushpPerLevel: number;
    speed: number;
    speedBonus: number;
}

export interface PathbuilderAbilities {
    str: number;
    dex: number;
    con: number;
    int: number;
    wis: number;
    cha: number;
}

export interface PathbuilderProficiencies {
    classDC: number;
    perception: number;
    fortitude: number;
    reflex: number;
    will: number;
    heavy: number;
    medium: number;
    light: number;
    unarmored: number;
    advanced: number;
    martial: number;
    simple: number;
    unarmed: number;
    castingArcane: number;
    castingDivine: number;
    castingOccult: number;
    castingPrimal: number;
    acrobatics: number;
    arcana: number;
    athletics: number;
    crafting: number;
    deception: number;
    diplomacy: number;
    intimidation: number;
    medicine: number;
    nature: number;
    occultism: number;
    performance: number;
    religion: number;
    society: number;
    stealth: number;
    survival: number;
    thievery: number;
}

export interface PathbuilderWeapon {
    name: string;
    qty: number;
    prof: string;
    die: string | null;
    pot: number;
    str: string;
    mat: string | null;
    display: string;
    runes: string[];
    damageType: string;
    attack: number;
    damageBonus: number;
    extraDamage: string[];
    increaseDice: boolean;
    isInventor: boolean;
}

export interface PathbuilderMoney {
    cp: number;
    sp: number;
    gp: number;
    pp: number;
}

export interface PathbuilderArmor {
    name: string;
    qty: number;
    prof: string;
    pot: number;
    res: string;
    mat: string | null;
    display: string;
    worn: boolean;
    runes: string[];
}

export interface PathbuilderArmorClass {
    acProfBonus: number;
    acAbilityBonus: number;
    acItemBonus: number;
    acTotal: number;
    shieldBonus: number;
}

export interface PathbuilderSpellList {
    spellLevel: number;
    list: string[];
}

export interface PathbuilderSpellcaster {
    name: string;
    magicTradition: string;
    spellcastingType: string;
    ability: string;
    proficiency: number;
    focusPoints: number;
    innate: boolean;
    perDay: number[];
    spells: PathbuilderSpellList[];
    prepared: PathbuilderSpellList[];
    blendedSpells: PathbuilderSpellList[];
}

export interface PathbuilderFocus {
    [type: string]: {
        [ability: string]: {
            abilityBonus: number;
            proficiency: number;
            itemBonus: number;
            focusCantrips: string[];
            focusSpells: string[];
        };
    };
}

export interface PathbuilderFormula {
    type: string;
    known: string[];
}

export interface PathbuilderFamiliar {
    type: string;
    name: string;
    equipment: [string, number, string][];
    specific: null;
    abilities: string[];
}

export interface PathbuilderBuild {
    name: string;
    class: string;
    dualClass: string | null;
    level: number;
    ancestry: string;
    heritage: string;
    background: string;
    gender: string;
    age: string;
    deity: string;
    size: number;
    sizeName: string;
    keyability: string;
    languages: string[];
    rituals: string[];
    resistances: [];
    inventorMods: [];
    attributes: PathbuilderAttributes;
    abilities: PathbuilderAbilities;
    proficiencies: PathbuilderProficiencies;
    mods: {};
    feats: [string, null, string, number][];
    specials: string[];
    lores: [string, number][];
    equipment: [string, number, string][];
    weapons: PathbuilderWeapon[];
    money: PathbuilderMoney;
    armor: PathbuilderArmor[];
    spellCasters: PathbuilderSpellcaster[];
    focusPoints: number;
    focus: PathbuilderFocus;
    formula: PathbuilderFormula[];
    acTotal: PathbuilderArmorClass;
    pets: [];
    familiars: PathbuilderFamiliar[];
}

export interface Pathbuilder {
    success: boolean;
    build: PathbuilderBuild;
}
