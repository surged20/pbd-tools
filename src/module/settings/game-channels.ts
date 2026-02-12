import type { FormApplicationOptions } from "foundry-pf2e/foundry/client/appv1/api/form-application-v1.mjs";
import {
    MODULE_NAME,
    DEFAULT_PROXY_URL,
    DEFAULT_CHANNEL_USERNAME,
    DEFAULT_CHANNEL_AVATAR,
    RPGSAGE_APP_ID_DEFAULT,
    type GameChannelConfig,
    type ChannelTargetId,
    makeChannelTargetId,
} from "../constants.ts";
import {
    SettingsMenuPbdTools,
    type ExtendedSettingRegistration,
    type MenuTemplateData,
} from "./menu.ts";
import {
    getBotGuilds,
    getGuildEmojis,
    discoverChannels,
    createWebhook,
    deleteWebhook,
    checkWebhookValid,
    type DiscoveredChannel,
    type APIGuild,
    type APIEmoji,
} from "../discord-bot.ts";
import { getAllGameChannels } from "../helpers.ts";

declare const SettingsConfig: {
    reloadConfirm: (options?: { world?: boolean }) => void;
};

interface ChannelTemplateData extends GameChannelConfig {
    targetId: ChannelTargetId;
    isBot: boolean;
    isManual: boolean;
    hasWebhook: boolean;
    isMenuChecked: boolean;
}

interface ActionEmojiEntry {
    key: string;
    label: string;
    value: string;
}

interface GameChannelSettingsTemplateData extends MenuTemplateData {
    botEnabled: boolean;
    botToken: string;
    botProxyUrl: string;
    rpgSageAppId: string;
    guildId: string;
    guildName: string;
    discoveredChannels: DiscoveredChannel[];
    allChannels: ChannelTemplateData[];
    actionEmojis: ActionEmojiEntry[];
}

export class GameChannelSettings extends SettingsMenuPbdTools {
    static override namespace = "GameChannelSettings";

    static override get defaultOptions(): FormApplicationOptions {
        return fu.mergeObject(super.defaultOptions, {
            template: `modules/pbd-tools/templates/game-channel-settings.hbs`,
            width: 860,
            height: 800,
            closeOnSubmit: false,
            resizable: true,
        });
    }

    public static override get settings(): Record<
        string,
        ExtendedSettingRegistration
    > {
        return {
            // Bot settings
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
            // Keep old setting key registered for migration
            "bot-game-channels": {
                name: `${MODULE_NAME}.Setting.BotSettings.GameChannels.Name`,
                hint: `${MODULE_NAME}.Setting.BotSettings.GameChannels.Hint`,
                scope: "world",
                config: false,
                type: String,
                default: "[]",
            },
            // Old manual webhook settings (kept for migration)
            "gm-url": {
                name: `${MODULE_NAME}.Setting.GmUrl.Name`,
                hint: `${MODULE_NAME}.Setting.GmUrl.Hint`,
                scope: "world",
                config: false,
                type: String,
                default: "",
            },
            "gm-username": {
                name: `${MODULE_NAME}.Setting.GmUserName.Name`,
                hint: `${MODULE_NAME}.Setting.GmUserName.Hint`,
                scope: "world",
                config: false,
                type: String,
                default: "Gamemaster",
            },
            "gm-avatar": {
                name: `${MODULE_NAME}.Setting.GmAvatar.Name`,
                hint: `${MODULE_NAME}.Setting.GmAvatar.Hint`,
                scope: "world",
                config: false,
                type: String,
                default: "icons/vtt-512.png",
                filePicker: "image",
            },
            "ic-url": {
                name: `${MODULE_NAME}.Setting.IcUrl.Name`,
                hint: `${MODULE_NAME}.Setting.IcUrl.Hint`,
                scope: "world",
                config: false,
                type: String,
                default: "",
            },
            "ic-username": {
                name: `${MODULE_NAME}.Setting.IcUserName.Name`,
                hint: `${MODULE_NAME}.Setting.IcUserName.Hint`,
                scope: "world",
                config: false,
                type: String,
                default: "Gamemaster",
            },
            "ic-avatar": {
                name: `${MODULE_NAME}.Setting.IcAvatar.Name`,
                hint: `${MODULE_NAME}.Setting.IcAvatar.Hint`,
                scope: "world",
                config: false,
                type: String,
                default: "icons/vtt-512.png",
                filePicker: "image",
            },
            "ooc-url": {
                name: `${MODULE_NAME}.Setting.OocUrl.Name`,
                hint: `${MODULE_NAME}.Setting.OocUrl.Hint`,
                scope: "world",
                config: false,
                type: String,
                default: "",
            },
            "ooc-username": {
                name: `${MODULE_NAME}.Setting.OocUserName.Name`,
                hint: `${MODULE_NAME}.Setting.OocUserName.Hint`,
                scope: "world",
                config: false,
                type: String,
                default: "Gamemaster",
            },
            "ooc-avatar": {
                name: `${MODULE_NAME}.Setting.OocAvatar.Name`,
                hint: `${MODULE_NAME}.Setting.OocAvatar.Hint`,
                scope: "world",
                config: false,
                type: String,
                default: "icons/vtt-512.png",
                filePicker: "image",
            },
        };
    }

