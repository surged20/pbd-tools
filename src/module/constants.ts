export const MODULE_NAME = "pbd-tools";

export const enum Channel {
    IC = "ic",
    OOC = "ooc",
    GM = "gm",
}

export const Channels = {
    ic: `${MODULE_NAME}.Channels.InCharacter`,
    ooc: `${MODULE_NAME}.Channels.OutOfCharacter`,
    gm: `${MODULE_NAME}.Channels.GameMaster`,
};

export const DEFAULT_AVATAR = "icons/vtt-512.png";

export const DISCORD_API_BASE = "https://discord.com/api/v10";

export const DEFAULT_PROXY_URL = "http://127.0.0.1:3001";

export const RPGSAGE_APP_ID_DEFAULT = "644942473315090434";

export interface GameChannelConfig {
    channelId: string;
    channelName: string;
    tag: string;
    webhookId: string;
    webhookToken: string;
    gmUsername: string;
    gmAvatar: string;
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
