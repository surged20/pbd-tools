export const MODULE_NAME = "pbd-tools";

export const DEFAULT_AVATAR = "icons/vtt-512.png";

export const DEFAULT_CHANNEL_USERNAME = "PbDT";
export const DEFAULT_CHANNEL_AVATAR = "icons/vtt-512.png";

export const DISCORD_API_BASE = "https://discord.com/api/v10";

export const DEFAULT_PROXY_URL = "http://127.0.0.1:3001";

export const RPGSAGE_APP_ID_DEFAULT = "644942473315090434";

export interface GameChannelConfig {
    channelId: string;
    channelName: string;
    threadId?: string;
    threadName?: string;
    webhookId: string;
    webhookToken: string;
    username: string;
    avatar: string;
    mode: "bot" | "manual";
}

export type ChannelTargetId = string;

export function makeChannelTargetId(
    config: GameChannelConfig,
): ChannelTargetId {
    return config.threadId
        ? `${config.channelId}/${config.threadId}`
        : config.channelId;
}

export function parseChannelTargetId(targetId: ChannelTargetId): {
    channelId: string;
    threadId?: string;
} {
    const parts = targetId.split("/");
    return {
        channelId: parts[0],
        threadId: parts[1] || undefined,
    };
}

export function isPF2e(): boolean {
    return game.system.id === "pf2e";
}

export type DiscordEmbed = {
    title?: string;
    description?: string;
    url?: string;
    color?: number;
    footer?: {
        text?: string;
        icon_url?: string;
    };
    image?: {
        url?: string;
    };
    thumbnail?: {
        url?: string;
    };
    author?: {
        name?: string;
        url?: string;
        icon_url?: string;
    };
};

export type DiscordWebhookData = {
    content: string;
    embeds: DiscordEmbed[];
};
