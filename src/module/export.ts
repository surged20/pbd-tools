import type {
    ActorPF2e,
    CharacterPF2e,
    EncounterPF2e,
    HazardPF2e,
    NPCPF2e,
} from "foundry-pf2e";

import { MODULE_NAME } from "./constants.ts";

// Runtime globals available in Foundry v13
declare const foundry: {
    applications: {
        apps: {
            FilePicker: {
                implementation: {
                    uploadPersistent(
                        packageId: string,
                        path: string,
                        file: File,
                        body?: Record<string, unknown>,
                        options?: { notify?: boolean },
                    ): Promise<unknown>;
                };
            };
        };
    };
};
import { postNpcDiscordMessage, postPcDiscordMessage } from "./discord.ts";
import { isRemoteAccessible, getRemoteURL } from "./foundry.ts";
import { convertToMarkdown } from "./helpers.ts";
import { createPathbuilderJson } from "./pathbuilder.ts";
import {
    createNpcTsvWithDialog,
    createEncounterNpcsTsvWithDialog,
    createFolderNpcsTsvWithDialog,
    createSceneNpcsTsvWithDialog,
} from "./npcs.ts";

function removeBlankLines(str: string): string {
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
        whisper: ChatMessage.getWhisperRecipients(game.user.name).map(
            (u) => u.id,
        ),
    };
    await ChatMessage.create(chatData);
}

async function uploadTsvFile(tsvFile: File): Promise<boolean> {
    if (!game.user.hasPermission("FILES_UPLOAD")) {
        ui.notifications.error(
            "Cannot export NPC(s): File upload not permitted",
        );
        return false;
    }
    await foundry.applications.apps.FilePicker.implementation.uploadPersistent(
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
        console.log("[PBD-Tools] Server export, uploading TSV file");
        if (await uploadTsvFile(tsvFile)) {
            const message = createNpcMessage(name, fileName);
            console.log(
                "[PBD-Tools] TSV upload successful, posting chat message",
            );
            await postNpcChatMessage(message);

            const postToDiscord = game.settings.get(
                MODULE_NAME,
                "post-npc-to-discord",
            );
            console.log("[PBD-Tools] Discord posting setting:", postToDiscord);

            if (postToDiscord) {
                console.log("[PBD-Tools] Posting NPC to Discord");
                await postNpcDiscordMessage(
                    removeBlankLines(convertToMarkdown(message)),
                );
            } else {
                console.log("[PBD-Tools] Discord posting disabled in settings");
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

    try {
        const tsvData = await createNpcTsvWithDialog(
            actor as HazardPF2e | NPCPF2e,
        );
        await exportNpcTsv(tsvData, name, server);
    } catch (error) {
        // User cancelled the dialog - do nothing
        return;
    }
}

export async function exportEncounterNpcTsv(
    encounter: EncounterPF2e,
    server: boolean,
): Promise<void> {
    const sceneName = encounter.scene?.name || "unknown-scene";
    const scene = game.pf2e.system.sluggify(sceneName);
    const name = `${scene}-encounter-${encounter.id}`;

    try {
        const tsvData = await createEncounterNpcsTsvWithDialog(encounter);
        await exportNpcTsv(tsvData, name, server);
    } catch (error) {
        // User cancelled the dialog - do nothing
        return;
    }
}

export async function exportFolderNpcTsv(
    folder: Folder,
    server: boolean,
): Promise<void> {
    try {
        const tsvData = await createFolderNpcsTsvWithDialog(folder);
        await exportNpcTsv(tsvData, folder.name, server);
    } catch (error) {
        // User cancelled the dialog - do nothing
        return;
    }
}

export async function exportSceneNpcTsv(
    scene: Scene,
    server: boolean,
): Promise<void> {
    try {
        const tsvData = await createSceneNpcsTsvWithDialog(scene);
        await exportNpcTsv(tsvData, scene.name, server);
    } catch (error) {
        // User cancelled the dialog - do nothing
        return;
    }
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

async function uploadPcJson(jsonFile: File): Promise<void> {
    if (!game.user.hasPermission("FILES_UPLOAD")) {
        ui.notifications.error("Cannot export PC: File upload not permitted");
        return;
    }
    await foundry.applications.apps.FilePicker.implementation.uploadPersistent(
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
