import { generateImageLink } from "./images.ts";
import { MODULE_NAME } from "./constants.ts";
import { isComplexHazard, toSuperScript } from "./helpers.ts";

import abbreviate from "abbreviate";
import { AbbreviateOptions } from "abbreviate";
import {
    ActorPF2e,
    EncounterPF2e,
    EnfolderableDocumentPF2e,
    HazardPF2e,
    NPCPF2e,
    NPCStrike,
} from "foundry-pf2e";
import { tsvFormat } from "d3-dsv";

type SageNpcRecord = Record<string, number | string>;
type NPCTraits = { name: string; label: string };
type AdditionalEffect = { tag: string; label: string };

function getDescription(strike: NPCStrike, suffix?: string): string {
    let content = "";

    content += game.i18n.localize(strike.label);
    content += suffix ? suffix : "";

    if (strike.traits.length === 0) return content;

    content += toSuperScript(" (");
    strike.traits.forEach((t: NPCTraits, key: number, arr: NPCTraits[]) => {
        if (t.name === "attack") return;
        content += toSuperScript(t.label);
        if (!Object.is(arr.length - 1, key)) {
            content += toSuperScript(", ");
        }
    });
    content += toSuperScript(")");

    return content;
}

function getDamage(strike: NPCStrike, overrideDie?: string): string {
    const bd = strike.item.baseDamage;
    let content = "";

    content += bd.dice + ((overrideDie ? overrideDie : bd.die) ?? "");
    content += bd.modifier ? "+" + bd.modifier : "";
    content += bd.damageType === "untyped" ? "" : " " + bd.damageType;

    if (strike.additionalEffects.length > 0) {
        content += " (";
        strike.additionalEffects.forEach(
            (e: AdditionalEffect, index: number, arr: AdditionalEffect[]) => {
                content += game.i18n.localize(e.label);
                if (!Object.is(arr.length - 1, index)) {
                    content += ", ";
                }
            },
        );
        content += ")";
    }

    return content;
}

function spoilers(content: string | number): string {
    return "||" + content + "||";
}

function getAbilities(actor: NPCPF2e, record: SageNpcRecord): SageNpcRecord {
    const abilities = ["cha", "con", "dex", "int", "str", "wis"];

    abilities.forEach((a) => {
        const fullName = game.i18n
            .localize(CONFIG.PF2E.abilities[a])
            .toLowerCase();
        const mod = actor.abilities ? actor.abilities[a].mod : 0;
        record[a] = mod;
        record[fullName] = mod;
    });

    return record;
}

function getSaves(
    actor: HazardPF2e | NPCPF2e,
    record: SageNpcRecord,
): SageNpcRecord {
    if (Object.keys(actor.saves).length === 0) return record;

    const saves = [
        { full: "fortitude", alias: "fort" },
        { full: "reflex", alias: "ref" },
        { full: "will", alias: null },
    ];

    saves.forEach((s) => {
        const mod = actor.saves[s.full].mod;
        const dc = actor.saves[s.full].dc.value;
        record[s.full] = mod;
        if (s.alias) record[s.alias] = mod;
        record["dc." + s.full] = spoilers(dc);
        if (s.alias) record["dc." + s.alias] = spoilers(dc);
    });

    return record;
}

function getSkills(actor: NPCPF2e, record: SageNpcRecord): SageNpcRecord {
    const skills = [
        "acrobatics",
        "arcana",
        "athletics",
        "crafting",
        "deception",
        "diplomacy",
        "intimidation",
        "medicine",
        "nature",
        "occultism",
        "performance",
        "religion",
        "society",
        "stealth",
        "survival",
        "thievery",
    ];

    skills.forEach((s) => {
        const mod = actor.skills[s].mod;
        record[s] = mod;
        record["dc." + s] = spoilers(10 + mod);
    });

    return record;
}

function getStrikeStats(
    s: NPCStrike,
    index: number,
    record: SageNpcRecord,
): SageNpcRecord {
    const type = s.item.isMelee ? "melee" : "ranged";
    if (index === 0) {
        record[type + ".default"] = s.totalModifier;
        record[type + ".default.desc"] = getDescription(s);
        record[type + ".default.damage"] = getDamage(s);
    }
    record[type + "." + s.slug] = s.totalModifier;
    record[type + "." + s.slug + ".desc"] = getDescription(s);
    record[type + "." + s.slug + ".damage"] = getDamage(s);

    const twoHandTraits = {
        "two-hand-d6": "d6",
        "two-hand-d8": "d8",
        "two-hand-d10": "d10",
        "two-hand-d12": "d12",
    };
    const twoHandTrait = Object.keys(twoHandTraits).find((e) =>
        s.traits.map((t) => t.name).includes(e),
    );
    // If the strike has a two-hand trait, add a second entry for the two-hand damage
    if (twoHandTrait) {
        record[type + "." + s.slug + "2h"] = s.totalModifier;
        record[type + "." + s.slug + "2h.desc"] = getDescription(
            s,
            " (Two Hand)",
        );
        record[type + "." + s.slug + "2h.damage"] = getDamage(
            s,
            twoHandTraits[twoHandTrait],
        );
    }
    return record;
}

