import type { FormApplicationOptions } from "foundry-pf2e/foundry/client/appv1/api/form-application-v1.mjs";
import { MODULE_NAME } from "../constants.ts";
import { SettingsMenuPbdTools } from "./menu.ts";
import type { SettingRegistration } from "foundry-pf2e/foundry/client/helpers/client-settings.mjs";

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
