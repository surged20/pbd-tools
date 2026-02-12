import {
    MODULE_NAME,
    type DiscordEmbed,
    type ChannelTargetId,
} from "./constants.ts";
import { generateImageLink } from "./images.ts";
import { createJournalData } from "./journals.ts";
import {
    resolveChannel,
    getChannelTargetUsername,
    getChannelTargetAvatar,
    isChannelTargetActive,
    getAllGameChannels,
} from "./helpers.ts";
import {
    validateDiscordMessage,
    handleValidationResult,
} from "./discord-validation.ts";
import { executeWebhookFormData, createWebhook } from "./discord-bot.ts";
import { makeChannelTargetId } from "./constants.ts";

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
    targetId: ChannelTargetId,
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
        }
    }

    const resolved = resolveChannel(targetId);
    if (!resolved) {
        console.error(
            `[PBD-Tools] No channel configured for target ${targetId}`,
        );
        return;
    }

    try {
        const response = await executeWebhookFormData(
            resolved.webhookId,
            resolved.webhookToken,
            formData,
            resolved.threadId,
        );

        if (response.status === 404 && resolved.mode === "bot") {
            // Webhook was deleted externally, try to recreate
            console.warn(
                `[PBD-Tools] Webhook for ${targetId} returned 404, recreating...`,
            );
            const token = game.settings.get(MODULE_NAME, "bot-token") as string;
            if (!token) return;

            // Find the channel config to get the channelId for webhook creation
            const allChannels = getAllGameChannels();
            const idx = allChannels.findIndex(
                (c) => makeChannelTargetId(c) === targetId,
            );
            if (idx === -1) return;
            const gc = allChannels[idx];

            try {
                const newWebhook = await createWebhook(
                    token,
                    gc.channelId,
                    "PBD-Tools",
                );
                gc.webhookId = newWebhook.id;
                gc.webhookToken = newWebhook.token ?? "";

                // Persist the updated config
                allChannels[idx] = gc;
                await game.settings.set(
                    MODULE_NAME,
                    "game-channels",
                    JSON.stringify(allChannels),
                );

                // Retry with new webhook
                const retryResponse = await executeWebhookFormData(
                    gc.webhookId,
                    gc.webhookToken,
                    formData,
                    resolved.threadId,
                );
                if (!retryResponse.ok) {
                    console.error(
                        `[PBD-Tools] Retry failed: ${retryResponse.status} ${retryResponse.statusText}`,
                    );
                }
            } catch (recreateError) {
                console.error(
                    "[PBD-Tools] Failed to recreate webhook:",
                    recreateError,
                );
                ui.notifications.error(
                    "Discord webhook is invalid and could not be recreated. Ensure the CORS proxy is running, or re-add the channel in Game Channels settings.",
                );
            }
        } else if (response.status === 404 && resolved.mode === "manual") {
            console.error(
                `[PBD-Tools] Manual webhook for ${targetId} returned 404. Check your webhook URL.`,
            );
            ui.notifications.error(
                "Discord webhook returned 404. The webhook URL may be invalid.",
            );
        } else if (!response.ok) {
            console.error(
                `Discord webhook error: ${response.status} ${response.statusText}`,
            );
        }
    } catch (error) {
        console.error("Error posting to Discord:", error);
    }
}

export async function postDiscord(
    targetId: ChannelTargetId | null,
    content: string,
): Promise<void> {
    if (targetId === null) return;

    // Pre-validate content length before creating FormData
    const validationResult = validateDiscordMessage(content, []);
    if (!handleValidationResult(validationResult, "Discord message")) {
        return; // Exit if validation fails
    }

    const username = getChannelTargetUsername(targetId);
    const avatarLink = await generateImageLink(
        getChannelTargetAvatar(targetId),
    );
    const formData = createDiscordFormData(username, avatarLink, content, []);
    await postDiscordMessage(targetId, formData);
}

export async function postDiscordImage(
    targetId: ChannelTargetId,
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

    const imageLink: string = await generateImageLink(imageUrl, false);
    const params = {
        username: getChannelTargetUsername(targetId),
        avatar_url: await generateImageLink(getChannelTargetAvatar(targetId)),
        content: imageLink,
    };

    formData.append("payload_json", JSON.stringify(params));
    await postDiscordMessage(targetId, formData);

    const { getChannelDisplayName } = await import("./helpers.ts");
    ui.notifications.info(
        `Image shared to Discord ${getChannelDisplayName(targetId)}`,
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
    targetId: ChannelTargetId,
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

    await postDiscordJournalPage(targetId, page);
}

export async function postDiscordJournalPage(
    targetId: ChannelTargetId,
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
        const username: string = getChannelTargetUsername(targetId);
        const avatar: string = await generateImageLink(
            getChannelTargetAvatar(targetId),
        );
        const formData = createDiscordFormData(
            username,
            avatar,
            content,
            embeds,
        );
        await postDiscordMessage(targetId, formData);

        const { getChannelDisplayName } = await import("./helpers.ts");
        ui.notifications.info(
            `Journal page "${page.name}" shared to Discord ${getChannelDisplayName(targetId)}`,
        );
    }
}

export async function postDiscordJournalSelection(
    targetId: ChannelTargetId,
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

    const username = getChannelTargetUsername(targetId);
    const avatarLink = await generateImageLink(
        getChannelTargetAvatar(targetId),
    );
    const formData = createDiscordFormData(username, avatarLink, content, []);
    await postDiscordMessage(targetId, formData);

    const { getChannelDisplayName } = await import("./helpers.ts");
    ui.notifications.info(
        `Journal selection shared to Discord ${getChannelDisplayName(targetId)}`,
    );
}

export async function postDiscordMessageAsPersona(
    targetId: ChannelTargetId,
    content: string,
    embeds: DiscordEmbed[],
    username: string,
    avatarUrl: string,
): Promise<void> {
    if (!isChannelTargetActive(targetId)) return;

    const validationResult = validateDiscordMessage(content, embeds);
    if (!handleValidationResult(validationResult, "Discord message")) {
        return;
    }

    const formData = createDiscordFormData(
        username,
        avatarUrl,
        content,
        embeds,
    );
    await postDiscordMessage(targetId, formData);
}