function getStrikes(actor: NPCPF2e, record: SageNpcRecord): SageNpcRecord {
    if (!actor) return record;

    const strikes =
        actor?.system?.actions?.filter((a) => a.type === "strike") ?? [];

    strikes
        .filter((s) => s.item.isMelee)
        .forEach((s, index) => (record = getStrikeStats(s, index, record)));
    strikes
        .filter((s) => !s.item.isMelee)
        .forEach((s, index) => (record = getStrikeStats(s, index, record)));

    return record;
}

function getHazardStats(
    actor: HazardPF2e,
    record: SageNpcRecord,
): SageNpcRecord {
    if (actor.hasDefenses) {
        if (actor?.armorClass?.value) {
            record["ac"] = spoilers(actor.armorClass.value);
        }
        record["hardness"] = actor.hardness;
        if (actor?.hitPoints?.value) {
            record["hp"] = actor.hitPoints.value;
            record["hpmax"] = actor.hitPoints.max;
        }
    }
    record["stealth"] = actor.system.attributes.stealth.value || 0;
    record["dc.stealth"] = spoilers(actor.system.attributes.stealth.dc || 0);
    record = getSaves(actor, record);

    return record;
}

function getNpcStats(actor: NPCPF2e, record: SageNpcRecord): SageNpcRecord {
    record["ac"] = spoilers(actor.armorClass.value);
    record["hp"] = actor.hitPoints.value;
    record["hpmax"] = actor.hitPoints.max;
    record["perception"] = actor.perception.mod;
    record["perc"] = actor.perception.mod;
    record = getAbilities(actor, record);
    record = getSaves(actor, record);
    record = getSkills(actor, record);
    record = getStrikes(actor, record);

    return record;
}

async function createSageNpc(
    actor: HazardPF2e | NPCPF2e,
    name: string,
    record: SageNpcRecord,
): Promise<SageNpcRecord> {
    const options: AbbreviateOptions = {
        length: game.settings.get(MODULE_NAME, "abbr-length"),
        strict: game.settings.get(MODULE_NAME, "abbr-strict"),
    };
    const alias = abbreviate(name, options).toLowerCase();

    record["type"] = "npc";
    record["name"] = name;
    record["charname"] = "";
    record["alias"] = alias;
    record["avatar"] = await generateImageLink(actor.img);
    record["color"] = "";
    const tokenSrc = actor.prototypeToken.texture.src ?? "";
    record["token"] = await generateImageLink(tokenSrc);
    record["level"] = actor.level;
    record["lvl"] = actor.level;

    if (actor.type === "npc") {
        record = getNpcStats(actor as NPCPF2e, record);
    } else if (actor.type === "hazard") {
        record = getHazardStats(actor as HazardPF2e, record);
    }

    return record;
}

async function createSceneSageNpcs(scene: Scene): Promise<SageNpcRecord[]> {
    const npcs: SageNpcRecord[] = [];

    const npcTokens = scene.tokens.filter(
        (t) =>
            (t && (t.actor as ActorPF2e)?.type === "npc") ||
            isComplexHazard(t.actor as ActorPF2e),
    );

    for (const token of npcTokens) {
        if (token) {
            let record: SageNpcRecord = {};
            const actor = isComplexHazard(token.actor as ActorPF2e)
                ? (token.actor as HazardPF2e)
                : (token.actor as NPCPF2e);
            record = await createSageNpc(actor, token.name, record);
            npcs.push(record);
        }
    }

    return npcs;
}

export async function createNpcTsv(actor: ActorPF2e): Promise<string> {
    let record = {};
    const name =
        actor.isToken && actor?.token?.name ? actor.token.name : actor.name;

    record = await createSageNpc(actor as NPCPF2e, name, record);

    console.log(record);
    return tsvFormat([record]);
}

export async function createEncounterNpcsTsv(
    encounter: EncounterPF2e,
): Promise<string> {
    const npcs: SageNpcRecord[] = [];

    for (const c of encounter.combatants) {
        const actor = c.actor;
        if (!actor) continue;

        if (actor?.type === "npc") {
            npcs.push(await createSageNpc(actor as NPCPF2e, c.name, {}));
        } else if (isComplexHazard(actor)) {
            npcs.push(await createSageNpc(actor as HazardPF2e, c.name, {}));
        }
    }

    return tsvFormat(npcs);
}

export async function createFolderNpcsTsv(folder: Folder): Promise<string> {
    const npcs: SageNpcRecord[] = [];

    const actors = folder
        .getSubfolders(true)
        .flatMap((f) => f.contents)
        .concat(folder.contents);

    for (const ad of actors) {
        const actor = ad as EnfolderableDocumentPF2e as ActorPF2e;
        if (actor?.type === "npc") {
            npcs.push(await createSageNpc(actor as NPCPF2e, actor.name, {}));
        } else if (isComplexHazard(actor)) {
            npcs.push(await createSageNpc(actor as HazardPF2e, actor.name, {}));
        }
    }

    return tsvFormat(npcs);
}

export async function createSceneNpcsTsv(scene: Scene): Promise<string> {
    const npcs = await createSceneSageNpcs(scene);

    return tsvFormat(npcs);
}
