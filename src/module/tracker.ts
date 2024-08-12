import type { CombatantPF2e, EncounterPF2e } from "@module/encounter/index.ts";
import { Channel, MODULE_NAME } from "./constants.ts";
import { createDiscordFormData, postDiscordMessage } from "./discord.ts";
import { generateImageLink } from "./images.ts";
import { getChannelAvatar, getChannelUsername } from "./settings.ts";
import { CreatureSystemData } from "@actor/creature/index.js";
import { CharacterSystemData } from "@actor/character/data.js";

function makeTitle(slug) {
    const words = slug.split("-");

    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        words[i] = word.charAt(0).toUpperCase() + word.slice(1);
    }

    return words.join(" ");
}

export async function updateTracker(): Promise<void> {
    if (!game.combat) return;

    let content = "```diff\n";
    content += "🤜 Combat Round " + game.combat?.round + " 🤛\n";
    content += "    ";
    content += "Combatant".padEnd(26, " ");
    content += "Init".padEnd(6, " ");
    content += "H".padEnd(3, " ");
    content += "AC".padEnd(4, " ");
    content += "HP".padEnd(10, " ");
    content += "\n";

    let inBlock: boolean = false;
    let blockAlliance: string = "";
    const mentions: string[] = [];

    if (!game.combat.turns) return;

    game.combat.turns.forEach((combatant: CombatantPF2e<EncounterPF2e>) => {
        const actor = combatant.actor;
        if (!actor) return;

        // Stats
        const party = actor.alliance === "party" ? "+" : "-";
        content += party;

        const combatantIsFirst =
            game.combat?.current.combatantId === combatant.id;
        if (combatantIsFirst) {
            inBlock = true;
            blockAlliance = actor.alliance as string;
        }
        if (inBlock && !combatantIsFirst)
            inBlock = actor.alliance === blockAlliance;
        let status = "";
        if (combatant.isDefeated) status = "💀 ";
        else {
            if (inBlock) {
                mentions.push(actor.id);
                status = "🟢 ";
            } else {
                status = " - ";
            }
        }
        content += status;
        content += combatant.name.padEnd(26, " ");
        content += combatant.initiative?.toString().padEnd(6, " ");
        const system: CreatureSystemData = actor.system as CreatureSystemData;
        const heroPoints =
            actor.type === "character"
                ? (
                      system as CharacterSystemData
                  ).resources.heroPoints.value.toString()
                : "-";
        content += heroPoints.padEnd(3, " ");

        content += system.attributes.ac.value.toString().padEnd(4, " ");
        const currentHp =
            system.attributes.hp.value + system.attributes.hp.temp;
        const maxHp = system.attributes.hp.max;
        const hp = actor.isOfType("npc")
            ? currentHp - maxHp === 0
                ? "-0"
                : (currentHp - maxHp).toString()
            : currentHp + "/" + maxHp;
        content += hp.padEnd(10, " ");
        content += "\n";

        // Conditions / Effects
        if (
            actor.conditions.active.length !== 0 ||
            actor.itemTypes.effect.length !== 0
        ) {
            content += "╚ ";
            actor.conditions.active.forEach((c, idx, array) => {
                content += c.name;
                if (
                    idx !== array.length - 1 ||
                    actor.itemTypes.effect.length !== 0
                )
                    content += ", ";
            });

            actor.itemTypes.effect.forEach((e, idx, array) => {
                content += makeTitle(e.rollOptionSlug);
                if (idx !== array.length - 1) content += ", ";
            });
            content += "\n";
        }
    });
    content += "\n";
    content += "🟢 May Act\n";
    content += "```\n";

    const userMap = new Map<string, string>(
        game.settings.get(MODULE_NAME, "user-mention-config") as Map<
            string,
            string
        >,
    );
    mentions.forEach((actorId: string) => {
        if (userMap.has(actorId)) {
            content +=
                " <@" +
                userMap.get(actorId) +
                "> (" +
                game.actors.get(actorId)?.name.split(/ (.*)/)[0] +
                ")";
        }
    });

    const username = getChannelUsername(Channel.IC);
    const avatarLink = await generateImageLink(getChannelAvatar(Channel.IC));
    const formData = createDiscordFormData(username, avatarLink, content, []);
    await postDiscordMessage(Channel.IC, formData);
    ui.notifications.info("Posted combat tracker to Discord");
}
