import { MODULE_NAME } from "../constants.ts";
import {
    SettingsMenuPbdTools,
    type ExtendedSettingRegistration,
} from "./menu.ts";
import { getActiveChannels } from "../helpers.ts";
import type { FormApplicationOptions } from "foundry-pf2e/foundry/client/appv1/api/form-application-v1.mjs";

export class TrackerSettings extends SettingsMenuPbdTools {
    static override namespace = "TrackerSettings";

    static override get defaultOptions(): FormApplicationOptions {
        return fu.mergeObject(super.defaultOptions, { height: "fit-content" });
    }

    public static override get settings(): Record<
        string,
        ExtendedSettingRegistration
    > {
        const activeChannels = getActiveChannels();
        return {
            "enable-discord-tracker": {
                name: `${MODULE_NAME}.Setting.EnableDiscordTracker.Name`,
                hint: `${MODULE_NAME}.Setting.EnableDiscordTracker.Hint`,
                scope: "world",
                config: true,
                type: Boolean,
                default: false,
                onChange: () => {
                    ui.combat.render();
                },
            },
            "tracker-output-channel": {
                name: `${MODULE_NAME}.Setting.TrackerOutputChannel.Name`,
                hint: `${MODULE_NAME}.Setting.TrackerOutputChannel.Hint`,
                scope: "world",
                config: true,
                type: String,
                choices: activeChannels,
                default: Object.keys(activeChannels)[0],
            },
            "tracker-mode": {
                name: `${MODULE_NAME}.Setting.TrackerMode.Name`,
                hint: `${MODULE_NAME}.Setting.TrackerMode.Hint`,
                scope: "world",
                config: true,
                type: String,
                choices: {
                    compact: game.i18n.localize(
                        `${MODULE_NAME}.Setting.TrackerModeCompact`,
                    ),
                    wide: game.i18n.localize(
                        `${MODULE_NAME}.Setting.TrackerModeWide`,
                    ),
                    custom: game.i18n.localize(
                        `${MODULE_NAME}.Setting.TrackerModeCustom`,
                    ),
                },
                default: "compact",
            },
            "tracker-begin-end": {
                name: `${MODULE_NAME}.Setting.TrackerBeginEnd.Name`,
                hint: `${MODULE_NAME}.Setting.TrackerBeginEnd.Hint`,
                scope: "world",
                config: true,
                type: Boolean,
                default: false,
            },
            "tracker-ac-display": {
                name: `${MODULE_NAME}.Setting.TrackerAcDisplay.Name`,
                hint: `${MODULE_NAME}.Setting.TrackerAcDisplay.Hint`,
                scope: "world",
                config: true,
                type: String,
                choices: {
                    none: game.i18n.localize(
                        `${MODULE_NAME}.Setting.TrackerAcDisplayNone`,
                    ),
                    alias: game.i18n.localize(
                        `${MODULE_NAME}.Setting.TrackerAcDisplayAlias`,
                    ),
                    value: game.i18n.localize(
                        `${MODULE_NAME}.Setting.TrackerAcDisplayValue`,
                    ),
                },
                default: "none",
            },
            "tracker-hp-display": {
                name: `${MODULE_NAME}.Setting.TrackerHpDisplay.Name`,
                hint: `${MODULE_NAME}.Setting.TrackerHpDisplay.Hint`,
                scope: "world",
                config: true,
                type: String,
                choices: {
                    none: game.i18n.localize(
                        `${MODULE_NAME}.Setting.TrackerHpDisplayNone`,
                    ),
                    pc: game.i18n.localize(
                        `${MODULE_NAME}.Setting.TrackerHpDisplayPc`,
                    ),
                    pcfoe: game.i18n.localize(
                        `${MODULE_NAME}.Setting.TrackerHpDisplayPcFoe`,
                    ),
                },
                default: "pcfoe",
            },
            "tracker-alias-display": {
                name: `${MODULE_NAME}.Setting.TrackerAliasDisplay.Name`,
                hint: `${MODULE_NAME}.Setting.TrackerAliasDisplay.Hint`,
                scope: "world",
                config: true,
                type: Boolean,
                default: false,
            },
            "tracker-hero-points-display": {
                name: `${MODULE_NAME}.Setting.TrackerHeroPointsDisplay.Name`,
                hint: `${MODULE_NAME}.Setting.TrackerHeroPointsDisplay.Hint`,
                scope: "world",
                config: true,
                type: Boolean,
                default: true,
            },
            "tracker-conditions-display": {
                name: `${MODULE_NAME}.Setting.TrackerConditionsDisplay.Name`,
                hint: `${MODULE_NAME}.Setting.TrackerConditionsDisplay.Hint`,
                scope: "world",
                config: true,
                type: Boolean,
                default: true,
            },
            "tracker-user-mention": {
                name: `${MODULE_NAME}.Setting.TrackerUserMention.Name`,
                hint: `${MODULE_NAME}.Setting.TrackerUserMention.Hint`,
                scope: "world",
                config: true,
                type: Boolean,
                default: true,
            },
            "tracker-status-header": {
                name: `${MODULE_NAME}.Setting.TrackerStatusHeader.Name`,
                hint: `${MODULE_NAME}.Setting.TrackerStatusHeader.Hint`,
                scope: "world",
                config: true,
                type: String,
                default: "",
            },
            "tracker-status-turn": {
                name: `${MODULE_NAME}.Setting.TrackerStatusTurn.Name`,
                hint: `${MODULE_NAME}.Setting.TrackerStatusTurn.Hint`,
                scope: "world",
                config: true,
                type: String,
                default: "🟢",
            },
            "tracker-alias-header": {
                name: `${MODULE_NAME}.Setting.TrackerAliasHeader.Name`,
                hint: `${MODULE_NAME}.Setting.TrackerAliasHeader.Hint`,
                scope: "world",
                config: true,
                type: String,
                default: "H",
            },
            "tracker-initiative-header": {
                name: `${MODULE_NAME}.Setting.TrackerInitiativeHeader.Name`,
                hint: `${MODULE_NAME}.Setting.TrackerInitiativeHeader.Hint`,
                scope: "world",
                config: true,
                type: String,
                default: "Init",
            },
            "tracker-hero-points-header": {
                name: `${MODULE_NAME}.Setting.TrackerHeroPointsHeader.Name`,
                hint: `${MODULE_NAME}.Setting.TrackerHeroPointsHeader.Hint`,
                scope: "world",
                config: true,
                type: String,
                default: "H",
            },
            "tracker-ac-header": {
                name: `${MODULE_NAME}.Setting.TrackerAcHeader.Name`,
                hint: `${MODULE_NAME}.Setting.TrackerAcHeader.Hint`,
                scope: "world",
                config: true,
                type: String,
                default: "AC",
            },
            "tracker-hp-header": {
                name: `${MODULE_NAME}.Setting.TrackerHpHeader.Name`,
                hint: `${MODULE_NAME}.Setting.TrackerHpHeader.Hint`,
                scope: "world",
                config: true,
                type: String,
                default: "HP",
            },
        };
    }
}
