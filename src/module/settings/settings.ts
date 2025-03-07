import { MODULE_NAME } from "../constants.ts";
import { DiscordWebhookSettings } from "./webhooks.ts";
import { DebugSettings } from "./debug.ts";
import { ExportSettings } from "./export.ts";
import { StatblockSettings } from "./statblock.ts";
import { TrackerSettings } from "./tracker.ts";
import { UserMentionConfig } from "./user-mention-config.ts";

/**
 * Initializes settings. Must be called only once.
 */
export function registerSettings(): void {
    DiscordWebhookSettings.registerSettingsAndCreateMenu(
        "fa-brands fa-discord",
    );

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
