import type { ActorPF2e, Size } from "foundry-pf2e";

import { Channel, DiscordEmbed, MODULE_NAME } from "./constants.ts";
import { createDiscordFormData, postDiscordMessage } from "./discord.ts";
import {
    convertToMarkdown,
    getChannelAvatar,
    getChannelUsername,
    isChannelActive,
} from "./helpers.ts";
import { generateImageLink } from "./images.ts";
import { validateDiscordMessage, handleValidationResult } from "./discord-validation.ts";

interface NPCDataEntry {
    revealed: boolean;
    value: string;
}

interface NPCDataGeneral {
    appearance: NPCDataEntry;
    background: NPCDataEntry;
    personality: NPCDataEntry;
}

interface NPCDataInfluence {
    discovery: Object;
    influence: Object;
    influencePoints: number;
    influenceSkills: Object;
    penalties: Object;
    premise: NPCDataEntry;
    resistances: Object;
    weaknesses: Object;
}

interface NPCData {
    categories: Object[];
    general: NPCDataGeneral;
    influence: NPCDataInfluence;
    simple: boolean;
}

interface Trait {
    revealed: boolean;
    fake: boolean;
    value: string;
    label: string;
}

interface TrackingNPCSystemData {
    npcData: NPCData;
    blurb: NPCDataEntry;
    img: string;
    level: NPCDataEntry;
    rarity: NPCDataEntry;
    saves: Record<string, NPCDataEntry>;
    senses: Record<string, NPCDataEntry>;
    size: Size;
    traits: Record<string, Trait>;
}

export function getInfluencePage(
    li: JQuery<JQuery.Node>,
): JournalEntryPage<JournalEntry> | undefined {
    if (!game.modules.get("pf2e-bestiary-tracking")?.active) return undefined;
    const actor = game.actors.get(li.data("documentId")) as ActorPF2e;
    if (!actor?.isOfType("npc")) return undefined;
    const btj = game.journal.get(
        String(
            game.settings.get("pf2e-bestiary-tracking", "bestiary-tracking"),
        ),
    );
    if (!btj) return undefined;
    return btj.pages.find((p) => p.name === actor.name);
}

export function hasInfluence(page: JournalEntryPage<JournalEntry>): boolean {
    const npcTracked = page
        ? page.type === "pf2e-bestiary-tracking.npc"
        : false;
    const npcData = page
        ? (page.system as TrackingNPCSystemData).npcData
        : null;
    return npcTracked && !!npcData?.influence;
}

function getTraits(page: JournalEntryPage<JournalEntry>) {
    const system = page.system as TrackingNPCSystemData;
    const rarity = game.i18n
        .localize(CONFIG.PF2E.rarityTraits[system.rarity.value])
        .toUpperCase();
    const size = game.i18n
        .localize(CONFIG.PF2E.actorSizes[system.size])
        .toUpperCase();
    let traits = `${rarity} ${size}`;
    for (const [_key, value] of Object.entries(system.traits)) {
        traits += ` ${game.i18n.localize(value.label).toUpperCase()}`;
    }

    return traits;
}

function getDiscovery(page: JournalEntryPage<JournalEntry>) {
    let discovery = "";
    for (const [_key, value] of Object.entries(
        (page.system as TrackingNPCSystemData).npcData.influence.discovery,
    )) {
        const label =
            value.type === "perception"
                ? "PF2E.PerceptionLabel"
                : value.lore
                  ? value.type
                  : CONFIG.PF2E.skills[value.type].label;
        discovery += ` DC ${value.dc} ${game.i18n.localize(label)},`;
    }

    return discovery.replace(/,$/, "");
}

function getInfluenceSkills(page: JournalEntryPage<JournalEntry>) {
    let skills = "";
    for (const [_key, value] of Object.entries(
        (page.system as TrackingNPCSystemData).npcData.influence
            .influenceSkills,
    )) {
        const label = game.i18n.localize(
            value.lore ? value.type : CONFIG.PF2E.skills[value.type].label,
        );
        const desc = value.description.value
            ? ` (${value.description.value})`
            : "";
        skills += ` DC ${value.dc} ${label}${desc},`;
    }

    return skills.replace(/,$/, "");
}

