import type { CombatantPF2e, EncounterPF2e } from "@module/encounter/index.ts";
import { Channel, MODULE_NAME } from "./constants.ts";
import { createDiscordFormData, postDiscordMessage } from "./discord.ts";
import { generateImageLink } from "./images.ts";
import { getChannelAvatar, getChannelUsername } from "./settings.ts";

function makeTitle(slug) {
  var words = slug.split('-');

  for (var i = 0; i < words.length; i++) {
    var word = words[i];
    words[i] = word.charAt(0).toUpperCase() + word.slice(1);
  }

  return words.join(' ');
}

export async function updateTracker() {
    if (!game.combat) return;

    let content = "\`\`\`diff\n";
    content += "🤜 Combat Round " + game.combat?.round + " 🤛\n";
    content += "    ";
    content += "Combatant".padEnd(22, " ");
    content += "Init".padEnd(6, " ");
    content += "H".padEnd(3, " ");
    content += "AC".padEnd(4, " ");
    content += "HP".padEnd(10, " ");
    content += "\n";
    content += "╚\n";
    const notifies: String[] = [];
    let firstCombatant = false;
    let combatantAffiliation;
    let endBlock = false;

    if (!game.combat.turns) return;
    game.combat.turns.forEach((combatant: CombatantPF2e<EncounterPF2e>) => {
        const actor = combatant.actor;
        if (!actor) return; // TODO review
        const isParty = actor.alliance === "party";
        const party = isParty ? "+" : "-";
        // Stats
        content += party;
        if (combatant.id === game.combat?.current.combatantId) { // FIXME
            firstCombatant = true;
            combatantAffiliation = isParty;
        }
//        } else combatantAffiliation = !isParty;
        if (!endBlock) endBlock = firstCombatant && (combatantAffiliation != isParty); // FIXME this logic is awful
        let status;
        if (combatant.isDefeated)
            status = "💀 ";
        else {
            if (!endBlock && (combatantAffiliation === isParty)) {
                notifies.push(actor.id);
                status = "🟢 "        
            } else {
                status = " - ";
            }
        }
        content += status;
        content += actor.name.padEnd(22, " ");
        content += combatant.initiative?.toString().padEnd(6, " "); //FIXME
        const system = (<any>actor).system;
        const heroPoints = actor.type === "character" ? system.resources.heroPoints.value.toString() : "-";
        content += heroPoints.padEnd(3, " ");
        
        content += system.attributes.ac.value.toString().padEnd(4, " ");
        const currentHp = system.attributes.hp.value + system.attributes.hp.temp;
        const hp = currentHp + "/" + system.attributes.hp.max;
        content += hp.padEnd(10, " ");
        content += "\n";

        // Conditions / Effects
        if ((actor.conditions.active.length != 0) || (actor.itemTypes.effect.length != 0)) {
            content += "╚ ";
            actor.conditions.active.forEach((c, idx, array) => {
            content += c.name;
            if ((idx != array.length - 1) || (actor.itemTypes.effect.length != 0))
                content += ", ";
            });

            actor.itemTypes.effect.forEach((e, idx, array) => {
            content += makeTitle(e.rollOptionSlug);
            if (idx != array.length - 1)
                content += ", ";
            });
            content += "\n";
        }
    });
    content += "\n";
    content += "🟢 May Act\n";
    content += "\`\`\`\n";
    const userMap: any = game.settings.get(MODULE_NAME, "user-ping-config");
    notifies.forEach((id: any) => {
        const userEntry = userMap[id];
        if (userEntry)
            content += " <@" + userEntry.userId + "> (" + game.actors.get(id)?.name.split(/ (.*)/)[0] + ")";
    });

    const username = getChannelUsername(Channel.IC);
    const avatarLink = await generateImageLink(getChannelAvatar(Channel.IC));
    const formData = createDiscordFormData(username, avatarLink, content, [])
    await postDiscordMessage(Channel.IC, formData);
}
