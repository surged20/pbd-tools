import type {
    APIGuild,
    APIChannel,
    APIWebhook,
    APIEmoji,
    APIGuildMember,
    APIThreadChannel,
    RESTPostAPIChannelWebhookJSONBody,
    RESTPostAPIWebhookWithTokenJSONBody,
    RESTGetAPIGuildThreadsResult,
} from "discord-api-types/v10";
import {
    DISCORD_API_BASE,
    DEFAULT_PROXY_URL,
    MODULE_NAME,
} from "./constants.ts";

export type { APIGuild, APIChannel, APIWebhook, APIEmoji, APIGuildMember };

export interface ManagedWebhook {
    id: string;
    token: string;
    channelId: string;
}

export interface DiscoveredChannel {
    id: string;
    name: string;
    type: number;
    parentId?: string;
    parentName?: string;
}

/**
 * Returns the base URL for Bot-authenticated API calls.
 * These go through a local CORS proxy to avoid browser restrictions.
 * Run `npm run proxy` to start the proxy before using bot features.
 */
function getBotApiBase(): string {
    try {
        const proxyUrl = game.settings.get(
            MODULE_NAME,
            "bot-proxy-url",
        ) as string;
        if (proxyUrl) return proxyUrl;
    } catch {
        // Settings may not be registered yet
    }
    return DEFAULT_PROXY_URL;
}

/**
 * Authenticated Discord API request. Routes through the local CORS proxy
 * because browser fetch with Authorization headers is blocked by Discord's
 * CORS policy. The proxy at getBotApiBase() forwards to Discord and adds
 * the required Access-Control-Allow-Origin header.
 */
async function discordApiRequest<T>(
    token: string,
    method: string,
    path: string,
    body?: unknown,
): Promise<T> {
    const url = `${getBotApiBase()}${path}`;
    const headers: Record<string, string> = {
        Authorization: `Bot ${token}`,
    };
    const init: RequestInit = { method, headers };

    if (body !== undefined) {
        headers["Content-Type"] = "application/json";
        init.body = JSON.stringify(body);
    }

    const response = await fetch(url, init);

    if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(
            `Discord API ${method} ${path} failed: ${response.status} ${response.statusText} ${text}`,
        );
    }

    if (response.status === 204) {
        return undefined as T;
    }

    return (await response.json()) as T;
}

export async function getBotGuilds(token: string): Promise<APIGuild[]> {
    return discordApiRequest<APIGuild[]>(token, "GET", "/users/@me/guilds");
}

export async function getGuildWebhooks(
    token: string,
    guildId: string,
): Promise<APIWebhook[]> {
    return discordApiRequest<APIWebhook[]>(
        token,
        "GET",
        `/guilds/${guildId}/webhooks`,
    );
}

export async function getChannel(
    token: string,
    channelId: string,
): Promise<APIChannel> {
    return discordApiRequest<APIChannel>(
        token,
        "GET",
        `/channels/${channelId}`,
    );
}

export async function getGuildEmojis(
    token: string,
    guildId: string,
): Promise<APIEmoji[]> {
    return discordApiRequest<APIEmoji[]>(
        token,
        "GET",
        `/guilds/${guildId}/emojis`,
    );
}

export async function getGuildChannels(
    token: string,
    guildId: string,
): Promise<APIChannel[]> {
    return discordApiRequest<APIChannel[]>(
        token,
        "GET",
        `/guilds/${guildId}/channels`,
    );
}

export async function getGuildMembers(
    token: string,
    guildId: string,
): Promise<APIGuildMember[]> {
    return discordApiRequest<APIGuildMember[]>(
        token,
        "GET",
        `/guilds/${guildId}/members?limit=1000`,
    );
}

export async function getGuildActiveThreads(
    token: string,
    guildId: string,
): Promise<APIThreadChannel[]> {
    const result = await discordApiRequest<RESTGetAPIGuildThreadsResult>(
        token,
        "GET",
        `/guilds/${guildId}/threads/active`,
    );
    return result.threads as APIThreadChannel[];
}

