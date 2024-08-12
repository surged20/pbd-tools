import { ActorPF2e, CharacterPF2e, EncounterPF2e } from "foundry-pf2e";

import { MODULE_NAME } from "./constants.ts";
import { postNpcDiscordMessage, postPcDiscordMessage } from "./discord.ts";
import { isRemoteAccessible, getRemoteURL } from "./foundry.ts";
import { convertToMarkdown } from "./helpers.ts";
import { createPathbuilderJson } from "./pathbuilder.ts";
import {
    createNpcTsv,
    createEncounterNpcsTsv,
    createFolderNpcsTsv,
    createSceneNpcsTsv,
} from "./npcs.ts";

function removeBlankLines(str) {
    return str
        .split(/\r?\n/)
        .filter((line) => line.trim() !== "")
        .join("\n");
}

function createNpcMessage(title: string, fileName: string): string {
    const baseUrl = isRemoteAccessible()
        ? getRemoteURL()
        : "http://localhost:30000";
    const pathName = "/modules/pbd-tools/storage/";
    const uri = encodeURI(baseUrl + pathName + fileName);
    const content = ` \
        <h2>${title}</h2> \
        <b>Import NPC(s)</b> \
        <pre class="pbd-wrap"><code class="pbd-select">sage! npc import tsv="<a href="${uri}">${uri}</a>"</code></pre>`;

    return content;
}

async function postNpcChatMessage(message: string): Promise<void> {
    const chatData = {
        user: game.user.id,
        speaker: ChatMessage.getSpeaker(),
        content: message,
        whisper: ChatMessage.getWhisperRecipients(game.user.name),
    };
    await ChatMessage.create(chatData);
}

async function uploadTsvFile(tsvFile: File): Promise<boolean> {
    const fp = new FilePicker({
        baseApplication: "tsv",
        width: 0,
        height: 0,
        top: 0,
        left: 0,
        scale: 1,
        popOut: true,
        minimizable: false,
        resizable: false,
        id: "tsv",
        classes: ["tsv"],
        title: "TSV Upload",
        template: "tsv",
        scrollY: [],
        tabs: [],
        dragDrop: [],
        filters: [],
    });
    if (!fp.canUpload) {
        ui.notifications.error(
            "Cannot export NPC(s): File upload not permitted",
        );
        return false;
    }
    await FilePicker.uploadPersistent(
        "pbd-tools",
        "",
        tsvFile,
        {},
        { notify: false },
    );
    return true;
}

async function exportNpcTsv(
    tsvData: string,
    name: string,
    server: boolean,
): Promise<void> {
    const fileName = game.pf2e.system.sluggify(name) + ".tsv";
    const fileType = "text/tab-separated-values";
    const blob = new Blob([tsvData], { type: fileType });
    const tsvFile = new File([blob], fileName, {
        type: fileType,
    });
    if (server) {
        if (await uploadTsvFile(tsvFile)) {
            const message = createNpcMessage(name, fileName);
            await postNpcChatMessage(message);
            if (game.settings.get(MODULE_NAME, "post-npc-to-discord")) {
                await postNpcDiscordMessage(
                    removeBlankLines(convertToMarkdown(message)),
                );
            }
        } else {
            ui.notifications.error(
                game.i18n.localize(`${MODULE_NAME}.Export.Failed`) +
                    ": " +
                    name,
            );
        }
    } else {
        await globalThis.saveDataToFile(tsvFile, fileType, fileName);
    }
    ui.notifications.info(
        name + " " + game.i18n.localize(`${MODULE_NAME}.Export.Complete`),
    );
}

export async function exportActorNpcTsv(
    actor: ActorPF2e,
    server: boolean,
): Promise<void> {
    const name =
        actor.isToken && actor?.token?.name ? actor.token.name : actor.name;
    const tsvData = await createNpcTsv(actor);
    await exportNpcTsv(tsvData, name, server);
}

export async function exportEncounterNpcTsv(
    encounter: EncounterPF2e,
    server: boolean,
): Promise<void> {
    const tsvData = await createEncounterNpcsTsv(encounter);
    const scene = game.pf2e.system.sluggify(encounter.scene.name);
    const name = `${scene}-encounter-${encounter.id}`;
    await exportNpcTsv(tsvData, name, server);
}

export async function exportFolderNpcTsv(
    folder: Folder,
    server: boolean,
): Promise<void> {
    const tsvData = await createFolderNpcsTsv(folder);
    await exportNpcTsv(tsvData, folder.name, server);
}

export async function exportSceneNpcTsv(
    scene: Scene,
    server: boolean,
): Promise<void> {
    const tsvData = await createSceneNpcsTsv(scene);
    await exportNpcTsv(tsvData, scene.name, server);
}

function createPcMessage(title: string, fileName: string): string {
    const baseUrl = isRemoteAccessible()
        ? getRemoteURL()
        : "http://localhost:30000";
    const pathName = "/modules/pbd-tools/storage/";
    const uri = encodeURI(baseUrl + pathName + fileName);
    const content = ` \
        <h2>${title}</h2> \
        <b>Update PC</b><br> \
        Reply to the RPGSage PC sheet with: \
        <pre class="pbd-wrap"><code class="pbd-select">sage! reimport pathbuilder-2e json="<a href="${uri}">${uri}</a>"</code></pre> \
        <b>Create PC</b> \
        <pre class="pbd-wrap"><code class="pbd-select">sage! import pathbuilder-2e json="<a href="${uri}">${uri}</a>"</code></pre>`;

    return content;
}

async function postPcChatMessage(message: string): Promise<void> {
    const chatData = {
        user: game.user.id,
        speaker: ChatMessage.getSpeaker(),
        content: message,
    };
    await ChatMessage.create(chatData);
}

async function uploadPcJson(jsonFile): Promise<void> {
    const fp = new FilePicker({
        baseApplication: "pathbuilder-2e",
        width: 0,
        height: 0,
        top: 0,
        left: 0,
        scale: 1,
        popOut: true,
        minimizable: false,
        resizable: false,
        id: "pathbuilder-2e",
        classes: ["pathbuilder-2e"],
        title: "Pathbuilder 2e",
        template: "pathbuilder-2e",
        scrollY: [],
        tabs: [],
        dragDrop: [],
        filters: [],
    });
    if (!fp.canUpload) {
        ui.notifications.error("Cannot export PC: File upload not permitted");
        return;
    }
    await FilePicker.uploadPersistent(
        "pbd-tools",
        "",
        jsonFile,
        {},
        { notify: false },
    );
}

export async function exportPcJson(
    actor: CharacterPF2e,
    server: boolean = false,
): Promise<void> {
    const fileName = game.pf2e.system.sluggify(actor.name) + ".json";
    const fileType = "application/json";
    const blob = new Blob([createPathbuilderJson(actor)], {
        type: "application/json",
    });
    const jsonFile = new File([blob], fileName, { type: fileType });
    if (server) {
        await uploadPcJson(jsonFile);
        const message = createPcMessage(actor.name, fileName);
        await postPcChatMessage(message);
        if (game.settings.get(MODULE_NAME, "post-pc-to-discord")) {
            postPcDiscordMessage(removeBlankLines(convertToMarkdown(message)));
        }
    } else {
        await globalThis.saveDataToFile(jsonFile, fileType, fileName);
    }
    ui.notifications.info(
        actor.name + " " + game.i18n.localize(`${MODULE_NAME}.Export.Complete`),
    );
}
