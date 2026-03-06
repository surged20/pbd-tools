import type { ActorPF2e } from "foundry-pf2e";
import { MODULE_NAME } from "../constants.ts";
import type {
    FormApplicationData,
    FormApplicationOptions,
} from "foundry-pf2e/foundry/client/appv1/api/form-application-v1.mjs";
import type { APIGuildMember } from "../discord-bot.ts";

// Runtime globals available in Foundry
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const FormApplication: any;
import type { AppV1RenderOptions } from "foundry-pf2e/foundry/client/appv1/api/application-v1.mjs";

export interface UserMentionEntry {
    discordUserId: string;
    discordDisplayName?: string;
    alias?: string;
}

interface DiscordMemberOption {
    id: string;
    displayName: string;
}

interface UserMentionConfigData extends FormApplicationData {
    pcs: ActorPF2e[];
    userMap: Map<string, UserMentionEntry>;
    botConfigured: boolean;
    discordMembers: DiscordMemberOption[];
}

interface UserMentionConfigFormData extends FormData {
    actorId: string;
    userId: string;
    discordUserSelect: string;
    alias: string;
}

/**
 * Migrate old string-valued entries to UserMentionEntry objects.
 * Old format: [actorId, discordUserId]
 * New format: [actorId, { discordUserId, discordDisplayName?, alias? }]
 */
function migrateUserMap(
    raw: [string, string | UserMentionEntry][],
): Map<string, UserMentionEntry> {
    const map = new Map<string, UserMentionEntry>();
    for (const [actorId, value] of raw) {
        if (!value) continue;
        if (typeof value === "string") {
            map.set(actorId, { discordUserId: value });
        } else {
            map.set(actorId, value);
        }
    }
    return map;
}

/**
 * Read the user-mention-config setting and return a migrated Map.
 * Consumers should use this instead of reading the setting directly.
 */
