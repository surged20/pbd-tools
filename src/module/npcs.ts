import type { ActorPF2e, CharacterPF2e, HazardPF2e, NPCPF2e } from "foundry-pf2e";
import abbreviate from "abbreviate";
import { tsvFormat } from "d3-dsv";

import type { AbbreviateOptions } from "abbreviate";
import { MODULE_NAME } from "./constants.ts";
import { ActorAliasDialog, ActorAliasData } from "./actor-alias-dialog.ts";
import { generateImageLink } from "./images.ts";
import { isComplexHazard, isComplexHazardOrNpc } from "./helpers.ts";

type SageNpcRecord = Record<string, number | string>;

function spoilers(value) {
    return game.settings.get(MODULE_NAME, "spoiler-stats")
        ? `||${value}||`
        : value;
}

function getAbilities(
    actor: NPCPF2e,
    record: SageNpcRecord,
): SageNpcRecord {
    record["str"] = spoilers(actor.system.abilities.str.mod);
    record["dex"] = spoilers(actor.system.abilities.dex.mod);
    record["con"] = spoilers(actor.system.abilities.con.mod);
    record["int"] = spoilers(actor.system.abilities.int.mod);
    record["wis"] = spoilers(actor.system.abilities.wis.mod);
    record["cha"] = spoilers(actor.system.abilities.cha.mod);
    return record;
}

function getSaves(
    actor: HazardPF2e | NPCPF2e,
    record: SageNpcRecord,
): SageNpcRecord {
    record["fort"] = spoilers(actor.system.saves.fortitude.value);
    record["ref"] = spoilers(actor.system.saves.reflex.value);
    record["will"] = spoilers(actor.system.saves.will.value);

    return record;
}

