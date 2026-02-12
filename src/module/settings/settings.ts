import { MODULE_NAME } from "../constants.ts";
import { GameChannelSettings } from "./game-channels.ts";
import { DebugSettings } from "./debug.ts";
import { ExportSettings } from "./export.ts";
import { StatblockSettings } from "./statblock.ts";
import { TrackerSettings } from "./tracker.ts";
import { UserMentionConfig } from "./user-mention-config.ts";

/**
 * Initializes settings. Must be called only once.
 */
export function registerSettings(): void {
    // Shared unified channel config — written by both bot and manual settings UIs
    game.settings.register(MODULE_NAME, "game-channels", {
        name: `${MODULE_NAME}.Setting.GameChannels.Name`,
        hint: `${MODULE_NAME}.Setting.GameChannels.Hint`,
        scope: "world",
        config: false,
        type: String,
        default: "[]",
    });

    // Multi-select: which channels appear in journal/image/text-selection menus
    game.settings.register(MODULE_NAME, "discord-menu-channels", {
        name: `${MODULE_NAME}.Setting.DiscordMenuChannels.Name`,
        hint: `${MODULE_NAME}.Setting.DiscordMenuChannels.Hint`,
        scope: "world",
        config: false,
        type: String,
        default: "[]",
    });

    // Action emoji map discovered from guild emojis during Test Connection
    game.settings.register(MODULE_NAME, "action-emojis", {
        name: "",
        hint: "",
        scope: "world",
        config: false,
        type: String,
        default: "{}",
    });

    GameChannelSettings.registerSettingsAndCreateMenu("fa-brands fa-discord");

    TrackerSettings.registerSettingsAndCreateMenu("fa-brands fa-discord");

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
        icon: "fa-brands fa-discord",
        // @ts-expect-error - Runtime registration works correctly
        type: UserMentionConfig,
        restricted: true,
    });
    UserMentionConfig.registerSettings();

    ExportSettings.registerSettingsAndCreateMenu("fas fa-file-export");

    StatblockSettings.registerSettingsAndCreateMenu("fas fa-chart-bar");

    DebugSettings.registerSettingsAndCreateMenu("fas fa-debug");

    game.settings.register(MODULE_NAME, "inhibit-movement-no-gm", {
        name: game.i18n.localize(
            `${MODULE_NAME}.Setting.InhibitMovementNoGm.Name`,
        ),
        hint: game.i18n.localize(
            `${MODULE_NAME}.Setting.InhibitMovementNoGm.Hint`,
        ),
        type: Boolean,
        scope: "world",
        config: true,
        default: false,
    });
}