    override getData(): GameChannelSettingsTemplateData {
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

        // Sort discovered channels: parents alphabetically, threads grouped under parent
        discoveredChannels = this._sortDiscoveredChannels(discoveredChannels);

        // Load menu channel selections
        let menuChannelTargetIds: ChannelTargetId[] = [];
        try {
            menuChannelTargetIds = JSON.parse(
                game.settings.get(
                    MODULE_NAME,
                    "discord-menu-channels",
                ) as string,
            ) as ChannelTargetId[];
        } catch {
            menuChannelTargetIds = [];
        }
        const menuIsAll =
            !Array.isArray(menuChannelTargetIds) ||
            menuChannelTargetIds.length === 0;
        const menuSet = new Set(menuChannelTargetIds);

        const allChannels: ChannelTemplateData[] = getAllGameChannels().map(
            (gc) => {
                const targetId = makeChannelTargetId(gc);
                const hasWebhook = !!gc.webhookId && !!gc.webhookToken;
                return {
                    ...gc,
                    targetId,
                    isBot: gc.mode === "bot",
                    isManual: gc.mode === "manual",
                    hasWebhook,
                    isMenuChecked: menuIsAll
                        ? hasWebhook
                        : menuSet.has(targetId),
                };
            },
        );

        // Load action emoji mappings
        let emojiMap: Record<string, string> = {};
        try {
            emojiMap = JSON.parse(
                game.settings.get(MODULE_NAME, "action-emojis") as string,
            ) as Record<string, string>;
        } catch {
            emojiMap = {};
        }

        const emojiKeys: { key: string; label: string }[] = [
            { key: "1", label: "1 Action" },
            { key: "2", label: "2 Actions" },
            { key: "3", label: "3 Actions" },
            { key: "free", label: "Free Action" },
            { key: "reaction", label: "Reaction" },
        ];
        const actionEmojis: ActionEmojiEntry[] = emojiKeys.map((e) => ({
            key: e.key,
            label: e.label,
            value: emojiMap[e.key] ?? "",
        }));

        return fu.mergeObject(baseData, {
            botEnabled,
            botToken,
            botProxyUrl,
            rpgSageAppId,
            guildId,
            guildName,
            discoveredChannels,
            allChannels,
            actionEmojis,
        }) as GameChannelSettingsTemplateData;
    }