export function getUserMentionMap(): Map<string, UserMentionEntry> {
    const raw = game.settings.get(MODULE_NAME, "user-mention-config") as [
        string,
        string | UserMentionEntry,
    ][];
    return migrateUserMap(raw);
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export class UserMentionConfig extends FormApplication {
    _fetchedMembers: DiscordMemberOption[] = [];

    static get defaultOptions(): FormApplicationOptions {
        return foundry.utils.mergeObject(super.defaultOptions, {
            title: game.i18n.localize(`${MODULE_NAME}.UserMentionConfig.Title`),
            template: "modules/pbd-tools/templates/user-mention-config.hbs",
            width: 750,
            height: 600,
            closeOnSubmit: false,
            tabs: [
                {
                    navSelector: ".tabs",
                    contentSelector: ".tabs-content",
                    initial: "sceneTab",
                },
            ],
        });
    }

    static registerSettings(): void {
        game.settings.register(MODULE_NAME, "user-mention-config", {
            name: "",
            hint: "",
            type: Array,
            scope: "world",
            config: false,
            default: {},
        });
    }

    getData(): UserMentionConfigData {
        const pcs: ActorPF2e[] = game.actors.filter(
            (actor) => actor.type === "character",
        );
        const userMap = getUserMentionMap();

        let botConfigured = false;
        try {
            const token = game.settings.get(MODULE_NAME, "bot-token") as string;
            const guildId = game.settings.get(
                MODULE_NAME,
                "bot-guild-id",
            ) as string;
            botConfigured = !!(token && guildId);
        } catch {
            // Bot settings not registered
        }

        return {
            pcs,
            userMap,
            botConfigured,
            discordMembers: this._fetchedMembers,
        } as UserMentionConfigData;
    }

    activateListeners(html: JQuery): void {
        super.activateListeners(html);

        html.find(".delete-entry").click(async (event) => {
            const actorId = event.currentTarget.getAttribute(
                "data-actor-id-placeholder",
            ) as string;
            const userMap = getUserMentionMap();
            userMap.delete(actorId);
            await game.settings.set(
                MODULE_NAME,
                "user-mention-config",
                Array.from(userMap),
            );
            this.render();
        });

        html.find(".fetch-discord-users").click(async (event) => {
            event.preventDefault();
            await this._onFetchDiscordUsers();
        });
    }

    async _onFetchDiscordUsers(): Promise<void> {
        try {
            const token = game.settings.get(MODULE_NAME, "bot-token") as string;
            const guildId = game.settings.get(
                MODULE_NAME,
                "bot-guild-id",
            ) as string;
            if (!token || !guildId) {
                ui.notifications.warn(
                    game.i18n.localize(
                        `${MODULE_NAME}.UserMentionConfig.NoBotConfigured`,
                    ),
                );
                return;
            }

            const { getGuildMembers } = await import("../discord-bot.ts");
            const members: APIGuildMember[] = await getGuildMembers(
                token,
                guildId,
            );

            this._fetchedMembers = members
                .filter((m) => !m.user?.bot)
                .map((m) => ({
                    id: m.user!.id,
                    displayName:
                        m.nick ??
                        m.user?.global_name ??
                        m.user?.username ??
                        m.user!.id,
                }))
                .sort((a, b) =>
                    a.displayName.localeCompare(b.displayName, undefined, {
                        sensitivity: "base",
                    }),
                );

            ui.notifications.info(
                game.i18n.format(
                    `${MODULE_NAME}.UserMentionConfig.FetchedMembers`,
                    { count: String(this._fetchedMembers.length) },
                ),
            );
            this.render();
        } catch (error) {
            console.error("[PBD-Tools] Failed to fetch guild members:", error);
            ui.notifications.error(
                game.i18n.localize(
                    `${MODULE_NAME}.UserMentionConfig.FetchFailed`,
                ),
            );
        }
    }

    async _updateObject(
        _event: Event,
        formData: Record<string, unknown> & UserMentionConfigFormData,
    ): Promise<void> {
        const actorId = formData.actorId;
        if (!actorId) return;

        // Prefer dropdown selection, fall back to manual text input
        const discordUserId =
            (formData.discordUserSelect as string) ||
            (formData.userId as string);
        if (!discordUserId) return;

        const alias = (formData.alias as string) || undefined;

        // Find display name from fetched members
        let discordDisplayName: string | undefined;
        if (formData.discordUserSelect) {
            const member = this._fetchedMembers.find(
                (m) => m.id === formData.discordUserSelect,
            );
            discordDisplayName = member?.displayName;
        }

        const entry: UserMentionEntry = {
            discordUserId,
            discordDisplayName,
            alias,
        };

        const userMap = getUserMentionMap();
        userMap.set(actorId, entry);
        await game.settings.set(
            MODULE_NAME,
            "user-mention-config",
            Array.from(userMap),
        );
        this.render();
    }

    async _renderInner(
        data: UserMentionConfigData,
        options: AppV1RenderOptions,
    ): Promise<JQuery> {
        const inner = await super._renderInner(data, options);

        // Populate Discord user dropdown options
        const select = inner.find(
            "#discordUserSelect",
        ) as JQuery<HTMLSelectElement>;
        for (const member of data.discordMembers) {
            const opt = document.createElement("option");
            opt.value = member.id;
            opt.textContent = `${member.displayName} (${member.id})`;
            select.append(opt);
        }

        const configRows = inner.find("#config-rows");
        data.userMap.forEach((entry: UserMentionEntry, actorId: string) => {
            const actor = game.actors.get(actorId);
            const actorName = actor ? actor.name : "Unknown Actor";
            const displayUser = entry.discordDisplayName ?? entry.discordUserId;
            const aliasText = entry.alias ?? "";
            const rowHtml = `
            <tr>
              <td style="text-align: center;">${actorName}</td>
              <td style="text-align: center;">${displayUser}</td>
              <td style="text-align: center;">${aliasText}</td>
              <td><button class="btn btn-danger delete-entry" data-actor-id-placeholder="${actorId}">Delete</button></td>
            </tr>
          `;
            configRows.append(rowHtml);
        });

        return inner;
    }
}