function getInfluenceThresholds(page: JournalEntryPage<JournalEntry>) {
    let thresholds = "";
    for (const [_key, value] of Object.entries(
        (page.system as TrackingNPCSystemData).npcData.influence.influence,
    )) {
        thresholds += `**Influence ${value.points}** ${value.description}\n`;
    }
    return thresholds;
}

function getResistances(page: JournalEntryPage<JournalEntry>) {
    let resistances = "";
    for (const [_key, value] of Object.entries(
        (page.system as TrackingNPCSystemData).npcData.influence.resistances,
    )) {
        resistances += ` ${value.description}`;
    }

    return resistances;
}

function getWeaknesses(page) {
    let weaknesses = "";
    for (const [_key, value] of Object.entries(
        (page.system as TrackingNPCSystemData).npcData.influence.weaknesses,
    )) {
        weaknesses += ` ${value.description}`;
    }

    return weaknesses;
}

function getPenalties(page: JournalEntryPage<JournalEntry>) {
    let penalties = "";
    for (const [_key, value] of Object.entries(
        (page.system as TrackingNPCSystemData).npcData.influence.penalties,
    )) {
        penalties += ` ${value.description}`;
    }

    return penalties;
}

function formatModifier(value: number | string): string {
    return new Intl.NumberFormat("en-US", {
        signDisplay: "exceptZero",
    }).format(value as number);
}

async function createInfluenceStatblock(
    page: JournalEntryPage<JournalEntry>,
): Promise<DiscordEmbed> {
    const system = page.system as TrackingNPCSystemData;
    const title = `${page.name} (Level ${system.level.value})`;
    const description = `-# ${getTraits(page)}\n\
*${system.blurb.value}*\n\
**Perception** ${formatModifier(system.senses.perception.value)}\n\
**Will** ${formatModifier(system.saves.will.value)}\n\
**Discovery**${getDiscovery(page)}\n\
**Influence Skills**${getInfluenceSkills(page)}\n\
${getInfluenceThresholds(page)}\
**Resistances**${getResistances(page)}\n\
**Weaknesses**${getWeaknesses(page)}\n\
**Background** ${convertToMarkdown(system.npcData.general.background.value)}\n\
**Appearance** ${system.npcData.general.appearance.value}\n\
**Personality** ${system.npcData.general.personality.value}\n\
**Penalty**${getPenalties(page)}\n\
`;

    const embed = { title: title, description: description };
    embed["color"] = parseInt(
        (
            game.settings.get(
                MODULE_NAME,
                "statblock-influence-color",
            ) as string
        ).replace("#", ""),
        16,
    );
    if (game.settings.get(MODULE_NAME, "statblock-influence-thumbnail")) {
        embed["thumbnail"] = { url: await generateImageLink(system.img) };
    }
    return embed;
}

export async function postInfluenceStatblock(
    page: JournalEntryPage<JournalEntry>,
): Promise<void> {
    if (!isChannelActive(Channel.GM)) return;

    try {
        const embed = await createInfluenceStatblock(page);

        // Pre-validate embed size before attempting to send
        const validationResult = validateDiscordMessage("", [embed]);
        if (!handleValidationResult(validationResult, `influence statblock for ${page.name}`)) {
            return;
        }

        const username = getChannelUsername(Channel.GM);
        const avatarLink = await generateImageLink(getChannelAvatar(Channel.GM));
        const formData = createDiscordFormData(username, avatarLink, "", [embed]);
        await postDiscordMessage(Channel.GM, formData);
        ui.notifications.info(
            page.name + game.i18n.localize("pbd-tools.Statblock.SentInfluence"),
        );
    } catch (error) {
        console.error("Failed to send influence statblock:", error);
        ui.notifications.error("Failed to send influence statblock to Discord");
    }
}
