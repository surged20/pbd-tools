/**
 * Lightweight Discord API proxy for pbd-tools.
 *
 * Discord's API blocks browser requests that carry a Bot token
 * (CORS preflight fails). This tiny proxy runs on localhost and
 * forwards authenticated requests to Discord, adding the proper
 * CORS headers so the Foundry VTT client can read responses.
 *
 * Usage:
 *   node scripts/discord-proxy.mjs          # default port 3001
 *   PORT=4000 node scripts/discord-proxy.mjs # custom port
 *
 * Only webhook-management calls go through this proxy.
 * Webhook *execution* (message sending) goes directly to Discord.
 */

import { createServer } from "node:http";

const DISCORD_API = "https://discord.com/api/v10";
const PORT = parseInt(process.env.PORT || "3001", 10);
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";

const server = createServer(async (req, res) => {
    // CORS headers
    res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
    res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, PATCH, OPTIONS",
    );
    res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization",
    );

    // Handle preflight
    if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
    }

    // Only proxy /api/v10/* paths
    const discordUrl = `${DISCORD_API}${req.url}`;

    // Read request body for methods that carry one
    let body = undefined;
    if (["POST", "PUT", "PATCH"].includes(req.method)) {
        const chunks = [];
        for await (const chunk of req) {
            chunks.push(chunk);
        }
        body = Buffer.concat(chunks);
        if (body.length === 0) body = undefined;
    }

    // Forward headers, swapping host
    const forwardHeaders = {};
    if (req.headers.authorization)
        forwardHeaders["Authorization"] = req.headers.authorization;
    if (req.headers["content-type"])
        forwardHeaders["Content-Type"] = req.headers["content-type"];

    try {
        const discordRes = await fetch(discordUrl, {
            method: req.method,
            headers: forwardHeaders,
            body,
        });

        // Copy status and selected headers back
        const responseHeaders = {
            "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
        };
        const ct = discordRes.headers.get("content-type");
        if (ct) responseHeaders["Content-Type"] = ct;

        const responseBody = await discordRes.arrayBuffer();
        res.writeHead(discordRes.status, responseHeaders);
        res.end(Buffer.from(responseBody));
    } catch (error) {
        console.error("[discord-proxy] Fetch failed:", error.message);
        res.writeHead(502, {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
        });
        res.end(JSON.stringify({ error: error.message }));
    }
});

server.listen(PORT, "127.0.0.1", () => {
    console.log(`[pbd-tools] Discord API proxy listening on http://127.0.0.1:${PORT}`);
    console.log(`[pbd-tools] Proxying to ${DISCORD_API}`);
    console.log(`[pbd-tools] Press Ctrl+C to stop`);
});
