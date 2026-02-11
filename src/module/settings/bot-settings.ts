import type { FormApplicationOptions } from "foundry-pf2e/foundry/client/appv1/api/form-application-v1.mjs";
import {
    MODULE_NAME,
    DEFAULT_PROXY_URL,
    RPGSAGE_APP_ID_DEFAULT,
    type GameChannelConfig,
} from "../constants.ts";
import {
    SettingsMenuPbdTools,
    type ExtendedSettingRegistration,
    type MenuTemplateData,
} from "./menu.ts";
import {
    getBotGuilds,
    discoverChannels,
    createWebhook,
    deleteWebhook,
    getWebhook,
    type DiscoveredChannel,
    type APIGuild,
} from "../discord-bot.ts";

declare const SettingsConfig: {
    reloadConfirm: (options?: { world?: boolean }) => void;
};

interface BotSettingsTemplateData extends MenuTemplateData {
    botEnabled: boolean;
    botToken: string;
    botProxyUrl: string;
    rpgSageAppId: string;
    guildId: string;
    guildName: string;
    discoveredChannels: DiscoveredChannel[];
    gameChannels: GameChannelConfig[];
    tagChoices: { value: string; label: string }[];
}

export class BotSettings extends SettingsMenuPbdTools {
    static override namespace = "BotSettings";

    static override get defaultOptions(): FormApplicationOptions {
        return fu.mergeObject(super.defaultOptions, {
            template: `modules/pbd-tools/templates/bot-settings.hbs`,
            width: 860,
            height: 780,
            closeOnSubmit: false,
            resizable: true,
        });
    }

    public static override get settings(): Record<
        string,
        ExtendedSettingRegistration
    > {
        return {
            "bot-enabled": {
                name: `${MODULE_NAME}.Setting.BotSettings.Enabled.Name`,
                hint: `${MODULE_NAME}.Setting.BotSettings.Enabled.Hint`,
                scope: "world",
                config: false,
                type: Boolean,
                default: false,
            },
            "bot-token": {
                name: `${MODULE_NAME}.Setting.BotSettings.Token.Name`,
                hint: `${MODULE_NAME}.Setting.BotSettings.Token.Hint`,
                scope: "world",
                config: false,
                type: String,
                default: "",
            },
            "bot-proxy-url": {
                name: `${MODULE_NAME}.Setting.BotSettings.ProxyUrl.Name`,
                hint: `${MODULE_NAME}.Setting.BotSettings.ProxyUrl.Hint`,
                scope: "world",
                config: false,
                type: String,
                default: DEFAULT_PROXY_URL,
            },
            "rpgsage-app-id": {
                name: `${MODULE_NAME}.Setting.BotSettings.RpgSageAppId.Name`,
                hint: `${MODULE_NAME}.Setting.BotSettings.RpgSageAppId.Hint`,
                scope: "world",
                config: false,
                type: String,
                default: RPGSAGE_APP_ID_DEFAULT,
            },
            "bot-guild-id": {
                name: `${MODULE_NAME}.Setting.BotSettings.GuildId.Name`,
                hint: `${MODULE_NAME}.Setting.BotSettings.GuildId.Hint`,
                scope: "world",
                config: false,
                type: String,
                default: "",
            },
            "bot-guild-name": {
                name: `${MODULE_NAME}.Setting.BotSettings.GuildName.Name`,
                hint: `${MODULE_NAME}.Setting.BotSettings.GuildName.Hint`,
                scope: "world",
                config: false,
                type: String,
                default: "",
            },
            "bot-discovered-channels": {
                name: `${MODULE_NAME}.Setting.BotSettings.DiscoveredChannels.Name`,
                hint: `${MODULE_NAME}.Setting.BotSettings.DiscoveredChannels.Hint`,
                scope: "world",
                config: false,
                type: String,
                default: "[]",
            },
            "bot-game-channels": {
                name: `${MODULE_NAME}.Setting.BotSettings.GameChannels.Name`,
                hint: `${MODULE_NAME}.Setting.BotSettings.GameChannels.Hint`,
                scope: "world",
                config: false,
                type: String,
                default: "[]",
            },
        };
    }

