import { Channel, DiscordEmbed, MODULE_NAME } from "./constants.ts";
import { convertToMarkdown } from "./helpers.ts";
import { generateImageLink } from "./images.ts";
import { createJournalData } from "./journals.ts";
import {
    getChannelWebhookUrl,
    getChannelUsername,
    getChannelAvatar,
    isChannelActive,
} from "./helpers.ts";

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
            allowed_mentions: { parse: ["everyone", "users"] },
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

export async function postDiscord(
    channel: Channel | null,
    content: string,
): Promise<void> {
    if (channel === null) return;
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

export async function postNpcDiscordMessage(content: string): Promise<void> {
    if (!isChannelActive(Channel.GM)) return;

    const username = getChannelUsername(Channel.GM);
    const avatarLink = await generateImageLink(getChannelAvatar(Channel.GM));
    const formData = createDiscordFormData(username, avatarLink, content, []);
    await postDiscordMessage(Channel.GM, formData);
}

export async function postPcDiscordMessage(content: string): Promise<void> {
    const channel = game.settings.get(
        MODULE_NAME,
        "pc-export-channel",
    ) as Channel;
    if (!isChannelActive(channel)) return;

    const username = getChannelUsername(channel);
    const avatarLink = await generateImageLink(getChannelAvatar(channel));
    const formData = createDiscordFormData(username, avatarLink, content, []);
    await postDiscordMessage(channel, formData);
}