function getSkills(
    actor: NPCPF2e,
    record: SageNpcRecord,
): SageNpcRecord {
    let skills = "";
    const lores = actor.itemTypes.lore || [];
    const skillList = [
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

    for (const lore of lores) {
        const skill = lore.name.toLowerCase().replace(" lore", "");
        const mod = lore.system.mod.value;
        const loreString = `**${skill}** +${mod}`;
        skills += skills === "" ? loreString : "; " + loreString;
    }

    for (const skill of skillList) {
        const mod = actor.system.skills[skill]?.value || 0;
        if (mod > 0) {
            const skillString = `**${skill}** ${mod > 0 ? "+" : ""}${mod}`;
            skills += skills === "" ? skillString : "; " + skillString;
        }
    }

    record["skills"] = spoilers(skills);

    return record;
}

function getStrikes(
    actor: NPCPF2e,
    record: SageNpcRecord,
): SageNpcRecord {
    let attacks = "";
    const strikes = [...(actor.itemTypes.melee || [])];
    for (const strike of strikes) {
        if (!strike?.system) continue;
        const name = strike.name;
        const bonus = spoilers(strike.system.bonus.value);
        const traits = strike.system.traits.value;
        let traitsString = "";
        if (traits.length > 0) {
            traitsString = " (" + traits.join(", ") + ")";
        }
        const damage = spoilers(strike.system.damageRolls);
        let dmgString = "";
        for (const key of Object.keys(damage)) {
            const dmg = damage[key];
            const dmgBonus = dmg.damage;
            const dmgType = dmg.damageType || "";
            const dmgCritical = dmg.critical || "";
            const critString = dmgCritical !== "" ? " plus " + dmgCritical : "";
            dmgString += `${dmgBonus} ${dmgType}${critString}`;
        }
        const attackString = `**${name}** ${bonus}${traitsString} **Damage** ${dmgString}`;

        attacks += attacks === "" ? attackString : "; " + attackString;
    }
    record["attacks"] = attacks;
    return record;
}

export function generateDefaultAlias(name: string): string {
    const options: AbbreviateOptions = {
        length: game.settings.get(MODULE_NAME, "abbr-length") as number,
        strict: game.settings.get(MODULE_NAME, "abbr-strict") as boolean,
    };
    return abbreviate(name, options).toLowerCase();
}

export async function getActorAlias(actor: ActorPF2e): Promise<string | undefined> {
    try {
        return actor.getFlag("pbd-tools", "alias") as string | undefined;
    } catch (error) {
        console.warn("[PBD-Tools] Failed to get actor alias flag:", error);
        return undefined;
    }
}

export async function setActorAlias(actor: ActorPF2e, alias: string): Promise<void> {
    try {
        await actor.setFlag("pbd-tools", "alias", alias);
    } catch (error) {
        console.warn("[PBD-Tools] Failed to set actor alias flag:", error);
        throw error;
    }
}

function getHazardStats(actor: HazardPF2e, record: SageNpcRecord): SageNpcRecord {
    if (actor.system.attributes.ac) {
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
    aliasOverride?: string,
): Promise<SageNpcRecord> {
    const options: AbbreviateOptions = {
        length: game.settings.get(MODULE_NAME, "abbr-length") as number,
        strict: game.settings.get(MODULE_NAME, "abbr-strict") as boolean,
    };
    const defaultAlias = abbreviate(name, options).toLowerCase();
    const alias = aliasOverride || defaultAlias;

    record["type"] = "npc";
    record["name"] = name;
    record["charname"] = "";
    record["alias"] = alias;
    record["avatar"] = await generateImageLink(actor.img);
    record["color"] = "";
    const tokenSrc = actor.prototypeToken.texture.src ?? "";
    record["tokenImage"] = tokenSrc
        ? await generateImageLink(tokenSrc)
        : record["avatar"];

    if (isComplexHazard(actor)) {
        record = getHazardStats(actor as HazardPF2e, record);
    } else {
        record = getNpcStats(actor as NPCPF2e, record);
    }

    return record;
}

export async function createNpcTsvWithDialog(
    actor: HazardPF2e | NPCPF2e,
): Promise<string> {
    try {
        // Get stored alias or generate default
        const storedAlias = await getActorAlias(actor);
        const defaultAlias = generateDefaultAlias(actor.name);
        const currentAlias = storedAlias || defaultAlias;

        // Create actor data for dialog
        const actorData: ActorAliasData = {
            name: actor.name,
            originalAlias: currentAlias,
            actor: actor,
        };

        // Show the dialog
        const dialogResult = await ActorAliasDialog.showDialog({
            title: `Edit Actor Alias - ${actor.name}`,
            actors: [actorData],
            onConfirm: (actors) => actors,
        });

        // Get the final alias
        const finalAlias = dialogResult[0].editedAlias || dialogResult[0].originalAlias;

        // Save the alias if it was changed
        if (dialogResult[0].editedAlias) {
            await setActorAlias(actor, finalAlias);
        }

        // Generate TSV
        const npcs: SageNpcRecord[] = [];
        if (isComplexHazard(actor)) {
            npcs.push(
                await createSageNpc(
                    actor as HazardPF2e,
                    actor.name,
                    {},
                    finalAlias,
                ),
            );
        } else {
            npcs.push(
                await createSageNpc(
                    actor as NPCPF2e,
                    actor.name,
                    {},
                    finalAlias,
                ),
            );
        }

        return tsvFormat(npcs);
    } catch (error) {
        // User cancelled dialog
        throw new Error("Export cancelled");
    }
}

export async function createEncounterNpcsTsvWithDialog(
    encounter: any,
): Promise<string> {
    const actorDataList: ActorAliasData[] = [];

    if (!encounter?.turns || encounter.turns.length === 0) {
        throw new Error("No combatants found in encounter");
    }

    // Collect all complex NPCs/Hazards from the encounter
    for (const turn of encounter.turns) {
        const actor = turn.actor;
        if (isComplexHazardOrNpc(actor)) {
            // Get stored alias or generate default
            const storedAlias = await getActorAlias(actor);
            const defaultAlias = generateDefaultAlias(actor.name);
            const currentAlias = storedAlias || defaultAlias;

            actorDataList.push({
                name: actor.name,
                originalAlias: currentAlias,
                actor: actor,
            });
        }
    }

    if (actorDataList.length === 0) {
        throw new Error("No NPCs or Hazards found in encounter");
    }

    try {
        // Show dialog for all actors
        const dialogResult = await ActorAliasDialog.showDialog({
            title: `Edit Actor Aliases - ${encounter.name || "Encounter"}`,
            actors: actorDataList,
            onConfirm: (actors) => actors,
        });

        // Generate the TSV with the edited aliases
        const npcs: SageNpcRecord[] = [];
        for (const actorItem of dialogResult) {
            const finalAlias = actorItem.editedAlias || actorItem.originalAlias;
            const actor = actorItem.actor;

            // Save the alias if it was changed
            if (actorItem.editedAlias) {
                await setActorAlias(actor, finalAlias);
            }

            if (isComplexHazard(actor)) {
                npcs.push(
                    await createSageNpc(
                        actor as HazardPF2e,
                        actor.name,
                        {},
                        finalAlias,
                    ),
                );
            } else {
                npcs.push(
                    await createSageNpc(
                        actor as NPCPF2e,
                        actor.name,
                        {},
                        finalAlias,
                    ),
                );
            }
        }

        return tsvFormat(npcs);
    } catch (error) {
        // User cancelled dialog
        throw new Error("Export cancelled");
    }
}

export async function createFolderNpcsTsvWithDialog(
    folder: any,
): Promise<string> {
    const actorDataList: ActorAliasData[] = [];

    // Recursively collect all actors from folder and subfolders
    function collectActors(currentFolder: any) {
        // Add actors from current folder
        for (const actor of currentFolder.contents) {
            if (isComplexHazardOrNpc(actor)) {
                actorDataList.push({
                    name: actor.name,
                    originalAlias: "",
                    actor: actor,
                });
            }
        }

        // Recursively process subfolders
        for (const subfolder of currentFolder.children || []) {
            collectActors(subfolder);
        }
    }

    collectActors(folder);

    // Get stored aliases for all actors
    for (const actorData of actorDataList) {
        const storedAlias = await getActorAlias(actorData.actor);
        const defaultAlias = generateDefaultAlias(actorData.name);
        actorData.originalAlias = storedAlias || defaultAlias;
    }

    if (actorDataList.length === 0) {
        throw new Error("No NPCs or Hazards found in folder");
    }

    try {
        // Show dialog for all actors
        const dialogResult = await ActorAliasDialog.showDialog({
            title: `Edit Actor Aliases - ${folder.name}`,
            actors: actorDataList,
            onConfirm: (actors) => actors,
        });

        // Generate the TSV with the edited aliases
        const npcs: SageNpcRecord[] = [];
        for (const actorItem of dialogResult) {
            const finalAlias = actorItem.editedAlias || actorItem.originalAlias;
            const actor = actorItem.actor;

            // Save the alias if it was changed
            if (actorItem.editedAlias) {
                await setActorAlias(actor, finalAlias);
            }

            if (isComplexHazard(actor)) {
                npcs.push(
                    await createSageNpc(
                        actor as HazardPF2e,
                        actor.name,
                        {},
                        finalAlias,
                    ),
                );
            } else {
                npcs.push(
                    await createSageNpc(
                        actor as NPCPF2e,
                        actor.name,
                        {},
                        finalAlias,
                    ),
                );
            }
        }

        return tsvFormat(npcs);
    } catch (error) {
        // User cancelled dialog
        throw new Error("Export cancelled");
    }
}

export async function createSceneNpcsTsvWithDialog(
    scene: any,
): Promise<string> {
    const actorDataList: ActorAliasData[] = [];
    const npcTokens: any[] = [];

    // Collect all NPC/Hazard tokens from the scene
    for (const token of scene.tokens) {
        const actor = token.actor;
        if (isComplexHazardOrNpc(actor)) {
            npcTokens.push(token);

            // Get stored alias or generate default
            const storedAlias = await getActorAlias(actor);
            const defaultAlias = generateDefaultAlias(token.name);
            const currentAlias = storedAlias || defaultAlias;

            actorDataList.push({
                name: token.name,
                originalAlias: currentAlias,
                actor: actor,
            });
        }
    }

    if (actorDataList.length === 0) {
        throw new Error("No NPCs or Hazards found in scene");
    }

    try {
        // Show dialog for all actors
        const dialogResult = await ActorAliasDialog.showDialog({
            title: `Edit Actor Aliases - ${scene.name}`,
            actors: actorDataList,
            onConfirm: (actors) => actors,
        });

        // Generate the TSV with the edited aliases
        const npcs: SageNpcRecord[] = [];
        for (const actorData of dialogResult) {
            const finalAlias = actorData.editedAlias || actorData.originalAlias;
            const actor = actorData.actor;
            const token = npcTokens.find((t) => t?.name === actorData.name);

            // Save the alias if it was changed
            if (actorData.editedAlias) {
                await setActorAlias(actor, finalAlias);
            }

            if (token) {
                if (isComplexHazard(actor)) {
                    npcs.push(
                        await createSageNpc(
                            actor as HazardPF2e,
                            token.name,
                            {},
                            finalAlias,
                        ),
                    );
                } else {
                    npcs.push(
                        await createSageNpc(
                            actor as NPCPF2e,
                            token.name,
                            {},
                            finalAlias,
                        ),
                    );
                }
            }
        }

        return tsvFormat(npcs);
    } catch (error) {
        // User cancelled dialog
        throw new Error("Export cancelled");
    }
}

export async function exportPcWithAliasDialog(
    actor: CharacterPF2e,
    server: boolean = false,
): Promise<void> {
    try {
        // Get the current alias from flags or generate a default one
        const currentAlias = await getActorAlias(actor) || generateDefaultAlias(actor.name);

        // Prepare actor data for the dialog
        const actorData: ActorAliasData = {
            name: actor.name,
            originalAlias: currentAlias,
            actor: actor,
        };

        // Show the alias dialog
        const dialogResult = await ActorAliasDialog.showDialog({
            title: `Edit Actor Alias - ${actor.name}`,
            actors: [actorData],
            onConfirm: (actors) => actors,
        });

        // Get the final alias (edited or original)
        const finalAlias = dialogResult[0].editedAlias || dialogResult[0].originalAlias;

        // Save the alias if it was changed
        if (dialogResult[0].editedAlias) {
            await setActorAlias(actor, finalAlias);
        }

        // Import and call the original PC export function
        const { exportPcJson } = await import("./export.ts");
        await exportPcJson(actor, server);

    } catch (error) {
        // User cancelled dialog or other error
        if (error.message !== "Dialog cancelled") {
            console.error("[PBD-Tools] Error in PC export with alias dialog:", error);
            ui.notifications.error("Failed to export PC");
        }
    }
}