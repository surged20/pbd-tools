import { MODULE_NAME } from "../constants.ts";
import { SettingsMenuPbdTools } from "./menu.ts";

export class DiscordWebhookSettings extends SettingsMenuPbdTools {
    static override namespace = "DiscordWebhookSettings";

    static override get defaultOptions(): FormApplicationOptions {
        return fu.mergeObject(super.defaultOptions, { height: "fit-content" });
    }

    protected override async _updateObject(
        event: Event,
        data: Record<string, unknown>,
    ): Promise<void> {
        await super._updateObject(event, data);
        SettingsConfig.reloadConfirm({ world: true });
    }

    public static override get settings(): Record<string, SettingRegistration> {
        return {
            "gm-url": {
                name: `${MODULE_NAME}.Setting.GmUrl.Name`,
                hint: `${MODULE_NAME}.Setting.GmUrl.Hint`,
                scope: "world",
                config: true,
                type: String,
                default: "",
                onChange: () => {
                    SettingsConfig.reloadConfirm();
                },
            },
            "gm-username": {
                name: `${MODULE_NAME}.Setting.GmUserName.Name`,
                hint: `${MODULE_NAME}.Setting.GmUserName.Hint`,
                scope: "world",
                config: true,
                type: String,
                default: "Gamemaster",
            },
            "gm-avatar": {
                name: `${MODULE_NAME}.Setting.GmAvatar.Name`,
                hint: `${MODULE_NAME}.Setting.GmAvatar.Hint`,
                scope: "world",
                config: true,
                type: String,
                default: "icons/vtt-512.png",
                filePicker: "image",
            },
            "ic-url": {
                name: `${MODULE_NAME}.Setting.IcUrl.Name`,
                hint: `${MODULE_NAME}.Setting.IcUrl.Hint`,
                scope: "world",
                config: true,
                type: String,
                default: "",
                onChange: () => {
                    SettingsConfig.reloadConfirm();
                },
            },
            "ic-username": {
                name: `${MODULE_NAME}.Setting.IcUserName.Name`,
                hint: `${MODULE_NAME}.Setting.IcUserName.Hint`,
                scope: "world",
                config: true,
                type: String,
                default: "Gamemaster",
            },
            "ic-avatar": {
                name: `${MODULE_NAME}.Setting.IcAvatar.Name`,
                hint: `${MODULE_NAME}.Setting.IcAvatar.Hint`,
                scope: "world",
                config: true,
                type: String,
                default: "icons/vtt-512.png",
                filePicker: "image",
            },
            "ooc-url": {
                name: `${MODULE_NAME}.Setting.OocUrl.Name`,
                hint: `${MODULE_NAME}.Setting.OocUrl.Hint`,
                scope: "world",
                config: true,
                type: String,
                default: "",
                onChange: () => {
                    SettingsConfig.reloadConfirm();
                },
            },
            "ooc-username": {
                name: `${MODULE_NAME}.Setting.OocUserName.Name`,
                hint: `${MODULE_NAME}.Setting.OocUserName.Hint`,
                scope: "world",
                config: true,
                type: String,
                default: "Gamemaster",
            },
            "ooc-avatar": {
                name: `${MODULE_NAME}.Setting.OocAvatar.Name`,
                hint: `${MODULE_NAME}.Setting.OocAvatar.Hint`,
                scope: "world",
                config: true,
                type: String,
                default: "icons/vtt-512.png",
                filePicker: "image",
            },
        };
    }
}
