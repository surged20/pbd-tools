import { generateImageLink } from "./images.ts"

export async function createCreatureData(actor) {
    let content = "";
    const name = actor.name;
    content = "# " + actor.name + "\n";
    content += "## Create\n";
    content += "\`\`\`diff\n";

    content += "sage! npc create\n";
    const alias = name.split(/ (.*)/)[0].toLowerCase();
    content += "    " + "alias=\"" + alias + "\"\n";
    content += "    " + "name=\"" + name + "\"\n";
    const imgLink = await generateImageLink(actor.img);
    content += "    " + "avatar=\"" + imgLink + "\"\n";
    const tokenLink = await generateImageLink(actor.prototypeToken.texture.src);
    content += "    " + "token=\"" + tokenLink + "\"\n";
    content += "\`\`\`\n";
    content += "## Stats\n";
    content += "\`\`\`diff\n";
    content += "sage! npc stats\n";
    content += "    " + "name=\"" + name + "\"\n";
    content += "    " + "ac=\"" + actor.armorClass.value + "\"\n";
    content += "    " + "fortitude=\"" + actor.saves.fortitude.mod + "\"\n";
    content += "    " + "fort=\"" + actor.saves.fortitude.mod + "\"\n";
    content += "    " + "reflex=\"" + actor.saves.reflex.mod + "\"\n";
    content += "    " + "will=\"" + actor.saves.will.mod + "\"\n";
    content += "    " + "perception=\"" + actor.perception.mod + "\"\n";
    content += "    " + "perc=\"" + actor.perception.mod + "\"\n";
    content += "    " + "stealth=\"" + actor.skills.stealth.mod + "\"\n";
    content += "\`\`\`\n";

    return content;
}

