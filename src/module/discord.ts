import { CharacterPF2e, CreaturePF2e } from "@actor";
import { CreatureSheetPF2e } from "@actor/creature/sheet.js";
import { Channel, DiscordEmbed } from "./constants.ts";
import { createCreatureData } from "./creatures.ts";
import { getRemoteURL, isRemoteAccessible } from "./foundry.ts";
import { generateImageLink } from "./images.ts";
import { convertToMarkdown, createJournalData } from "./journals.ts";
import { createPathbuilderJson } from "./pathbuilder.ts";
import {
    getChannelWebhookUrl,
    getChannelUsername,
    getChannelAvatar,
} from "./settings.ts";

export function createDiscordFormData(
    username: string,
    avatar_url: string,
    content: string,
    embeds: DiscordEmbed[],
): FormData {
    const formData = new FormData();
    formData.append(
        "payload_json",
        JSON.stringify({
            username: username,
            avatar_url: avatar_url,
            content: content,
            embeds: embeds,
            allowed_mentions: {
                parse: ["everyone", "users"],
            },
        }),
    );

    return formData;
}

export async function postDiscordMessage(
    channel: Channel,
    formData: FormData,
): Promise<void> {
    const webhookUrl: String = getChannelWebhookUrl(channel) as String;
    try {
        const response = await fetch(webhookUrl.valueOf(), {
            method: "POST",
            body: formData,
        });

        if (!response.ok)
            console.error(
                `Discord webhook error: ${response.status} ${response.statusText}`,
            );
    } catch (error) {
        console.error("Error posting to Discord:", error);
    }
}

export async function postDiscord(channel: Channel, content: string) {
    const username = getChannelUsername(channel);
    const avatarLink = await generateImageLink(getChannelAvatar(channel));
    const formData = createDiscordFormData(username, avatarLink, content, []);
    await postDiscordMessage(channel, formData);
}

export async function postDiscordImage(
    channel: Channel,
    popout: ImagePopout<foundry.abstract.Document>,
): Promise<void> {
    const formData: FormData = new FormData();

    const popoutObject = popout.object as unknown;
    const imageLink: string = await generateImageLink(popoutObject as string);
    const params = {
        username: getChannelUsername(channel),
        avatar_url: await generateImageLink(getChannelAvatar(channel)),
        content: imageLink,
    };
    formData.append("payload_json", JSON.stringify(params));
    postDiscordMessage(channel, formData);
}

export async function postDiscordJournal(
    channel: Channel,
    sheet: JournalSheet<JournalEntry>,
): Promise<void> {
    const pageIndex = sheet.pageIndex;
    const sortedPages = sheet.document.pages.contents.sort(
        (a, b) => a.sort - b.sort,
    );
    const page = sortedPages[pageIndex] as JournalEntryPage;
    const data = await createJournalData(page);
    const content = data.content;
    const embeds = data.embeds;

    if (embeds.length > 0 || content !== "") {
        const username: string = getChannelUsername(channel);
        const avatar: string = await generateImageLink(
            getChannelAvatar(channel),
        );
        const formData = createDiscordFormData(
            username,
            avatar,
            content,
            embeds,
        );
        postDiscordMessage(channel, formData);
    }
}

export async function postDiscordJournalSelection(
    channel: Channel,
    selection: string,
): Promise<void> {
    const content = convertToMarkdown(selection);
    const username = getChannelUsername(channel);
    const avatarLink = await generateImageLink(getChannelAvatar(channel));
    const formData = createDiscordFormData(username, avatarLink, content, []);
    postDiscordMessage(channel, formData);
}

export async function postDiscordNPC(
    sheet: CreatureSheetPF2e<CreaturePF2e>,
): Promise<void> {
    const content = await createCreatureData(sheet.actor);
    const username = getChannelUsername(Channel.GM);
    const avatarLink = await generateImageLink(getChannelAvatar(Channel.GM));
    const formData = createDiscordFormData(username, avatarLink, content, []);
    await postDiscordMessage(Channel.GM, formData);
}

export async function postDiscordPathbuilderJson(
    sheet: CreatureSheetPF2e<CharacterPF2e>,
): Promise<void> {
    const baseUrl = isRemoteAccessible()
        ? getRemoteURL()
        : "http://localhost:30000";
    const pathName = "/pathbuilder/";
    const fileName = game.pf2e.system.sluggify(sheet.actor.name) + ".json";
    const blob = new Blob([createPathbuilderJson(sheet.actor)], {
        type: "application/json",
    });
    const jsonFile = new File([blob], fileName, {
        type: "application/json",
    });
    await FilePicker.upload("data", pathName, jsonFile, { notify: false });
    let content = "# " + sheet.actor.name + "\n";
    content += encodeURI(baseUrl + pathName + fileName) + "\n";
    content +=
        "```\n" +
        "/sage-import pathbuilder-2e id:" +
        encodeURI(baseUrl + pathName + fileName) +
        "```";

    // FIXME Use OOC channel in production
    const username = getChannelUsername(Channel.GM);
    const avatarLink = await generateImageLink(getChannelAvatar(Channel.GM));
    console.log(avatarLink);
    const formData = createDiscordFormData(username, avatarLink, content, []);
    await postDiscordMessage(Channel.GM, formData);
}
