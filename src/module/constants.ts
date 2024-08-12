export const MODULE_NAME = "pbd-tools";

export const enum Channel {
    IC = 0,
    OOC,
    GM,
}

export const Channels = {
    ic: `${MODULE_NAME}.Channels.InCharacter`,
    ooc: `${MODULE_NAME}.Channels.OutOfCharacter`,
    gm: `${MODULE_NAME}.Channels.GameMaster`,
};

export const channelId = {
    ic: Channel.IC,
    ooc: Channel.OOC,
    gm: Channel.GM,
};

export const DEFAULT_AVATAR = "icons/vtt-512.png";

export function isPF2e(): boolean {
    return game.system.id === "pf2e";
}

export const actorType = {
    character: "pc",
    npc: "npc",
};

export type DiscordEmbed = {
    title?: string;
    description?: string;
    url?: string;
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
    footer?: {
        text?: string;
        icon_url?: string;
    };
};

export type DiscordWebhookData = {
    content: string;
    embeds: DiscordEmbed[];
};
