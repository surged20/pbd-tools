import { MODULE_NAME } from "../constants.ts";
import { SettingsMenuPbdTools } from "./menu.ts";
import { getActiveChannels } from "../helpers.ts";

export class ExportSettings extends SettingsMenuPbdTools {
    static override namespace = "ExportSettings";

    static override get defaultOptions(): FormApplicationOptions {
        return fu.mergeObject(super.defaultOptions, { height: "fit-content" });
    }

    public static override get settings(): Record<string, SettingRegistration> {
        const activeChannels = getActiveChannels();
        return {
            "post-pc-to-discord": {
                name: `${MODULE_NAME}.Setting.PostPcToDiscord.Name`,
                hint: `${MODULE_NAME}.Setting.PostPcToDiscord.Hint`,
                scope: "world",
                config: true,
                type: Boolean,
                default: false,
            },
            "pc-export-channel": {
                name: `${MODULE_NAME}.Setting.PcExportChannel.Name`,
                hint: `${MODULE_NAME}.Setting.PcExportChannel.Hint`,
                scope: "world",
                config: true,
                type: String,
                choices: activeChannels,
                default: Object.keys(activeChannels)[0],
            },
            "npc-export-server": {
                name: `${MODULE_NAME}.Setting.NpcExportServer.Name`,
                hint: `${MODULE_NAME}.Setting.NpcExportServer.Hint`,
                scope: "world",
                config: true,
                type: Boolean,
                default: true,
                onChange: () => {
                    SettingsConfig.reloadConfirm();
                },
            },
            "post-npc-to-discord": {
                name: `${MODULE_NAME}.Setting.PostNpcToDiscord.Name`,
                hint: `${MODULE_NAME}.Setting.PostNpcToDiscord.Hint`,
                scope: "world",
                config: true,
                type: Boolean,
                default: false,
            },
            "abbr-length": {
                name: `${MODULE_NAME}.Setting.AbbrLength.Name`,
                hint: `${MODULE_NAME}.Setting.AbbrLength.Hint`,
                scope: "world",
                config: true,
                type: Number,
                default: 5,
            },
            "abbr-strict": {
                name: `${MODULE_NAME}.Setting.AbbrStrict.Name`,
                hint: `${MODULE_NAME}.Setting.AbbrStrict.Hint`,
                scope: "world",
                config: true,
                type: Boolean,
                default: true,
            },
        };
    }
}
