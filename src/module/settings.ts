import { MODULE_NAME, Channel } from "./constants.ts";
import { UserPingConfig } from "./user-ping-config.ts";

/**
 * Initializes settings. Must be called only once.
 */
export function registerSettings() {
    game.settings.registerMenu(MODULE_NAME, "user-ping-config", {
        name: game.i18n.localize(`${MODULE_NAME}.Setting.UserPingConfig.Name`),
        label: game.i18n.localize(`${MODULE_NAME}.Setting.UserPingConfig.Label`),
        hint: game.i18n.localize(`${MODULE_NAME}.Setting.UserPingConfig.Hint`),
        icon: 'fas fa-cogs',
        type: UserPingConfig,
        restricted: true
    });
    UserPingConfig.registerSettings();

    game.settings.register(MODULE_NAME, "gm-url", {
        name: game.i18n.localize(`${MODULE_NAME}.Setting.GmUrl.Name`),
        hint: game.i18n.localize(`${MODULE_NAME}.Setting.GmUrl.Hint`),
        scope: "world",
        config: true,
        type: String,
        default: "",
        requiresReload: true
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
        filePicker: "image"
    });

    game.settings.register(MODULE_NAME, "ic-url", {
        name: game.i18n.localize(`${MODULE_NAME}.Setting.IcUrl.Name`),
        hint: game.i18n.localize(`${MODULE_NAME}.Setting.IcUrl.Hint`),
        scope: "world",
        config: true,
        type: String,
        default: "",
        requiresReload: true
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
        filePicker: "image"
    });


    game.settings.register(MODULE_NAME, "ooc-url", {
        name: game.i18n.localize(`${MODULE_NAME}.Setting.OocUrl.Name`),
        hint: game.i18n.localize(`${MODULE_NAME}.Setting.OocUrl.Hint`),
        scope: "world",
        config: true,
        type: String,
        default: "",
        requiresReload: true
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
        filePicker: "image"
    });

    game.settings.register(MODULE_NAME, "override-remote-url", {
        name: game.i18n.localize(`${MODULE_NAME}.Setting.OverrideRemoteUrl.Name`),
        hint: game.i18n.localize(`${MODULE_NAME}.Setting.OverrideRemoteUrl.Hint`),
        scope: "world",
        config: true,
        type: String,
        default: "",
        requiresReload: true
    });
}

export function isChannelActive(channel: Channel) {
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

export function getChannelWebhookUrl(channel: Channel) {
    switch (channel) {
        case Channel.IC:
            return game.settings.get(MODULE_NAME, "ic-url");
        case Channel.OOC:
            return game.settings.get(MODULE_NAME, "ooc-url");
        case Channel.GM:
            return game.settings.get(MODULE_NAME, "gm-url");
    }
}

export function getChannelUsername(channel: Channel) {
    switch (channel) {
        case Channel.IC:
            return game.settings.get(MODULE_NAME, "ic-username");
        case Channel.OOC:
            return game.settings.get(MODULE_NAME, "ooc-username");
        case Channel.GM:
            return game.settings.get(MODULE_NAME, "gm-username");
    }
}

export function getChannelAvatar(channel: Channel) {
    switch (channel) {
        case Channel.IC:
            return game.settings.get(MODULE_NAME, "ic-avatar");
        case Channel.OOC:
            return game.settings.get(MODULE_NAME, "ooc-avatar");
        case Channel.GM:
            return game.settings.get(MODULE_NAME, "gm-avatar");
    }
}