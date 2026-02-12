import TurndownService from "turndown";

import {
    MODULE_NAME,
    DEFAULT_CHANNEL_USERNAME,
    DEFAULT_CHANNEL_AVATAR,
    type GameChannelConfig,
    type ChannelTargetId,
    makeChannelTargetId,
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

// ─── Unified target-based helpers ───────────────────────────────────────

export function getAllGameChannels(): GameChannelConfig[] {
    try {
        return JSON.parse(
            game.settings.get(MODULE_NAME, "game-channels") as string,
        ) as GameChannelConfig[];
    } catch {
        return [];
    }
}

export function getGameChannelByTargetId(
    targetId: ChannelTargetId,
): GameChannelConfig | undefined {
    return getAllGameChannels().find(
        (gc) => makeChannelTargetId(gc) === targetId,
    );
}

export function isChannelTargetActive(targetId: ChannelTargetId): boolean {
    const gc = getGameChannelByTargetId(targetId);
    return gc !== undefined && gc.webhookId !== "" && gc.webhookToken !== "";
}

export function getActiveChannelTargets(): Record<ChannelTargetId, string> {
    const targets: Record<ChannelTargetId, string> = {};
    for (const gc of getAllGameChannels()) {
        if (gc.webhookId && gc.webhookToken) {
            const targetId = makeChannelTargetId(gc);
            targets[targetId] = gc.threadName
                ? gc.threadName
                : `#${gc.channelName}`;
        }
    }
    return targets;
}

export function getChannelTargetUsername(targetId: ChannelTargetId): string {
    const gc = getGameChannelByTargetId(targetId);
    return gc?.username || DEFAULT_CHANNEL_USERNAME;
}

export function getChannelTargetAvatar(targetId: ChannelTargetId): string {
    const gc = getGameChannelByTargetId(targetId);
    return gc?.avatar || DEFAULT_CHANNEL_AVATAR;
}

export interface ResolvedChannel {
    webhookId: string;
    webhookToken: string;
    threadId?: string;
    username: string;
    avatar: string;
    mode: "bot" | "manual";
}

export function resolveChannel(
    targetId: ChannelTargetId,
): ResolvedChannel | null {
    const gc = getGameChannelByTargetId(targetId);
    if (!gc || !gc.webhookId || !gc.webhookToken) return null;
    return {
        webhookId: gc.webhookId,
        webhookToken: gc.webhookToken,
        threadId: gc.threadId,
        username: gc.username || DEFAULT_CHANNEL_USERNAME,
        avatar: gc.avatar || DEFAULT_CHANNEL_AVATAR,
        mode: gc.mode,
    };
}

export function getMultiSelectChannels(settingKey: string): ChannelTargetId[] {
    try {
        const value = JSON.parse(
            game.settings.get(MODULE_NAME, settingKey) as string,
        ) as ChannelTargetId[];
        if (!Array.isArray(value) || value.length === 0) {
            // Empty array means "all active channels"
            return Object.keys(getActiveChannelTargets());
        }
        // Filter to only currently active targets
        const active = getActiveChannelTargets();
        return value.filter((id) => id in active);
    } catch {
        return Object.keys(getActiveChannelTargets());
    }
}

export function hasConfiguredChannels(): boolean {
    return Object.keys(getActiveChannelTargets()).length > 0;
}

export function getChannelDisplayName(targetId: ChannelTargetId): string {
    const targets = getActiveChannelTargets();
    return targets[targetId] || targetId;
}
