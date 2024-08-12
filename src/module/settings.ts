import { MODULE_NAME, Channel, Channels } from "./constants.ts";
import { UserMentionConfig } from "./user-mention-config.ts";

/**
 * Initializes settings. Must be called only once.
 */
export function registerSettings(): void {
    game.settings.registerMenu(MODULE_NAME, "user-mention-config", {
        name: game.i18n.localize(
            `${MODULE_NAME}.Setting.UserMentionConfig.Name`,
        ),
        label: game.i18n.localize(
            `${MODULE_NAME}.Setting.UserMentionConfig.Label`,
        ),
        hint: game.i18n.localize(
            `${MODULE_NAME}.Setting.UserMentionConfig.Hint`,
        ),
        icon: "fas fa-cogs",
        type: UserMentionConfig,
        restricted: true,
    });
    UserMentionConfig.registerSettings();

    game.settings.register(MODULE_NAME, "gm-url", {
        name: game.i18n.localize(`${MODULE_NAME}.Setting.GmUrl.Name`),
        hint: game.i18n.localize(`${MODULE_NAME}.Setting.GmUrl.Hint`),
        scope: "world",
        config: true,
        type: String,
        default: "",
        requiresReload: true,
    });

    game.settings.register(MODULE_NAME, "gm-username", {
        name: game.i18n.localize(`${MODULE_NAME}.Setting.GmUserName.Name`),
        hint: game.i18n.localize(`${MODULE_NAME}.Setting.GmUserName.Hint`),
        scope: "world",
        config: true,
        type: String,
        default: "Gamemaster",
    });

    game.settings.register(MODULE_NAME, "gm-avatar", {
        name: game.i18n.localize(`${MODULE_NAME}.Setting.GmAvatar.Name`),
        hint: game.i18n.localize(`${MODULE_NAME}.Setting.GmAvatar.Hint`),
        scope: "world",
        config: true,
        type: String,
        default: "icons/vtt-512.png",
        filePicker: "image",
    });

    game.settings.register(MODULE_NAME, "ic-url", {
        name: game.i18n.localize(`${MODULE_NAME}.Setting.IcUrl.Name`),
        hint: game.i18n.localize(`${MODULE_NAME}.Setting.IcUrl.Hint`),
        scope: "world",
        config: true,
        type: String,
        default: "",
        requiresReload: true,
    });

    game.settings.register(MODULE_NAME, "ic-username", {
        name: game.i18n.localize(`${MODULE_NAME}.Setting.IcUserName.Name`),
        hint: game.i18n.localize(`${MODULE_NAME}.Setting.IcUserName.Hint`),
        scope: "world",
        config: true,
        type: String,
        default: "Gamemaster",
    });

    game.settings.register(MODULE_NAME, "ic-avatar", {
        name: game.i18n.localize(`${MODULE_NAME}.Setting.IcAvatar.Name`),
        hint: game.i18n.localize(`${MODULE_NAME}.Setting.IcAvatar.Hint`),
        scope: "world",
        config: true,
        type: String,
        default: "icons/vtt-512.png",
        filePicker: "image",
    });

    game.settings.register(MODULE_NAME, "ooc-url", {
        name: game.i18n.localize(`${MODULE_NAME}.Setting.OocUrl.Name`),
        hint: game.i18n.localize(`${MODULE_NAME}.Setting.OocUrl.Hint`),
        scope: "world",
        config: true,
        type: String,
        default: "",
        requiresReload: true,
    });

    game.settings.register(MODULE_NAME, "ooc-username", {
        name: game.i18n.localize(`${MODULE_NAME}.Setting.OocUserName.Name`),
        hint: game.i18n.localize(`${MODULE_NAME}.Setting.OocUserName.Hint`),
        scope: "world",
        config: true,
        type: String,
        default: "Gamemaster",
    });

    game.settings.register(MODULE_NAME, "ooc-avatar", {
        name: game.i18n.localize(`${MODULE_NAME}.Setting.OocAvatar.Name`),
        hint: game.i18n.localize(`${MODULE_NAME}.Setting.OocAvatar.Hint`),
        scope: "world",
        config: true,
        type: String,
        default: "icons/vtt-512.png",
        filePicker: "image",
    });

    game.settings.register(MODULE_NAME, "pc-export-channel", {
        name: game.i18n.localize(`${MODULE_NAME}.Setting.PcExportChannel.Name`),
        hint: game.i18n.localize(`${MODULE_NAME}.Setting.PcExportChannel.Hint`),
        scope: "world",
        config: true,
        type: String,
        choices: {
            ic: game.i18n.localize(Channels.ic),
            ooc: game.i18n.localize(Channels.ooc),
            gm: game.i18n.localize(Channels.gm),
        },
        default: "ooc",
        onChange: (value) => {
            console.log(value);
        },
    });

    game.settings.register(MODULE_NAME, "override-remote-url", {
        name: game.i18n.localize(
            `${MODULE_NAME}.Setting.OverrideRemoteUrl.Name`,
        ),
        hint: game.i18n.localize(
            `${MODULE_NAME}.Setting.OverrideRemoteUrl.Hint`,
        ),
        scope: "world",
        config: true,
        type: String,
        default: "",
        requiresReload: true,
    });
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
