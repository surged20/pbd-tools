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

export function isPF2e(): boolean {
    return game.system.id === "pf2e";
}

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