    override getData(): BotSettingsTemplateData {
        const baseData = super.getData();

        const botEnabled = game.settings.get(
            MODULE_NAME,
            "bot-enabled",
        ) as boolean;
        const botToken = game.settings.get(MODULE_NAME, "bot-token") as string;
        const botProxyUrl = game.settings.get(
            MODULE_NAME,
            "bot-proxy-url",
        ) as string;
        const rpgSageAppId = game.settings.get(
            MODULE_NAME,
            "rpgsage-app-id",
        ) as string;
        const guildId = game.settings.get(
            MODULE_NAME,
            "bot-guild-id",
        ) as string;
        const guildName = game.settings.get(
            MODULE_NAME,
            "bot-guild-name",
        ) as string;

        let discoveredChannels: DiscoveredChannel[] = [];
        try {
            discoveredChannels = JSON.parse(
                game.settings.get(
                    MODULE_NAME,
                    "bot-discovered-channels",
                ) as string,
            ) as DiscoveredChannel[];
        } catch {
            discoveredChannels = [];
        }

        let gameChannels: GameChannelConfig[] = [];
        try {
            gameChannels = JSON.parse(
                game.settings.get(MODULE_NAME, "bot-game-channels") as string,
            ) as GameChannelConfig[];
        } catch {
            gameChannels = [];
        }

        const tagChoices = [
            { value: "ic", label: "IC" },
            { value: "ooc", label: "OOC" },
            { value: "gm", label: "GM" },
        ];

        return fu.mergeObject(baseData, {
            botEnabled,
            botToken,
            botProxyUrl,
            rpgSageAppId,
            guildId,
            guildName,
            discoveredChannels,
            gameChannels,
            tagChoices,
        }) as BotSettingsTemplateData;
    }

    activateListeners(html: JQuery): void {
        super.activateListeners(html);

        const el = (html[0] ?? html) as HTMLElement;

        // Test Connection button
        el
            .querySelector(".bot-test-connection")
            ?.addEventListener("click", (event) => {
                event.preventDefault();
                this._onTestConnection();
            });

        // Discover Channels button
        el
            .querySelector(".bot-discover-channels")
            ?.addEventListener("click", (event) => {
                event.preventDefault();
                this._onDiscoverChannels();
            });

        // Add Channel button
        el
            .querySelector(".bot-add-channel")
            ?.addEventListener("click", (event) => {
                event.preventDefault();
                this._onAddChannel();
            });

        // Remove Channel buttons (delegated)
        el
            .querySelector(".bot-channel-list")
            ?.addEventListener("click", (event) => {
                const target = event.target as HTMLElement;
                const removeBtn = target.closest(
                    ".bot-remove-channel",
                ) as HTMLElement | null;
                if (removeBtn) {
                    event.preventDefault();
                    const channelId = removeBtn.dataset.channelId;
                    if (channelId) this._onRemoveChannel(channelId);
                }
            });
    }

    private async _onTestConnection(): Promise<void> {
        const root = this.element[0] as HTMLElement | undefined;
        const tokenInput = root?.querySelector(
            'input[name="bot-token"]',
        ) as HTMLInputElement | null;
        const token = tokenInput?.value ?? "";

        if (!token) {
            ui.notifications.warn(
                game.i18n.localize(
                    `${MODULE_NAME}.Setting.BotSettings.NoToken`,
                ),
            );
            return;
        }

        try {
            const guilds: APIGuild[] = await getBotGuilds(token);

            if (guilds.length === 0) {
                ui.notifications.warn(
                    game.i18n.localize(
                        `${MODULE_NAME}.Setting.BotSettings.NoGuilds`,
                    ),
                );
                return;
            }

            // Auto-select first guild (or user could pick if multiple)
            const guild = guilds[0];
            const guildIdInput = root?.querySelector(
                'input[name="bot-guild-id"]',
            ) as HTMLInputElement | null;
            const guildNameInput = root?.querySelector(
                'input[name="bot-guild-name"]',
            ) as HTMLInputElement | null;

            if (guildIdInput) guildIdInput.value = guild.id;
            if (guildNameInput) guildNameInput.value = guild.name;

            // Save token and guild immediately
            await game.settings.set(MODULE_NAME, "bot-token", token);
            await game.settings.set(MODULE_NAME, "bot-guild-id", guild.id);
            await game.settings.set(MODULE_NAME, "bot-guild-name", guild.name);

            const msg =
                guilds.length > 1
                    ? game.i18n.format(
                          `${MODULE_NAME}.Setting.BotSettings.ConnectedMultiGuild`,
                          {
                              name: guild.name,
                              count: String(guilds.length),
                          },
                      )
                    : game.i18n.format(
                          `${MODULE_NAME}.Setting.BotSettings.Connected`,
                          { name: guild.name },
                      );

            ui.notifications.info(msg);
        } catch (error) {
            console.error("[PBD-Tools] Bot connection test failed:", error);
            ui.notifications.error(
                game.i18n.localize(
                    `${MODULE_NAME}.Setting.BotSettings.ConnectionFailed`,
                ),
            );
        }
    }

