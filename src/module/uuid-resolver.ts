/**
 * UUID Resolution Module
 *
 * This module provides functionality to resolve Foundry VTT UUID references
 * in journal content and replace them with readable names for Discord export.
 *
 * Common UUID patterns in Foundry:
 * - @UUID[Actor.abc123def456] - References to actors
 * - @UUID[Item.abc123def456] - References to items
 * - @UUID[JournalEntry.abc123def456] - References to journal entries
 * - @UUID[JournalEntry.abc123def456.JournalEntryPage.xyz789] - References to journal pages
 * - @UUID[Scene.abc123def456] - References to scenes
 * - @UUID[RollTable.abc123def456] - References to roll tables
 * - @UUID[Macro.abc123def456] - References to macros
 * - @UUID[Compendium.world.collection.entryId] - References to compendium entries
 *
 * Also handles content links in HTML:
 * - <a class="content-link" data-uuid="..." data-type="...">Display Name</a>
 */

// Regular expression to match UUID references in text, with optional display text
const UUID_PATTERN = /@UUID\[([^\]]+)\](?:\{([^}]+)\})?/g;

// Regular expression to match PF2e check references
const CHECK_PATTERN = /@Check\[([^\]]+)\]/g;

// Regular expression to match content links - find all <a> tags first
const ALL_A_TAGS_PATTERN = /<a[^>]*>(.*?)<\/a>/gis;

/**
 * Helper function to strip HTML tags and extract plain text
 */
function stripHtmlTags(html: string): string {
    // Remove HTML tags while preserving the text content
    return html.replace(/<[^>]*>/g, "").trim();
}

/**
 * Helper function to parse PF2e check parameters
 */
function parseCheckParameters(checkString: string): string {
    try {
        // Parse parameters: "survival|dc:15|traits:secret,concentrate,exploration,move,skill,action:track|name:Track"
        const params = checkString.split("|");
        const skill = params[0]; // First parameter is the skill

        let dc = "";
        let name = "";

        // Parse other parameters
        for (const param of params.slice(1)) {
            if (param.startsWith("dc:")) {
                dc = param.substring(3);
            } else if (param.startsWith("name:")) {
                name = param.substring(5);
            }
        }

        // Prioritize "DC X Skill" format, fallback to name, then skill only
        if (dc && skill) {
            // Capitalize skill name
            const capitalizedSkill =
                skill.charAt(0).toUpperCase() + skill.slice(1);
            return `DC ${dc} ${capitalizedSkill}`;
        } else if (name) {
            return name;
        } else {
            // Fallback to just skill name
            return skill.charAt(0).toUpperCase() + skill.slice(1);
        }
    } catch (error) {
        console.warn(
            "[PBD-Tools] Failed to parse check parameters:",
            checkString,
            error,
        );
        return `[Check: ${checkString}]`;
    }
}

/**
 * Helper function to extract data-uuid from a content-link <a> tag
 */
function extractContentLinkInfo(aTag: string): {
    isContentLink: boolean;
    uuid?: string;
    fullMatch: string;
} {
    // Check if this is a content-link
    const isContentLink = /class="content-link"/.test(aTag);
    if (!isContentLink) {
        return { isContentLink: false, fullMatch: aTag };
    }

    // Extract the data-uuid value
    const uuidMatch = aTag.match(/data-uuid="([^"]+)"/);
    if (uuidMatch) {
        return {
            isContentLink: true,
            uuid: uuidMatch[1],
            fullMatch: aTag,
        };
    }

    return { isContentLink: false, fullMatch: aTag };
}

/**
 * Parse a UUID string to extract document type and ID information
 */
function parseUUID(uuid: string): {
    type: string;
    id: string;
    pageId?: string;
    compendium?: string;
    pack?: string;
} | null {
    try {
        // Handle compendium UUIDs: Compendium.world.collection.DocumentType.entryId
        if (uuid.startsWith("Compendium.")) {
            const parts = uuid.split(".");
            if (parts.length >= 5) {
                // Format: Compendium.pf2e.deities.Item.aipkJQxP4GBsTaGq
                return {
                    type: "Compendium",
                    compendium: parts[1], // pf2e
                    pack: parts[2], // deities
                    id: parts[4], // aipkJQxP4GBsTaGq (skip the document type)
                };
            } else if (parts.length >= 4) {
                // Fallback for older format: Compendium.world.collection.entryId
                return {
                    type: "Compendium",
                    compendium: parts[1],
                    pack: parts[2],
                    id: parts[3],
                };
            }
        }

        // Handle regular document UUIDs: Type.id or Type.id.SubType.subId
        const parts = uuid.split(".");
        if (parts.length >= 2) {
            const result = {
                type: parts[0],
                id: parts[1],
            };

            // Check for nested documents (like journal pages)
            if (parts.length >= 4 && parts[2] === "JournalEntryPage") {
                (result as { pageId?: string }).pageId = parts[3];
            }

            return result;
        }
    } catch (error) {
        console.warn("[PBD-Tools] Failed to parse UUID:", uuid, error);
    }

    return null;
}

/**
 * Resolve a single UUID to its document name
 */
