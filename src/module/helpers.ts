import TurndownService from "turndown";

import { MODULE_NAME, Channel, Channels } from "./constants.ts";
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
    const { convertToMarkdownWithUUIDs } = await import('./uuid-resolver.ts');
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

export function isChannelActive(channel: Channel): boolean {
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
    const channels = {};
    for (const key in Channels) {
        if (isChannelActive(key as Channel)) {
            channels[key] = game.i18n.localize(Channels[key]);
        }
    }
    return channels;
}

export function getChannelWebhookUrl(channel: Channel): string {
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
    switch (channel) {
        case Channel.IC:
            return game.settings.get(MODULE_NAME, "ic-avatar") as string;
        case Channel.OOC:
            return game.settings.get(MODULE_NAME, "ooc-avatar") as string;
        case Channel.GM:
            return game.settings.get(MODULE_NAME, "gm-avatar") as string;
    }
}