    private async _onDiscoverChannels(): Promise<void> {
        const token = game.settings.get(MODULE_NAME, "bot-token") as string;
        const guildId = game.settings.get(
            MODULE_NAME,
            "bot-guild-id",
        ) as string;
        const root = this.element[0] as HTMLElement | undefined;
        const appIdInput = root?.querySelector(
            'input[name="rpgsage-app-id"]',
        ) as HTMLInputElement | null;
        const rpgSageAppId = appIdInput?.value ?? "";

        if (!token || !guildId) {
            ui.notifications.warn(
                game.i18n.localize(
                    `${MODULE_NAME}.Setting.BotSettings.TestFirst`,
                ),
            );
            return;
        }

        if (!rpgSageAppId) {
            ui.notifications.warn(
                game.i18n.localize(
                    `${MODULE_NAME}.Setting.BotSettings.NoAppId`,
                ),
            );
            return;
        }

        try {
            // Save the app ID
            await game.settings.set(
                MODULE_NAME,
                "rpgsage-app-id",
                rpgSageAppId,
            );

            const channels = await discoverChannels(
                token,
                guildId,
                rpgSageAppId,
            );

            await game.settings.set(
                MODULE_NAME,
                "bot-discovered-channels",
                JSON.stringify(channels),
            );

            ui.notifications.info(
                game.i18n.format(
                    `${MODULE_NAME}.Setting.BotSettings.DiscoveredCount`,
                    { count: String(channels.length) },
                ),
            );

            this.render();
        } catch (error) {
            console.error("[PBD-Tools] Channel discovery failed:", error);
            ui.notifications.error(
                game.i18n.localize(
                    `${MODULE_NAME}.Setting.BotSettings.DiscoveryFailed`,
                ),
            );
        }
    }

    private async _onAddChannel(): Promise<void> {
        const root = this.element[0] as HTMLElement | undefined;
        const channelSelect = root?.querySelector(
            ".bot-channel-select",
        ) as HTMLSelectElement | null;
        const tagSelect = root?.querySelector(
            ".bot-tag-select",
        ) as HTMLSelectElement | null;

        const channelId = channelSelect?.value;
        const tag = tagSelect?.value;

        if (!channelId || !tag) {
            ui.notifications.warn(
                game.i18n.localize(
                    `${MODULE_NAME}.Setting.BotSettings.SelectChannelAndTag`,
                ),
            );
            return;
        }

        const token = game.settings.get(MODULE_NAME, "bot-token") as string;

        let gameChannels: GameChannelConfig[] = [];
        try {
            gameChannels = JSON.parse(
                game.settings.get(MODULE_NAME, "bot-game-channels") as string,
            ) as GameChannelConfig[];
        } catch {
            gameChannels = [];
        }

        // Check if channel already configured
        if (gameChannels.some((gc) => gc.channelId === channelId)) {
            ui.notifications.warn(
                game.i18n.localize(
                    `${MODULE_NAME}.Setting.BotSettings.ChannelAlreadyAdded`,
                ),
            );
            return;
        }

        // Find channel name from discovered channels
        let discoveredChannels: DiscoveredChannel[] = [];
        try {
            discoveredChannels = JSON.parse(
                game.settings.get(
                    MODULE_NAME,
                    "bot-discovered-channels",
                ) as string,
            ) as DiscoveredChannel[];
        } catch {
            discoveredChannels = [];
        }
        const discovered = discoveredChannels.find((c) => c.id === channelId);
        const channelName = discovered?.name ?? channelId;

        try {
            // Create a managed webhook for this channel
            const webhook = await createWebhook(token, channelId, "PBD-Tools");

            const config: GameChannelConfig = {
                channelId,
                channelName,
                tag,
                webhookId: webhook.id,
                webhookToken: webhook.token ?? "",
                gmUsername: "Gamemaster",
                gmAvatar: "icons/vtt-512.png",
            };

            gameChannels.push(config);
            await game.settings.set(
                MODULE_NAME,
                "bot-game-channels",
                JSON.stringify(gameChannels),
            );

            ui.notifications.info(
                game.i18n.format(
                    `${MODULE_NAME}.Setting.BotSettings.ChannelAdded`,
                    { name: channelName, tag: tag.toUpperCase() },
                ),
            );

            this.render();
        } catch (error) {
            console.error("[PBD-Tools] Failed to create webhook:", error);
            ui.notifications.error(
                game.i18n.localize(
                    `${MODULE_NAME}.Setting.BotSettings.WebhookCreateFailed`,
                ),
            );
        }
    }

