import abbreviate from "abbreviate";
import { AbbreviateOptions } from "abbreviate";
import {
    CombatantPF2e,
    CreatureSystemData,
    CharacterSystemData,
    EncounterPF2e,
} from "foundry-pf2e";
import Table from "table-layout";

import { Channel, MODULE_NAME } from "./constants.ts";
import { createDiscordFormData, postDiscordMessage } from "./discord.ts";
import { generateImageLink } from "./images.ts";
import {
    getChannelAvatar,
    getChannelUsername,
    isComplexHazardOrNpc,
} from "./helpers.ts";
import { getActorAlias } from "./npcs.ts";

type InitTableData = Record<string, string | number | null>;

function makeTitle(slug) {
    const words = slug.split("-");

    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        words[i] = word.charAt(0).toUpperCase() + word.slice(1);
    }

    return words.join(" ");
}

function getUserMentions(mentions: string[]): string {
    if (!game.settings.get(MODULE_NAME, "tracker-user-mention")) return "";

    const userMap = new Map<string, string>(
        game.settings.get(MODULE_NAME, "user-mention-config") as Map<
            string,
            string
        >,
    );

    let mentionContent = "";
    mentions.forEach((actorId: string) => {
        if (userMap.has(actorId)) {
            mentionContent +=
                " <@" +
                userMap.get(actorId) +
                "> (" +
                game.actors.get(actorId)?.name.split(/ (.*)/)[0] +
                ")";
        }
    });

    // Only return the "-#" prefix if there are actual mentions
    return mentionContent ? "-#" + mentionContent : "";
}

class TrackerConfig {
    private mode: string;

    constructor() {
        this.mode = game.settings.get(MODULE_NAME, "tracker-mode") as string;
    }

    get style(): string {
        return this.mode;
    }

    get displayAc(): string {
        return game.settings.get(MODULE_NAME, "tracker-ac-display") as string;
    }

    get displayAlias(): boolean {
        return game.settings.get(
            MODULE_NAME,
            "tracker-alias-display",
        ) as boolean;
    }

    get displayHeroPoints(): string {
        return game.settings.get(
            MODULE_NAME,
            "tracker-hero-points-display",
        ) as string;
    }

    get displayHp(): string {
        return game.settings.get(MODULE_NAME, "tracker-hp-display") as string;
    }

    get displayConditions(): string {
        return game.settings.get(MODULE_NAME, "tracker-hp-display") as string;
    }

    get headerAc(): string {
        if (this.style === "custom") {
            return game.settings.get(
                MODULE_NAME,
                "tracker-ac-header",
            ) as string;
        } else {
            return "AC";
        }
    }

    get headerAlias(): string {
        if (this.style === "custom") {
            return game.settings.get(
                MODULE_NAME,
                "tracker-alias-header",
            ) as string;
        } else {
            return "Alias";
        }
    }

    get headerHp(): string {
        if (this.style === "custom") {
            return game.settings.get(
                MODULE_NAME,
                "tracker-hp-header",
            ) as string;
        } else {
            return "HP";
        }
    }

    get headerHeroPoints(): string {
        if (this.style === "custom") {
            return game.settings.get(
                MODULE_NAME,
                "tracker-hero-points-header",
            ) as string;
        } else {
            return "H";
        }
    }

    get headerInitiative(): string {
        if (this.style === "custom") {
            return game.settings.get(
                MODULE_NAME,
                "tracker-initiative-header",
            ) as string;
        } else if (this.style === "compact") {
            return "I";
        } else {
            return "Init";
        }
    }

    get preamble(): string {
        if (this.mode === "wide")
            return "```diff\n🤜 Combat Round " + game.combat?.round + " 🤛\n";
        else if (this.mode === "compact")
            return (
                ":crossed_swords: Combat Round " +
                game.combat?.round +
                " :crossed_swords:\n"
            );
        else
            return game.settings.get(MODULE_NAME, "tracker-preamble") as string;
    }

