import { MODULE_NAME } from "../constants.ts";
import { SettingsMenuPbdTools } from "./menu.ts";

export class DebugSettings extends SettingsMenuPbdTools {
    static override namespace = "DebugSettings";

    static override get defaultOptions(): FormApplicationOptions {
        return fu.mergeObject(super.defaultOptions, { height: "fit-content" });
    }

    public static override get settings(): Record<string, SettingRegistration> {
        return {
            "override-remote-url": {
                name: `${MODULE_NAME}.Setting.OverrideRemoteUrl.Name`,
                hint: `${MODULE_NAME}.Setting.OverrideRemoteUrl.Hint`,
                scope: "world",
                config: true,
                type: String,
                default: "",
                requiresReload: true,
            },
        };
    }
}
