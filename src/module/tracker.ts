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
    content += "Combatant".padEnd(22, " ");
    content += "Init".padEnd(6, " ");
    content += "H".padEnd(3, " ");
    content += "AC".padEnd(4, " ");
    content += "HP".padEnd(10, " ");
    content += "\n";
    content += "╚\n";
    const mentions: string[] = [];
    let firstCombatant = false;
    let combatantAffiliation; // FIXME logic relies on uninitialized variable
    let endBlock = false;

    if (!game.combat.turns) return;
    game.combat.turns.forEach((combatant: CombatantPF2e<EncounterPF2e>) => {
        const actor = combatant.actor;
        if (!actor) return;
        const isParty = actor.alliance === "party";
        const party = isParty ? "+" : "-";
        // Stats
        content += party;
        if (combatant.id === game.combat?.current.combatantId) {
            firstCombatant = true;
            combatantAffiliation = isParty;
        }
        if (!endBlock)
            endBlock = firstCombatant && combatantAffiliation !== isParty;
        let status = "";
        if (combatant.isDefeated) status = "💀 ";
        else {
            if (!endBlock && combatantAffiliation === isParty) {
                mentions.push(actor.id);
                status = "🟢 ";
            } else {
                status = " - ";
            }
        }
        content += status;
        content += actor.name.padEnd(22, " ");
        content += combatant.initiative?.toString().padEnd(6, " "); // FIXME
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
        const hp = currentHp + "/" + system.attributes.hp.max;
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
        game.settings.get(MODULE_NAME, "user-ping-config") as Map<
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
}
