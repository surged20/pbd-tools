import { Channel, DiscordEmbed, MODULE_NAME } from "./constants.ts";
import { generateImageLink } from "./images.ts";
import { createJournalData } from "./journals.ts";
import {
    getChannelWebhookUrl,
    getChannelUsername,
    getChannelAvatar,
    isChannelActive,
} from "./helpers.ts";
import {
    validateDiscordMessage,
    handleValidationResult,
} from "./discord-validation.ts";

interface ImagePopoutLike {
    options?: { src?: string };
    image?: string;
    src?: string;
    document?: { src?: string };
    data?: { src?: string };
    object?: { src?: string };
}

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
    // Extract the payload for validation
    const payloadString = formData.get("payload_json") as string;
    if (payloadString) {
        try {
            const payload = JSON.parse(payloadString);
            const content = payload.content || "";
            const embeds = payload.embeds || [];

            // Validate message before sending
            const validationResult = validateDiscordMessage(content, embeds);
            if (!handleValidationResult(validationResult, "Discord message")) {
                return; // Exit if validation fails
            }
        } catch (parseError) {
            console.warn(
                "[PBD-Tools] Could not parse Discord payload for validation:",
                parseError,
            );
            // Continue with sending anyway, as this might be a different payload format
        }
    }

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

    // Pre-validate content length before creating FormData
    const validationResult = validateDiscordMessage(content, []);
    if (!handleValidationResult(validationResult, "Discord message")) {
        return; // Exit if validation fails
    }

    const username = getChannelUsername(channel);
    const avatarLink = await generateImageLink(getChannelAvatar(channel));
    const formData = createDiscordFormData(username, avatarLink, content, []);
    await postDiscordMessage(channel, formData);
}

export async function postDiscordImage(
    channel: Channel,
    popout: ImagePopoutLike,
): Promise<void> {
    const formData: FormData = new FormData();

    // Try multiple ways to get the image URL in v13
    let imageUrl: string = "";

    // Extract image URL from v13 ImagePopout structure
    if (popout.options?.src) {
        imageUrl = popout.options.src;
    } else if (popout.image) {
        imageUrl = popout.image;
    } else if (popout.src) {
        imageUrl = popout.src;
    } else if (popout.document?.src) {
        imageUrl = popout.document.src;
    } else if (popout.data?.src) {
        imageUrl = popout.data.src;
    } else if (popout.object?.src) {
        imageUrl = popout.object.src;
    }

    if (!imageUrl) {
        console.error("[PBD-Tools] No image URL found in popout");
        ui.notifications.error("Could not find image URL to share");
        return;
    }

    const imageLink: string = await generateImageLink(imageUrl, false); // Don't require avatar compatibility for sharing
    const params = {
        username: getChannelUsername(channel),
        avatar_url: await generateImageLink(getChannelAvatar(channel)),
        content: imageLink,
    };

    formData.append("payload_json", JSON.stringify(params));
    await postDiscordMessage(channel, formData);

    // Notify user of successful share
    ui.notifications.info(
        `Image shared to Discord ${channel.toUpperCase()} channel`,
    );
}

interface JournalSheetLike {
    pageIndex?: number;
    document?: {
        pages?: {
            contents?: ({ sort: number } & JournalEntryPage)[];
        };
    };
    object?: JournalEntryPage;
}

export async function postDiscordJournal(
    channel: Channel,
    sheet: JournalSheetLike,
): Promise<void> {
    let page: JournalEntryPage | null = null;

    try {
        // Try different ways to get the current page
        if (sheet.pageIndex !== undefined && sheet.document?.pages?.contents) {
            const pageIndex = sheet.pageIndex;
            const sortedPages = sheet.document.pages.contents.sort(
                (a, b) => a.sort - b.sort,
            );
            page = sortedPages[pageIndex] as JournalEntryPage;
        } else if (
            sheet.document?.pages?.contents &&
            sheet.document.pages.contents.length > 0
        ) {
            // Fallback to first page if pageIndex is not available
            page = sheet.document.pages.contents[0] as JournalEntryPage;
        } else if (sheet.object) {
            // Try to get from the sheet's object property
            page = sheet.object as JournalEntryPage;
        }

        if (!page) {
            console.error("[PBD-Tools] Could not find page to export");
            ui.notifications.error("Could not find journal page to export");
            return;
        }
    } catch (error) {
        console.error("[PBD-Tools] Error getting journal page:", error);
        ui.notifications.error("Error accessing journal page");
        return;
    }

    await postDiscordJournalPage(channel, page);
}

export async function postDiscordJournalPage(
    channel: Channel,
    page: JournalEntryPage,
): Promise<void> {
    if (!page) {
        console.error("[PBD-Tools] No page provided to postDiscordJournalPage");
        ui.notifications.error("No journal page to export");
        return;
    }

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
        await postDiscordMessage(channel, formData);

        // Notify user of successful share
        ui.notifications.info(
            `Journal page "${page.name}" shared to Discord ${channel.toUpperCase()} channel`,
        );
    }
}

export async function postDiscordJournalSelection(
    channel: Channel,
    selection: string,
): Promise<void> {
    // Use the async version that resolves UUIDs
    const { convertToMarkdownAsync } = await import("./helpers.ts");
    const content = await convertToMarkdownAsync(selection);

    // Pre-validate content length before creating FormData
    const validationResult = validateDiscordMessage(content, []);
    if (!handleValidationResult(validationResult, "journal selection")) {
        return; // Exit if validation fails
    }

    const username = getChannelUsername(channel);
    const avatarLink = await generateImageLink(getChannelAvatar(channel));
    const formData = createDiscordFormData(username, avatarLink, content, []);
    await postDiscordMessage(channel, formData);

    // Notify user of successful share
    ui.notifications.info(
        `Journal selection shared to Discord ${channel.toUpperCase()} channel`,
    );
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
