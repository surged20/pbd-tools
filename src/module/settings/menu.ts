import type { SettingRegistration } from "foundry-pf2e/foundry/client/helpers/client-settings.mjs";
import { MODULE_NAME } from "../constants.ts";
import type {
    FormApplicationData,
    FormApplicationOptions,
} from "foundry-pf2e/foundry/client/appv1/api/form-application-v1.mjs";

// Runtime globals available in Foundry
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const FormApplication: any;

// Extended setting registration that includes filePicker (Foundry feature not in types)
export type ExtendedSettingRegistration = SettingRegistration & {
    filePicker?:
        | "image"
        | "audio"
        | "video"
        | "imagevideo"
        | "folder"
        | "font"
        | "graphics"
        | "text"
        | "any";
};

export type PartialSettingsData = Omit<
    ExtendedSettingRegistration,
    "scope" | "config"
>;

interface SettingsTemplateData extends PartialSettingsData {
    key: string;
    value: unknown;
}

export interface MenuTemplateData extends FormApplicationData {
    settings: SettingsTemplateData[];
}

/** An adjusted copy of the settings menu from core pf2e meant for the module */
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export class SettingsMenuPbdTools extends FormApplication {
    static readonly namespace: string;

    static get defaultOptions(): FormApplicationOptions {
        const options = super.defaultOptions;
        return fu.mergeObject(options, {
            title: `${MODULE_NAME}.Setting.${this.namespace}.Name`,
            id: `${this.namespace}-settings`,
            template: `modules/pbd-tools/templates/menu.hbs`,
            classes: ["form", "pbd-tools", "settings-menu"],
            width: 780,
            height: 680,
            closeOnSubmit: true,
            resizable: true,
        });
    }

    get namespace(): string {
        return (this.constructor as typeof SettingsMenuPbdTools).namespace;
    }

    /** Settings to be registered and also later referenced during user updates */
    protected static get settings(): Record<string, PartialSettingsData> {
        return {};
    }

    static registerSettings(): void {
        const settings = this.settings;
        for (const setting of Object.keys(settings)) {
            game.settings.register(MODULE_NAME, setting, {
                ...settings[setting],
                config: false,
            });
        }
    }

    static hideForm(form: HTMLElement, boolean: boolean): void {
        form.style.display = !boolean ? "none" : "";
    }

    static registerSettingsAndCreateMenu(
        icon: string,
        restricted = true,
    ): void {
        game.settings.registerMenu(MODULE_NAME, this.namespace, {
            name: `${MODULE_NAME}.Setting.${this.namespace}.Name`,
            label: `${MODULE_NAME}.Setting.${this.namespace}.Label`,
            hint: `${MODULE_NAME}.Setting.${this.namespace}.Hint`,
            icon: icon,
            // @ts-expect-error - Runtime registration works correctly
            type: this,
            restricted: restricted,
        });
        this.registerSettings();
    }

    getData(): MenuTemplateData {
        const settings = (this.constructor as typeof SettingsMenuPbdTools)
            .settings;
        const templateData: SettingsTemplateData[] = Object.entries(
            settings,
        ).map(([key, setting]) => {
            const value = game.settings.get(MODULE_NAME, key);
            return {
                ...setting,
                key,
                value,
                isCheckbox: setting.type === Boolean,
                isFilepicker: setting.type === String && setting.filePicker,
                isNumber: setting.type === Number,
                isSelect: !!setting.choices,
                isText: setting.type === String && !setting.filePicker,
            };
        });
        return <MenuTemplateData>fu.mergeObject(super.getData(), {
            settings: templateData,
            instructions: `${MODULE_NAME}.SETTINGS.${this.namespace}.hint`, // lgtm [js/mixed-static-instance-this-access]
        });
    }

    protected async _updateObject(
        _event: Event,
        data: Record<string, unknown>,
    ): Promise<void> {
        for (const key of Object.keys(data)) {
            let datum = data[key];
            // "null" check is due to a previous bug that may have left invalid data in text fields
            if (datum === null || datum === "null") {
                datum = "";
            }
            // If statement handles bug in foundry
            if (!["submit", "reset"].includes(key)) {
                await game.settings.set(MODULE_NAME, key, datum);
            }
        }
    }
}