export async function createWebhook(
    token: string,
    channelId: string,
    name: string,
): Promise<APIWebhook> {
    const body: RESTPostAPIChannelWebhookJSONBody = { name };
    return discordApiRequest<APIWebhook>(
        token,
        "POST",
        `/channels/${channelId}/webhooks`,
        body,
    );
}

export async function deleteWebhook(
    token: string,
    webhookId: string,
): Promise<void> {
    await discordApiRequest<void>(token, "DELETE", `/webhooks/${webhookId}`);
}

export async function executeWebhook(
    webhookId: string,
    webhookToken: string,
    payload: RESTPostAPIWebhookWithTokenJSONBody,
    threadId?: string,
): Promise<void> {
    let url = `${DISCORD_API_BASE}/webhooks/${webhookId}/${webhookToken}?wait=true`;
    if (threadId) url += `&thread_id=${threadId}`;
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(
            `Discord webhook execute failed: ${response.status} ${response.statusText} ${text}`,
        );
    }
}

export async function executeWebhookFormData(
    webhookId: string,
    webhookToken: string,
    formData: FormData,
    threadId?: string,
): Promise<Response> {
    let url = `${DISCORD_API_BASE}/webhooks/${webhookId}/${webhookToken}?wait=true`;
    if (threadId) url += `&thread_id=${threadId}`;
    const response = await fetch(url, {
        method: "POST",
        body: formData,
    });
    return response;
}

export async function getWebhook(
    token: string,
    webhookId: string,
): Promise<APIWebhook> {
    return discordApiRequest<APIWebhook>(
        token,
        "GET",
        `/webhooks/${webhookId}`,
    );
}

/**
 * Check if a webhook is still valid using the unauthenticated endpoint.
 * This does NOT require the CORS proxy since no Authorization header is sent.
 * Returns true if the webhook responds 200, false otherwise.
 */
export async function checkWebhookValid(
    webhookId: string,
    webhookToken: string,
): Promise<boolean> {
    try {
        const url = `${DISCORD_API_BASE}/webhooks/${webhookId}/${webhookToken}`;
        const response = await fetch(url, { method: "GET" });
        return response.ok;
    } catch {
        return false;
    }
}

export async function discoverChannels(
    token: string,
    guildId: string,
    rpgSageAppId: string,
): Promise<DiscoveredChannel[]> {
    const webhooks = await getGuildWebhooks(token, guildId);

    const sageWebhooks = webhooks.filter(
        (wh) => wh.application_id === rpgSageAppId,
    );

    const uniqueChannelIds = [
        ...new Set(sageWebhooks.map((wh) => wh.channel_id)),
    ];

    // Build channel name map from guild channels (single API call)
    const nameMap = new Map<string, { name: string; type: number }>();
    try {
        const guildChannels = await getGuildChannels(token, guildId);
        for (const ch of guildChannels) {
            if ("name" in ch && ch.name) {
                nameMap.set(ch.id, { name: ch.name, type: ch.type });
            }
        }
    } catch (error) {
        console.warn(
            "[PBD-Tools] Could not fetch guild channels for name resolution:",
            error,
        );
    }

    const channels: DiscoveredChannel[] = uniqueChannelIds.map((channelId) => {
        const info = nameMap.get(channelId);
        return {
            id: channelId,
            name: info?.name ?? channelId,
            type: info?.type ?? 0,
        };
    });

    // Also discover active threads whose parent is a discovered channel
    try {
        const threads = await getGuildActiveThreads(token, guildId);
        const discoveredChannelIds = new Set(uniqueChannelIds);
        for (const thread of threads) {
            if (
                thread.parent_id &&
                discoveredChannelIds.has(thread.parent_id)
            ) {
                const parentInfo = nameMap.get(thread.parent_id);
                channels.push({
                    id: thread.id,
                    name: thread.name ?? thread.id,
                    type: thread.type,
                    parentId: thread.parent_id,
                    parentName: parentInfo?.name ?? thread.parent_id,
                });
            }
        }
    } catch (error) {
        console.warn("[PBD-Tools] Could not fetch active threads:", error);
    }

    return channels;
}
