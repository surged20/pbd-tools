import { generateImageLink } from "./images.ts";
import { actorType } from "./constants.ts";
import { CreaturePF2e } from "@actor";

async function getBaseCreatureData(actor) {
    let content = "";

    const name = actor.name;
    const alias = name.split(/ (.*)/)[0].toLowerCase();
    content += "    " + 'alias="' + alias + '"\n';
    content += "    " + 'name="' + name + '"\n';
    const imgLink = await generateImageLink(actor.img);
    content += "    " + 'avatar="' + imgLink + '"\n';
    const tokenLink = await generateImageLink(actor.prototypeToken.texture.src);
    content += "    " + 'token="' + tokenLink + '"\n';

    return content;
}

export async function createCreatureData(actor: CreaturePF2e): Promise<string> {
    const charType = actorType[actor.type];
    let content = "";
    content = "# " + actor.name + "\n";
    content += "## Create\n";
    content += "```diff\n";
    content += "sage!" + charType + " create\n";
    content += await getBaseCreatureData(actor);
    content += "```\n";
    content += "## Update\n";
    content += "```diff\n";
    content += "sage!" + charType + " update\n";
    content += await getBaseCreatureData(actor);
    content += "```\n";
    content += "## Stats\n";
    content += "```diff\n";
    content += "sage!" + charType + " stats\n";
    content += "    " + 'name="' + actor.name + '"\n';
    content += "    " + 'ac="' + actor.armorClass.value + '"\n';
    content += "    " + 'fortitude="' + actor.saves.fortitude.mod + '"\n';
    content += "    " + 'fort="' + actor.saves.fortitude.mod + '"\n';
    content += "    " + 'reflex="' + actor.saves.reflex.mod + '"\n';
    content += "    " + 'will="' + actor.saves.will.mod + '"\n';
    content += "    " + 'perception="' + actor.perception.mod + '"\n';
    content += "    " + 'perc="' + actor.perception.mod + '"\n';
    content += "    " + 'stealth="' + actor.skills.stealth.mod + '"\n';
    content += "```\n";

    return content;
}
