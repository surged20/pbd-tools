import TurndownService from "turndown";

import {
    MODULE_NAME,
    DISCORD_API_BASE,
    Channel,
    Channels,
    type GameChannelConfig,
} from "./constants.ts";
import type { ActorPF2e } from "foundry-pf2e";

const SUPERSCRIPTS = {
    " ": " ",
    "0": "⁰",
    "1": "¹",
    "2": "²",
    "3": "³",
    "4": "⁴",
    "5": "⁵",
    "6": "⁶",
    "7": "⁷",
    "8": "⁸",
    "9": "⁹",
    "+": "⁺",
    "-": "⁻",
    "(": "⁽",
    ")": "⁾",
    a: "ᵃ",
    b: "ᵇ",
    c: "ᶜ",
    d: "ᵈ",
    e: "ᵉ",
    f: "ᶠ",
    g: "ᵍ",
    h: "ʰ",
    i: "ⁱ",
    j: "ʲ",
    k: "ᵏ",
    l: "ˡ",
    m: "ᵐ",
    n: "ⁿ",
    o: "ᵒ",
    p: "ᵖ",
    q: "۹",
    r: "ʳ",
    s: "ˢ",
    t: "ᵗ",
    u: "ᵘ",
    v: "ᵛ",
    w: "ʷ",
    x: "ˣ",
    y: "ʸ",
    z: "ᶻ",
};

export function toSuperScript(text: string): string {
    const lowerText = text.toLowerCase();
    return lowerText
        .split("")
        .map(function (c) {
            if (c in SUPERSCRIPTS) {
                return SUPERSCRIPTS[c];
            }
            return "";
        })
        .join("");
}

export function convertToMarkdown(html: string): string {
    const turndownService = new TurndownService({
        headingStyle: "atx",
        codeBlockStyle: "fenced",
    });
    turndownService.addRule("image", {
        filter: ["img"],
        replacement: function (_content, _node) {
            return "";
        },
    });
    return turndownService.turndown(html);
}

// Async version that resolves UUIDs - import from uuid-resolver to avoid circular imports
export async function convertToMarkdownAsync(html: string): Promise<string> {
    const { convertToMarkdownWithUUIDs } = await import("./uuid-resolver.ts");
    return convertToMarkdownWithUUIDs(html);
}

export function isComplexHazard(actor: ActorPF2e): boolean {
    return actor.isOfType("hazard") && actor.isComplex;
}

export function isComplexHazardOrNpc(actor: ActorPF2e): boolean {
    return (
        (actor.isOfType("hazard") && actor.isComplex) || actor.isOfType("npc")
    );
}

export function isBotModeEnabled(): boolean {
    return game.settings.get(MODULE_NAME, "bot-enabled") as boolean;
}

export function getGameChannels(): GameChannelConfig[] {
    try {
        return JSON.parse(
            game.settings.get(MODULE_NAME, "bot-game-channels") as string,
        ) as GameChannelConfig[];
    } catch {
        return [];
    }
}

export function getGameChannelByTag(
    tag: string,
): GameChannelConfig | undefined {
    return getGameChannels().find((gc) => gc.tag === tag);
}

export function isChannelActive(channel: Channel): boolean {
    if (isBotModeEnabled()) {
        const gc = getGameChannelByTag(channel);
        return (
            gc !== undefined && gc.webhookId !== "" && gc.webhookToken !== ""
        );
    }

    let url;
    switch (channel) {
        case Channel.IC:
            url = game.settings.get(MODULE_NAME, "ic-url");
            break;
        case Channel.OOC:
            url = game.settings.get(MODULE_NAME, "ooc-url");
            break;
        case Channel.GM:
            url = game.settings.get(MODULE_NAME, "gm-url");
            break;
    }
    return url !== "";
}

export function getActiveChannels(): Record<string, string> {
    if (isBotModeEnabled()) {
        const channels: Record<string, string> = {};
        for (const gc of getGameChannels()) {
            if (gc.webhookId && gc.webhookToken) {
                const tag = gc.tag as keyof typeof Channels;
                if (tag in Channels) {
                    channels[gc.tag] = game.i18n.localize(Channels[tag]);
                } else {
                    channels[gc.tag] = gc.tag.toUpperCase();
                }
            }
        }
        return channels;
    }

    const channels = {};
    for (const key in Channels) {
        if (isChannelActive(key as Channel)) {
            channels[key] = game.i18n.localize(Channels[key]);
        }
    }
    return channels;
}

export function getChannelWebhookUrl(channel: Channel): string {
    if (isBotModeEnabled()) {
        const gc = getGameChannelByTag(channel);
        if (gc) {
            return `${DISCORD_API_BASE}/webhooks/${gc.webhookId}/${gc.webhookToken}`;
        }
        return "";
    }

    switch (channel) {
        case Channel.IC:
            return game.settings.get(MODULE_NAME, "ic-url") as string;
        case Channel.OOC:
            return game.settings.get(MODULE_NAME, "ooc-url") as string;
        case Channel.GM:
            return game.settings.get(MODULE_NAME, "gm-url") as string;
    }
}

export function getChannelUsername(channel: Channel): string {
    if (isBotModeEnabled()) {
        const gc = getGameChannelByTag(channel);
        if (gc) return gc.gmUsername;
        return "Gamemaster";
    }

    switch (channel) {
        case Channel.IC:
            return game.settings.get(MODULE_NAME, "ic-username") as string;
        case Channel.OOC:
            return game.settings.get(MODULE_NAME, "ooc-username") as string;
        case Channel.GM:
            return game.settings.get(MODULE_NAME, "gm-username") as string;
    }
}

export function getChannelAvatar(channel: Channel): string {
    if (isBotModeEnabled()) {
        const gc = getGameChannelByTag(channel);
        if (gc) return gc.gmAvatar;
        return "icons/vtt-512.png";
    }

    switch (channel) {
        case Channel.IC:
            return game.settings.get(MODULE_NAME, "ic-avatar") as string;
        case Channel.OOC:
            return game.settings.get(MODULE_NAME, "ooc-avatar") as string;
        case Channel.GM:
            return game.settings.get(MODULE_NAME, "gm-avatar") as string;
    }
}