    private async _onRemoveChannel(channelId: string): Promise<void> {
        const token = game.settings.get(MODULE_NAME, "bot-token") as string;

        let gameChannels: GameChannelConfig[] = [];
        try {
            gameChannels = JSON.parse(
                game.settings.get(MODULE_NAME, "bot-game-channels") as string,
            ) as GameChannelConfig[];
        } catch {
            gameChannels = [];
        }

        const channel = gameChannels.find((gc) => gc.channelId === channelId);
        if (!channel) return;

        // Delete the managed webhook from Discord
        if (channel.webhookId && token) {
            try {
                await deleteWebhook(token, channel.webhookId);
            } catch (error) {
                console.warn(
                    "[PBD-Tools] Failed to delete webhook (may already be deleted):",
                    error,
                );
            }
        }

        gameChannels = gameChannels.filter((gc) => gc.channelId !== channelId);
        await game.settings.set(
            MODULE_NAME,
            "bot-game-channels",
            JSON.stringify(gameChannels),
        );

        ui.notifications.info(
            game.i18n.format(
                `${MODULE_NAME}.Setting.BotSettings.ChannelRemoved`,
                { name: channel.channelName },
            ),
        );

        this.render();
    }

    protected override async _updateObject(
        event: Event,
        data: Record<string, unknown>,
    ): Promise<void> {
        // Save per-channel GM persona fields from the form
        let gameChannels: GameChannelConfig[] = [];
        try {
            gameChannels = JSON.parse(
                game.settings.get(MODULE_NAME, "bot-game-channels") as string,
            ) as GameChannelConfig[];
        } catch {
            gameChannels = [];
        }

        let changed = false;
        for (const gc of gameChannels) {
            const usernameKey = `channel-username-${gc.channelId}`;
            const avatarKey = `channel-avatar-${gc.channelId}`;
            const tagKey = `channel-tag-${gc.channelId}`;

            if (usernameKey in data) {
                gc.gmUsername = data[usernameKey] as string;
                delete data[usernameKey];
                changed = true;
            }
            if (avatarKey in data) {
                gc.gmAvatar = data[avatarKey] as string;
                delete data[avatarKey];
                changed = true;
            }
            if (tagKey in data) {
                gc.tag = data[tagKey] as string;
                delete data[tagKey];
                changed = true;
            }
        }

        if (changed) {
            await game.settings.set(
                MODULE_NAME,
                "bot-game-channels",
                JSON.stringify(gameChannels),
            );
        }

        await super._updateObject(event, data);
        SettingsConfig.reloadConfirm({ world: true });
    }

    static async validateWebhooks(): Promise<void> {
        const enabled = game.settings.get(
            MODULE_NAME,
            "bot-enabled",
        ) as boolean;
        if (!enabled) return;

        const token = game.settings.get(MODULE_NAME, "bot-token") as string;
        if (!token) return;

        let gameChannels: GameChannelConfig[] = [];
        try {
            gameChannels = JSON.parse(
                game.settings.get(MODULE_NAME, "bot-game-channels") as string,
            ) as GameChannelConfig[];
        } catch {
            return;
        }

        let changed = false;
        for (const gc of gameChannels) {
            if (!gc.webhookId) continue;
            try {
                await getWebhook(token, gc.webhookId);
            } catch {
                console.warn(
                    `[PBD-Tools] Managed webhook for channel ${gc.channelName} is invalid, recreating...`,
                );
                try {
                    const newWebhook = await createWebhook(
                        token,
                        gc.channelId,
                        "PBD-Tools",
                    );
                    gc.webhookId = newWebhook.id;
                    gc.webhookToken = newWebhook.token ?? "";
                    changed = true;
                } catch (createError) {
                    console.error(
                        `[PBD-Tools] Failed to recreate webhook for ${gc.channelName}:`,
                        createError,
                    );
                }
            }
        }

        if (changed) {
            await game.settings.set(
                MODULE_NAME,
                "bot-game-channels",
                JSON.stringify(gameChannels),
            );
        }
    }

    static async cleanupWebhooks(): Promise<void> {
        const token = game.settings.get(MODULE_NAME, "bot-token") as string;
        if (!token) return;

        let gameChannels: GameChannelConfig[] = [];
        try {
            gameChannels = JSON.parse(
                game.settings.get(MODULE_NAME, "bot-game-channels") as string,
            ) as GameChannelConfig[];
        } catch {
            return;
        }

        for (const gc of gameChannels) {
            if (gc.webhookId) {
                try {
                    await deleteWebhook(token, gc.webhookId);
                } catch (error) {
                    console.warn(
                        `[PBD-Tools] Failed to cleanup webhook for ${gc.channelName}:`,
                        error,
                    );
                }
            }
        }

        await game.settings.set(
            MODULE_NAME,
            "bot-game-channels",
            JSON.stringify([]),
        );

        ui.notifications.info(
            game.i18n.localize(
                `${MODULE_NAME}.Setting.BotSettings.WebhooksCleaned`,
            ),
        );
    }
}