async function resolveUUID(uuid: string): Promise<string> {
    const parsed = parseUUID(uuid);
    if (!parsed) {
        console.warn("[PBD-Tools] Could not parse UUID:", uuid);
        return `[Unknown Reference: ${uuid}]`;
    }

    try {
        // Handle compendium references
        if (parsed.type === "Compendium") {
            const pack = game.packs.get(`${parsed.compendium}.${parsed.pack}`);
            if (pack) {
                const document = await pack.getDocument(parsed.id);
                if (document) {
                    return document.name;
                }
            }
            return `[Compendium: ${parsed.pack}]`;
        }

        // Handle regular document references
        let collection:
            | {
                  get: (id: string) =>
                      | {
                            name: string;
                            pages?: {
                                get: (
                                    id: string,
                                ) => { name: string } | undefined;
                            };
                        }
                      | undefined;
              }
            | undefined;
        switch (parsed.type) {
            case "Actor":
                collection = game.actors;
                break;
            case "Item":
                collection = game.items;
                break;
            case "JournalEntry":
                collection = game.journal;
                break;
            case "Scene":
                collection = game.scenes;
                break;
            case "RollTable":
                collection = game.tables;
                break;
            case "Macro":
                collection = game.macros;
                break;
            default:
                console.warn("[PBD-Tools] Unknown UUID type:", parsed.type);
                return `[${parsed.type}]`;
        }

        if (!collection) {
            return `[${parsed.type}]`;
        }

        const document = collection.get(parsed.id);
        if (document) {
            // Handle journal page references
            if (parsed.pageId && document.pages) {
                const page = document.pages.get(parsed.pageId);
                if (page) {
                    return `${document.name}: ${page.name}`;
                }
            }
            return document.name;
        }

        // Try using fromUuid as a fallback for more complex references
        const fallbackDoc = await fromUuid(uuid);
        if (fallbackDoc && "name" in fallbackDoc) {
            return (fallbackDoc as { name: string }).name;
        }
    } catch (error) {
        console.warn("[PBD-Tools] Error resolving UUID:", uuid, error);
    }

    return `[${parsed.type}: ${parsed.id}]`;
}

/**
 * Resolve all UUID references in a text string
 */
export async function resolveUUIDs(text: string): Promise<string> {
    if (!text || typeof text !== "string") {
        return text;
    }

    // Find all UUID references and check references in the text
    const uuidMatches = Array.from(text.matchAll(UUID_PATTERN));
    const checkMatches = Array.from(text.matchAll(CHECK_PATTERN));
    const aTagMatches = Array.from(text.matchAll(ALL_A_TAGS_PATTERN));

    // Filter to only content-link tags
    const contentLinkInfo = aTagMatches
        .map((match) => {
            const info = extractContentLinkInfo(match[0]);
            return {
                ...info,
                innerContent: match[1], // The content inside the <a> tags
            };
        })
        .filter((info) => info.isContentLink);

    const totalMatches =
        uuidMatches.length + checkMatches.length + contentLinkInfo.length;
    if (totalMatches === 0) {
        return text;
    }

    // Prepare all resolutions
    const allResolutions: { fullMatch: string; resolvedName: string }[] = [];

    // Handle @UUID[...] patterns
    const uuidResolutions = await Promise.all(
        uuidMatches.map(async (match) => {
            const fullMatch = match[0]; // @UUID[...] or @UUID[...]{DisplayText}
            const uuid = match[1]; // The UUID inside the brackets
            const displayText = match[2]; // The display text inside curly brackets (if present)

            // Use display text if available, otherwise resolve UUID
            const resolvedName = displayText || (await resolveUUID(uuid));
            return { fullMatch, resolvedName };
        }),
    );
    allResolutions.push(...uuidResolutions);

    // Handle @Check[...] patterns
    const checkResolutions = checkMatches.map((match) => {
        const fullMatch = match[0]; // @Check[...]
        const checkParams = match[1]; // The parameters inside the brackets

        const resolvedName = parseCheckParameters(checkParams);
        return { fullMatch, resolvedName };
    });
    allResolutions.push(...checkResolutions);

    // Handle content link patterns
    const contentLinkResolutions = contentLinkInfo.map((info) => {
        // Strip HTML tags to get clean text (handles <i> icons, etc.)
        const displayText = stripHtmlTags(info.innerContent || "");

        return {
            fullMatch: info.fullMatch,
            resolvedName: displayText,
        };
    });
    allResolutions.push(...contentLinkResolutions);

    // Replace all references with resolved names
    let resolvedText = text;
    for (const { fullMatch, resolvedName } of allResolutions) {
        resolvedText = resolvedText.replace(fullMatch, resolvedName);
    }

    return resolvedText;
}

/**
 * Enhanced convertToMarkdown that also resolves UUIDs
 */
export async function convertToMarkdownWithUUIDs(
    html: string,
): Promise<string> {
    // First resolve UUIDs while still in HTML format
    const htmlWithResolvedUUIDs = await resolveUUIDs(html);

    // Then convert to markdown using the existing function
    const TurndownService = (await import("turndown")).default;
    const turndownService = new TurndownService({
        headingStyle: "atx",
        codeBlockStyle: "fenced",
    });

    turndownService.addRule("image", {
        filter: ["img"],
        replacement: function (_content, _node) {
            return "";
        },
    });

    return turndownService.turndown(htmlWithResolvedUUIDs);
}