    get postamble(): string {
        if (this.mode === "wide") return "\n🟢 May Act\n```\n\n";
        else if (this.mode === "compact") return "\n\n";
        else
            return game.settings.get(
                MODULE_NAME,
                "tracker-postamble",
            ) as string;
    }

    get shortName(): boolean {
        return this.mode === "compact" || !this.displayAlias;
    }

    get width(): number {
        if (this.mode === "wide") return 60;
        else if (this.mode === "compact") return 40;
        else return game.settings.get(MODULE_NAME, "tracker-width") as number;
    }
}

export async function updateTracker(): Promise<void> {
    if (!game.combat) return;

    const tc = new TrackerConfig();

    // Table headings
    const heading = { party: "" };
    heading["status"] = game.settings.get(MODULE_NAME, "tracker-status-header");
    heading["combatant"] = "Combatant";
    heading["alias"] = tc.displayAlias ? tc.headerAlias : "";
    heading["initiative"] = tc.headerInitiative;
    heading["heroPoints"] = tc.displayHeroPoints ? tc.headerHeroPoints : "";
    heading["ac"] = tc.displayAc === "none" ? "" : tc.headerAc;
    heading["hp"] = tc.displayHp === "none" ? "" : tc.headerHp;

    const tableData: InitTableData[] = [];
    const conditionsData: Record<string, string>[] = [];
    tableData.push(heading);

    let inBlock: boolean = false;
    let blockAlliance: string = "";
    const mentions: string[] = [];

    if (!game.combat.turns) return;

    const combatants = game.combat.turns.filter(
        (c: CombatantPF2e<EncounterPF2e>) => c.actor && !c.hidden,
    );

    for (const combatant of combatants) {
        const row: InitTableData = {};
        const actor = combatant.actor;
        if (!actor) continue;

        // Don't use syntax highlighting for alliance in compact mode
        if (tc.style !== "compact") {
            const party = actor.alliance === "party" ? "+" : "-";
            row["party"] = party;
        }

        const combatantIsFirst =
            game.combat?.current.combatantId === combatant.id;
        if (combatantIsFirst) {
            inBlock = true;
            blockAlliance = actor.alliance as string;
        }
        if (inBlock && !combatantIsFirst)
            inBlock = actor.alliance === blockAlliance;
        let status = "";
        if (combatant.isDefeated) status = "💀";
        else {
            if (inBlock) {
                mentions.push(actor.id);
                status = game.settings.get(
                    MODULE_NAME,
                    "tracker-status-turn",
                ) as string;
            } else {
                status = "";
            }
        }
        row["status"] = status;

        // Get stored alias for NPCs/Hazards, or generate one for other actors
        let alias: string;
        if (isComplexHazardOrNpc(actor)) {
            const storedAlias = await getActorAlias(actor);
            if (storedAlias) {
                alias = storedAlias;
            } else {
                const options: AbbreviateOptions = {
                    length: game.settings.get(MODULE_NAME, "abbr-length") as number,
                    strict: game.settings.get(MODULE_NAME, "abbr-strict") as boolean,
                };
                alias = abbreviate(combatant.name, options).toLowerCase();
            }
        } else {
            const options: AbbreviateOptions = {
                length: game.settings.get(MODULE_NAME, "abbr-length") as number,
                strict: game.settings.get(MODULE_NAME, "abbr-strict") as boolean,
            };
            alias = abbreviate(combatant.name, options).toLowerCase();
        }

        if (tc.shortName) {
            row["combatant"] = isComplexHazardOrNpc(actor)
                ? alias
                : combatant.name.split(" ")[0];
        } else {
            row["combatant"] = combatant.name;
        }

        row["alias"] =
            tc.displayAlias && isComplexHazardOrNpc(actor) ? alias : "";

        row["initiative"] = combatant.initiative ? combatant.initiative : "-";

        const system: CreatureSystemData = actor.system as CreatureSystemData;
        const heroPoints =
            actor.type === "character"
                ? (
                      system as CharacterSystemData
                  ).resources.heroPoints.value.toString()
                : "-";
        row["heroPoints"] = tc.displayHeroPoints ? heroPoints : "";

        if (tc.displayAc === "value") row["ac"] = system.attributes.ac.value;
        else if (tc.displayAc === "alias" && isComplexHazardOrNpc(actor))
            row["ac"] = `{${alias}::ac}`;
        else row["ac"] = "";

        const currentHp =
            system.attributes.hp.value + system.attributes.hp.temp;
        const maxHp = system.attributes.hp.max;
        const hp = isComplexHazardOrNpc(actor)
            ? currentHp - maxHp === 0
                ? "-0"
                : (currentHp - maxHp).toString()
            : currentHp + "/" + maxHp;

        if (tc.displayHp === "pcfoe") {
            row["hp"] = hp;
        } else if (tc.displayHp === "pc") {
            row["hp"] = isComplexHazardOrNpc(actor) ? "-" : hp;
        } else {
            row["hp"] = "";
        }

        tableData.push(row);

        // Conditions / Effects
        if (
            actor.conditions.active.length !== 0 ||
            actor.itemTypes.effect.length !== 0
        ) {
            let list = "";
            actor.conditions.active.forEach((c, idx, array) => {
                list += c.name;
                if (
                    idx !== array.length - 1 ||
                    actor.itemTypes.effect.length !== 0
                )
                    list += ", ";
            });

            actor.itemTypes.effect.forEach((e, idx, array) => {
                list += makeTitle(e.rollOptionSlug);
                if (idx !== array.length - 1) list += ", ";
            });
            conditionsData.push({ valid: "╚", conditions: list });
        } else {
            conditionsData.push({ valid: "" });
        }
    }

    const compactOptions = {
        maxWidth: tc.width,
        columns: [{ name: "status", padding: { left: "", right: " " } }],
        ignoreEmptyColumns: true,
    };

    const defaultOptions = {
        maxWidth: tc.width,
        columns: [{ name: "party", padding: { left: "", right: " " } }],
        ignoreEmptyColumns: true,
    };

    const trackerTable = new Table(
        tableData,
        tc.style === "compact" ? compactOptions : defaultOptions,
    );

    let trackerLines = trackerTable.renderLines();
    trackerLines = trackerLines.map((line) => "`" + line + "`");
    combatants.forEach((combatant: CombatantPF2e<EncounterPF2e>, idx) => {
        const actor = combatant.actor;
        if (!actor) return;

        // Format a single conditions/effects data and append to the corresponding
        // actor with active conditions/effects.
        if (tc.displayConditions && conditionsData[idx].valid === "╚") {
            if (tc.style === "compact") {
                const regexp = /(?![^\n]{1,40}$)([^\n]{1,40})\s/g;
                /* FIXME variable width regex
                const width = tc.width;
                const pattern = String.raw`(?![^\n]{1,${width}}$)([^\n]{1,${width}})\s`;
                const regexp = new RegExp(pattern, "g");
                console.log(regexp);
                */
                trackerLines[idx + 1] +=
                    "\n-# " +
                    conditionsData[idx].conditions.replace(regexp, "$1\n-# ");
            } else {
                const conditionRow = new Table([conditionsData[idx]], {
                    maxWidth: trackerLines[idx].length,
                    columns: [
                        { name: "valid", padding: { left: "", right: " " } },
                    ],
                });
                trackerLines[idx + 1] +=
                    "\n" + conditionRow.toString().trimEnd();
            }
        }
    });

    const content =
        tc.preamble +
        trackerLines.join("\n") +
        tc.postamble +
        getUserMentions(mentions);

    const channel = game.settings.get(
        MODULE_NAME,
        "tracker-output-channel",
    ) as Channel;
    const username = getChannelUsername(channel);
    const avatarLink = await generateImageLink(getChannelAvatar(channel));
    const formData = createDiscordFormData(username, avatarLink, content, []);
    await postDiscordMessage(channel, formData);
    ui.notifications.info("Posted combat tracker to Discord");
}
