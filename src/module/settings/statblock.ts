import { MODULE_NAME } from "../constants.ts";
import { SettingsMenuPbdTools } from "./menu.ts";

export class StatblockSettings extends SettingsMenuPbdTools {
    static override namespace = "StatblockSettings";

    static override get defaultOptions(): FormApplicationOptions {
        return fu.mergeObject(super.defaultOptions, { height: "fit-content" });
    }

    public static override get settings(): Record<string, SettingRegistration> {
        return {
            "statblock-influence-color": {
                name: `${MODULE_NAME}.Setting.StatblockInfluenceColor.Name`,
                hint: `${MODULE_NAME}.Setting.StatblockInfluenceColor.Hint`,
                scope: "world",
                config: true,
                type: String,
                default: "#008040",
            },
            "statblock-influence-thumbnail": {
                name: `${MODULE_NAME}.Setting.StatblockInfluenceThumbnail.Name`,
                hint: `${MODULE_NAME}.Setting.StatblockInfluenceThumbnail.Hint`,
                scope: "world",
                config: true,
                type: Boolean,
                default: false,
            },
        };
    }
}