    private _sortDiscoveredChannels(
        channels: DiscoveredChannel[],
    ): DiscoveredChannel[] {
        const parents = channels
            .filter((c) => !c.parentId)
            .sort((a, b) => a.name.localeCompare(b.name));
        const threadsByParent = new Map<string, DiscoveredChannel[]>();
        for (const c of channels) {
            if (c.parentId) {
                const list = threadsByParent.get(c.parentId) ?? [];
                list.push(c);
                threadsByParent.set(c.parentId, list);
            }
        }
        // Sort threads alphabetically within each parent
        for (const list of threadsByParent.values()) {
            list.sort((a, b) => a.name.localeCompare(b.name));
        }

        const sorted: DiscoveredChannel[] = [];
        for (const parent of parents) {
            sorted.push(parent);
            const threads = threadsByParent.get(parent.id);
            if (threads) sorted.push(...threads);
        }
        return sorted;
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

        // Add Bot Channel button
        el
            .querySelector(".bot-add-channel")
            ?.addEventListener("click", (event) => {
                event.preventDefault();
                this._onAddBotChannel();
            });

        // Add Manual Channel button
        el
            .querySelector(".webhook-add-channel")
            ?.addEventListener("click", (event) => {
                event.preventDefault();
                this._onAddManualChannel();
            });

        // Remove Channel buttons (delegated)
        el
            .querySelector(".channel-list")
            ?.addEventListener("click", (event) => {
                const target = event.target as HTMLElement;
                const removeBtn = target.closest(
                    ".remove-channel",
                ) as HTMLElement | null;
                if (removeBtn) {
                    event.preventDefault();
                    const targetId = removeBtn.dataset.targetId;
                    if (targetId) this._onRemoveChannel(targetId);
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

            const guild = guilds[0];
            const guildIdInput = root?.querySelector(
                'input[name="bot-guild-id"]',
            ) as HTMLInputElement | null;
            const guildNameInput = root?.querySelector(
                'input[name="bot-guild-name"]',
            ) as HTMLInputElement | null;

            if (guildIdInput) guildIdInput.value = guild.id;
            if (guildNameInput) guildNameInput.value = guild.name;

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

            // Auto-discover PF2e action emojis from the guild
            await this._discoverActionEmojis(token, guild.id);
            this.render();
        } catch (error) {
            console.error("[PBD-Tools] Bot connection test failed:", error);
            ui.notifications.error(
                game.i18n.localize(
                    `${MODULE_NAME}.Setting.BotSettings.ConnectionFailed`,
                ),
            );
        }
    }

    private async _discoverActionEmojis(
        token: string,
        guildId: string,
    ): Promise<void> {
        try {
            const emojis: APIEmoji[] = await getGuildEmojis(token, guildId);
            const emojiMap: Record<string, string> = {};

            const patterns: [string, RegExp[]][] = [
                [
                    "1",
                    [
                        /^pf2[_-]?1(?:action)?$/i,
                        /^1action$/i,
                        /^one[_-]?action$/i,
                    ],
                ],
                [
                    "2",
                    [
                        /^pf2[_-]?2(?:action)?$/i,
                        /^2action$/i,
                        /^two[_-]?action$/i,
                    ],
                ],
                [
                    "3",
                    [
                        /^pf2[_-]?3(?:action)?$/i,
                        /^3action$/i,
                        /^three[_-]?action$/i,
                    ],
                ],
                [
                    "free",
                    [
                        /^pf2[_-]?free(?:action)?$/i,
                        /^free[_-]?action$/i,
                        /^free$/i,
                    ],
                ],
                [
                    "reaction",
                    [/^pf2[_-]?react(?:ion)?$/i, /^reaction$/i, /^react$/i],
                ],
            ];

            for (const emoji of emojis) {
                if (!emoji.name || !emoji.id) continue;
                for (const [key, regexes] of patterns) {
                    if (emojiMap[key]) continue;
                    if (regexes.some((re) => re.test(emoji.name!))) {
                        const prefix = emoji.animated ? "a" : "";
                        emojiMap[key] = `<${prefix}:${emoji.name}:${emoji.id}>`;
                    }
                }
            }

            await game.settings.set(
                MODULE_NAME,
                "action-emojis",
                JSON.stringify(emojiMap),
            );

            const count = Object.keys(emojiMap).length;
            if (count > 0) {
                ui.notifications.info(
                    game.i18n.format(
                        `${MODULE_NAME}.Setting.BotSettings.EmojisDiscovered`,
                        { count: String(count) },
                    ),
                );
            }
        } catch (error) {
            console.warn(
                "[PBD-Tools] Could not discover action emojis:",
                error,
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

    private async _onAddBotChannel(): Promise<void> {
        const root = this.element[0] as HTMLElement | undefined;
        const channelSelect = root?.querySelector(
            ".bot-channel-select",
        ) as HTMLSelectElement | null;

        const channelId = channelSelect?.value;

        if (!channelId) {
            ui.notifications.warn(
                game.i18n.localize(
                    `${MODULE_NAME}.Setting.BotSettings.SelectChannel`,
                ),
            );
            return;
        }

        const token = game.settings.get(MODULE_NAME, "bot-token") as string;

        const allChannels = getAllGameChannels();

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
        const isThread = !!discovered?.parentId;

        if (isThread && discovered?.parentId) {
            const parentConfig = allChannels.find(
                (gc) =>
                    gc.channelId === discovered.parentId && gc.mode === "bot",
            );
            if (!parentConfig) {
                ui.notifications.warn(
                    game.i18n.localize(
                        `${MODULE_NAME}.Setting.BotSettings.AddParentFirst`,
                    ),
                );
                return;
            }

            const targetId = `${discovered.parentId}/${channelId}`;
            if (
                allChannels.some((gc) => makeChannelTargetId(gc) === targetId)
            ) {
                ui.notifications.warn(
                    game.i18n.localize(
                        `${MODULE_NAME}.Setting.BotSettings.ChannelAlreadyAdded`,
                    ),
                );
                return;
            }

            const config: GameChannelConfig = {
                channelId: discovered.parentId,
                channelName: discovered.parentName ?? discovered.parentId,
                threadId: channelId,
                threadName: channelName,
                webhookId: parentConfig.webhookId,
                webhookToken: parentConfig.webhookToken,
                username: DEFAULT_CHANNEL_USERNAME,
                avatar: DEFAULT_CHANNEL_AVATAR,
                mode: "bot",
            };

            allChannels.push(config);
            await game.settings.set(
                MODULE_NAME,
                "game-channels",
                JSON.stringify(allChannels),
            );

            ui.notifications.info(
                game.i18n.format(
                    `${MODULE_NAME}.Setting.BotSettings.ChannelAdded`,
                    { name: `#${discovered.parentName} > ${channelName}` },
                ),
            );
        } else {
            if (
                allChannels.some(
                    (gc) =>
                        gc.channelId === channelId &&
                        !gc.threadId &&
                        gc.mode === "bot",
                )
            ) {
                ui.notifications.warn(
                    game.i18n.localize(
                        `${MODULE_NAME}.Setting.BotSettings.ChannelAlreadyAdded`,
                    ),
                );
                return;
            }

            try {
                const webhook = await createWebhook(
                    token,
                    channelId,
                    "PBD-Tools",
                );

                const config: GameChannelConfig = {
                    channelId,
                    channelName,
                    webhookId: webhook.id,
                    webhookToken: webhook.token ?? "",
                    username: DEFAULT_CHANNEL_USERNAME,
                    avatar: DEFAULT_CHANNEL_AVATAR,
                    mode: "bot",
                };

                allChannels.push(config);
                await game.settings.set(
                    MODULE_NAME,
                    "game-channels",
                    JSON.stringify(allChannels),
                );

                ui.notifications.info(
                    game.i18n.format(
                        `${MODULE_NAME}.Setting.BotSettings.ChannelAdded`,
                        { name: `#${channelName}` },
                    ),
                );
            } catch (error) {
                console.error("[PBD-Tools] Failed to create webhook:", error);
                ui.notifications.error(
                    game.i18n.localize(
                        `${MODULE_NAME}.Setting.BotSettings.WebhookCreateFailed`,
                    ),
                );
                return;
            }
        }

        this.render();
    }

    private _parseWebhookUrl(
        url: string,
    ): { webhookId: string; webhookToken: string } | null {
        const match = url.match(
            /discord\.com\/api\/webhooks\/(\d+)\/([A-Za-z0-9_-]+)/,
        );
        if (!match) return null;
        return { webhookId: match[1], webhookToken: match[2] };
    }

    private async _onAddManualChannel(): Promise<void> {
        const root = this.element[0] as HTMLElement | undefined;
        const nameInput = root?.querySelector(
            ".webhook-channel-name",
        ) as HTMLInputElement | null;
        const urlInput = root?.querySelector(
            ".webhook-channel-url",
        ) as HTMLInputElement | null;
        const usernameInput = root?.querySelector(
            ".webhook-channel-username",
        ) as HTMLInputElement | null;
        const avatarInput = root?.querySelector(
            ".webhook-channel-avatar",
        ) as HTMLInputElement | null;

        const channelName = nameInput?.value?.trim() ?? "";
        const webhookUrl = urlInput?.value?.trim() ?? "";
        const username =
            usernameInput?.value?.trim() || DEFAULT_CHANNEL_USERNAME;
        const avatar = avatarInput?.value?.trim() || DEFAULT_CHANNEL_AVATAR;

        if (!channelName) {
            ui.notifications.warn(
                game.i18n.localize(
                    `${MODULE_NAME}.Setting.DiscordWebhookSettings.EnterName`,
                ),
            );
            return;
        }

        if (!webhookUrl) {
            ui.notifications.warn(
                game.i18n.localize(
                    `${MODULE_NAME}.Setting.DiscordWebhookSettings.EnterUrl`,
                ),
            );
            return;
        }

        const parsed = this._parseWebhookUrl(webhookUrl);
        if (!parsed) {
            ui.notifications.error(
                game.i18n.localize(
                    `${MODULE_NAME}.Setting.DiscordWebhookSettings.InvalidUrl`,
                ),
            );
            return;
        }

        const allChannels = getAllGameChannels();

        const config: GameChannelConfig = {
            channelId: parsed.webhookId,
            channelName,
            webhookId: parsed.webhookId,
            webhookToken: parsed.webhookToken,
            username,
            avatar,
            mode: "manual",
        };

        allChannels.push(config);
        await game.settings.set(
            MODULE_NAME,
            "game-channels",
            JSON.stringify(allChannels),
        );

        ui.notifications.info(
            game.i18n.format(
                `${MODULE_NAME}.Setting.DiscordWebhookSettings.ChannelAdded`,
                { name: channelName },
            ),
        );

        this.render();
    }

    private async _onRemoveChannel(targetId: string): Promise<void> {
        const token = game.settings.get(MODULE_NAME, "bot-token") as string;

        let allChannels = getAllGameChannels();

        const channel = allChannels.find(
            (gc) => makeChannelTargetId(gc) === targetId,
        );
        if (!channel) return;

        // For bot channels, delete the webhook if no other configs share it
        if (channel.mode === "bot" && channel.webhookId && token) {
            const othersUsingWebhook = allChannels.filter(
                (gc) =>
                    gc.webhookId === channel.webhookId &&
                    makeChannelTargetId(gc) !== targetId,
            );
            if (othersUsingWebhook.length === 0) {
                try {
                    await deleteWebhook(token, channel.webhookId);
                } catch (error) {
                    console.warn(
                        "[PBD-Tools] Failed to delete webhook (may already be deleted):",
                        error,
                    );
                }
            }
        }

        allChannels = allChannels.filter(
            (gc) => makeChannelTargetId(gc) !== targetId,
        );
        await game.settings.set(
            MODULE_NAME,
            "game-channels",
            JSON.stringify(allChannels),
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
        // Save per-channel persona fields from the form (all modes)
        const allChannels = getAllGameChannels();

        let changed = false;
        const menuChannels: ChannelTargetId[] = [];

        for (const gc of allChannels) {
            const tid = makeChannelTargetId(gc);
            const usernameKey = `channel-username-${tid}`;
            const avatarKey = `channel-avatar-${tid}`;
            const menuKey = `menu-channel-${tid}`;

            if (usernameKey in data) {
                gc.username = data[usernameKey] as string;
                delete data[usernameKey];
                changed = true;
            }
            if (avatarKey in data) {
                gc.avatar = data[avatarKey] as string;
                delete data[avatarKey];
                changed = true;
            }
            if (data[menuKey]) {
                menuChannels.push(tid);
            }
            delete data[menuKey];
        }

        if (changed) {
            await game.settings.set(
                MODULE_NAME,
                "game-channels",
                JSON.stringify(allChannels),
            );
        }

        // If all are checked, store empty array (= "all")
        const allTargetIds = allChannels
            .filter((gc) => gc.webhookId && gc.webhookToken)
            .map((gc) => makeChannelTargetId(gc));
        const storeValue =
            menuChannels.length === allTargetIds.length ? [] : menuChannels;
        await game.settings.set(
            MODULE_NAME,
            "discord-menu-channels",
            JSON.stringify(storeValue),
        );

        // Save action emoji mappings from the form
        const emojiKeys = ["1", "2", "3", "free", "reaction"];
        const emojiMap: Record<string, string> = {};
        for (const key of emojiKeys) {
            const formKey = `action-emoji-${key}`;
            if (formKey in data) {
                const val = (data[formKey] as string).trim();
                if (val) emojiMap[key] = val;
                delete data[formKey];
            }
        }
        await game.settings.set(
            MODULE_NAME,
            "action-emojis",
            JSON.stringify(emojiMap),
        );

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

        const allChannels = getAllGameChannels();
        const botChannels = allChannels.filter((gc) => gc.mode === "bot");

        const validated = new Set<string>();
        let changed = false;
        const failedChannels: string[] = [];

        for (const gc of botChannels) {
            if (!gc.webhookId || validated.has(gc.webhookId)) continue;
            validated.add(gc.webhookId);

            // Use unauthenticated endpoint — no CORS proxy needed
            const isValid = await checkWebhookValid(
                gc.webhookId,
                gc.webhookToken,
            );
            if (isValid) continue;

            console.warn(
                `[PBD-Tools] Managed webhook for channel ${gc.channelName} is invalid, recreating...`,
            );
            try {
                const newWebhook = await createWebhook(
                    token,
                    gc.channelId,
                    "PBD-Tools",
                );
                for (const c of allChannels) {
                    if (c.webhookId === gc.webhookId) {
                        c.webhookId = newWebhook.id;
                        c.webhookToken = newWebhook.token ?? "";
                    }
                }
                changed = true;
            } catch (createError) {
                console.error(
                    `[PBD-Tools] Failed to recreate webhook for ${gc.channelName}:`,
                    createError,
                );
                failedChannels.push(gc.channelName);
            }
        }

        if (changed) {
            await game.settings.set(
                MODULE_NAME,
                "game-channels",
                JSON.stringify(allChannels),
            );
        }

        if (failedChannels.length > 0) {
            ui.notifications.warn(
                `PBD-Tools: Could not recreate webhooks for: ${failedChannels.join(", ")}. Open Game Channels settings and re-add these channels, or ensure the CORS proxy is running.`,
            );
        }
    }

    static async migrateOldBotChannels(): Promise<void> {
        try {
            const oldData = game.settings.get(
                MODULE_NAME,
                "bot-game-channels",
            ) as string;
            if (!oldData || oldData === "[]") return;

            const oldChannels = JSON.parse(oldData) as Record<
                string,
                unknown
            >[];
            if (oldChannels.length === 0) return;

            const existing = getAllGameChannels();
            if (existing.some((gc) => gc.mode === "bot")) return;

            const migrated: GameChannelConfig[] = oldChannels.map((old) => ({
                channelId: (old.channelId as string) || "",
                channelName: (old.channelName as string) || "",
                webhookId: (old.webhookId as string) || "",
                webhookToken: (old.webhookToken as string) || "",
                username:
                    (old.gmUsername as string) || DEFAULT_CHANNEL_USERNAME,
                avatar: (old.gmAvatar as string) || DEFAULT_CHANNEL_AVATAR,
                mode: "bot" as const,
            }));

            const combined = [...existing, ...migrated];
            await game.settings.set(
                MODULE_NAME,
                "game-channels",
                JSON.stringify(combined),
            );

            await game.settings.set(MODULE_NAME, "bot-game-channels", "[]");

            ui.notifications.info(
                `PBD-Tools: Migrated ${migrated.length} bot channel(s) to unified config.`,
            );
        } catch {
            // Old setting may not exist
        }
    }

    static async migrateOldSettings(): Promise<void> {
        const oldKeys = [
            {
                urlKey: "ic-url",
                usernameKey: "ic-username",
                avatarKey: "ic-avatar",
                label: "IC",
            },
            {
                urlKey: "ooc-url",
                usernameKey: "ooc-username",
                avatarKey: "ooc-avatar",
                label: "OOC",
            },
            {
                urlKey: "gm-url",
                usernameKey: "gm-username",
                avatarKey: "gm-avatar",
                label: "GM",
            },
        ];

        const migrated: GameChannelConfig[] = [];

        for (const entry of oldKeys) {
            try {
                const url = game.settings.get(
                    MODULE_NAME,
                    entry.urlKey,
                ) as string;
                if (!url) continue;

                const match = url.match(
                    /discord\.com\/api\/webhooks\/(\d+)\/([A-Za-z0-9_-]+)/,
                );
                if (!match) continue;

                const username = game.settings.get(
                    MODULE_NAME,
                    entry.usernameKey,
                ) as string;
                const avatar = game.settings.get(
                    MODULE_NAME,
                    entry.avatarKey,
                ) as string;

                migrated.push({
                    channelId: match[1],
                    channelName: entry.label,
                    webhookId: match[1],
                    webhookToken: match[2],
                    username: username || DEFAULT_CHANNEL_USERNAME,
                    avatar: avatar || DEFAULT_CHANNEL_AVATAR,
                    mode: "manual",
                });

                await game.settings.set(MODULE_NAME, entry.urlKey, "");
            } catch {
                // Setting may not exist yet
            }
        }

        if (migrated.length > 0) {
            const existing = getAllGameChannels();
            const combined = [...existing, ...migrated];
            await game.settings.set(
                MODULE_NAME,
                "game-channels",
                JSON.stringify(combined),
            );

            ui.notifications.info(
                `PBD-Tools: Migrated ${migrated.length} webhook(s) to unified channel config.`,
            );
        }
    }

    static async cleanupWebhooks(): Promise<void> {
        const token = game.settings.get(MODULE_NAME, "bot-token") as string;
        if (!token) return;

        const allChannels = getAllGameChannels();
        const botChannels = allChannels.filter((gc) => gc.mode === "bot");

        const deleted = new Set<string>();
        for (const gc of botChannels) {
            if (gc.webhookId && !deleted.has(gc.webhookId)) {
                try {
                    await deleteWebhook(token, gc.webhookId);
                    deleted.add(gc.webhookId);
                } catch (error) {
                    console.warn(
                        `[PBD-Tools] Failed to cleanup webhook for ${gc.channelName}:`,
                        error,
                    );
                }
            }
        }

        const remaining = allChannels.filter((gc) => gc.mode !== "bot");
        await game.settings.set(
            MODULE_NAME,
            "game-channels",
            JSON.stringify(remaining),
        );

        ui.notifications.info(
            game.i18n.localize(
                `${MODULE_NAME}.Setting.BotSettings.WebhooksCleaned`,
            ),
        );
    }
}
