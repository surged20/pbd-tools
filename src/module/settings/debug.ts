import type { FormApplicationOptions } from "foundry-pf2e/foundry/client/appv1/api/form-application-v1.mjs";
import { MODULE_NAME } from "../constants.ts";
import {
    SettingsMenuPbdTools,
    type ExtendedSettingRegistration,
} from "./menu.ts";

export class DebugSettings extends SettingsMenuPbdTools {
    static override namespace = "DebugSettings";

    static override get defaultOptions(): FormApplicationOptions {
        return fu.mergeObject(super.defaultOptions, { height: "fit-content" });
    }

    public static override get settings(): Record<
        string,
        ExtendedSettingRegistration
    > {
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
