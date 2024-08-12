import { Channel } from "./constants.ts";
import { createCreatureData } from "./creatures.ts"
import { generateImageLink } from "./images.ts"
import { convertToMarkdown, createJournalData } from "./journals.ts"
import { getChannelWebhookUrl, getChannelUsername, getChannelAvatar } from "./settings.ts"

export function createDiscordFormData(username, avatar_url, content, embeds) {
    const formData = new FormData();
    formData.append("payload_json", JSON.stringify({
        username: username,
        avatar_url: avatar_url,
        content: content,
        embeds: embeds,
        allowed_mentions: {
            parse: ["everyone", "users"]
        }
    }));
    
    return formData;
}

export async function postDiscordMessage(channel, formData: FormData) {
    const webhookUrl: String = getChannelWebhookUrl(channel) as String;
        try {
        const response = await fetch(webhookUrl.valueOf(), {
        method: 'POST',
        body: formData
        });

        if (!response.ok)
        console.error(`Discord webhook error: ${response.status} ${response.statusText}`);
    } catch (error) {
        console.error('Error posting to Discord:', error);
    }
}

export async function postDiscordImage(channel, sheet) {
    let formData = new FormData();

    const imageLink = await generateImageLink(sheet.object);
    const params = {
        username: getChannelUsername(channel),
        avatar_url: await generateImageLink(getChannelAvatar(channel)),
        content: imageLink
    }
    formData.append('payload_json', JSON.stringify(params));
    postDiscordMessage(channel, formData);
}

export async function postDiscordJournal(channel, sheet) {
    const pageIndex = sheet.pageIndex;
    const pageData = sheet._pages[pageIndex];
    let embeds: any = [];
    let content = "";
    
    [content, embeds] = await createJournalData(pageData);

    if (embeds.length > 0 || content !== "") {
        const username = getChannelUsername(channel);
        const avatar = await generateImageLink(getChannelAvatar(channel));
        let formData = createDiscordFormData(username, avatar, content, embeds);
        postDiscordMessage(channel, formData);
    }
}

export async function postDiscordJournalSelection(channel: Channel, selection: string) {
    const content = convertToMarkdown(selection);
    const username = getChannelUsername(channel);
    const avatarLink = await generateImageLink(getChannelAvatar(channel));
    const formData = createDiscordFormData(username, avatarLink, content, []);
    postDiscordMessage(channel, formData);
}

export async function postDiscordNPC(sheet) {
    const content = await createCreatureData(sheet.actor);
    const username = getChannelUsername(Channel.GM);
    const avatarLink = await generateImageLink(getChannelAvatar(Channel.GM));
    const formData = createDiscordFormData(username, avatarLink, content, []);
    await postDiscordMessage(Channel.GM, formData);
}

