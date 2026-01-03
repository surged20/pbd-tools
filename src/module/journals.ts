import TurndownService from "turndown";
import { generateImageLink } from "./images.ts";
import { DiscordEmbed, DiscordWebhookData } from "./constants.ts";
import { resolveUUIDs } from "./uuid-resolver.ts";

export async function createJournalData(
    page: JournalEntryPage,
): Promise<DiscordWebhookData> {
    let content = "";
    let embeds: DiscordEmbed[] = [];


    if (!page) {
        console.error("[PBD-Tools] Page is null or undefined");
        return { content: "", embeds: [] };
    }

    // Handle different page structures between v12 and v13
    let pageContent = "";
    let pageSrc = "";

    try {
        // Try different ways to access the content
        if (page.text && page.text.content) {
            pageContent = page.text.content as string;
        } else if ((page as any).content) {
            pageContent = (page as any).content as string;
        } else if ((page as any).text) {
            pageContent = (page as any).text as string;
        } else {
            console.warn(
                "[PBD-Tools] Could not find page content, using empty string",
            );
            pageContent = "";
        }

        pageSrc = (page.src || (page as any).src || "") as string;
    } catch (error) {
        console.error("[PBD-Tools] Error accessing page properties:", error);
        return { content: "", embeds: [] };
    }

    switch (page.type) {
        case "text": {
            // Resolve UUIDs, check links, and content links in the HTML
            const contentWithResolvedUUIDs = await resolveUUIDs(pageContent);

            // Convert HTML to markdown
            const turndownService = new TurndownService();
            turndownService.addRule("image", {
                filter: ["img"],
                replacement: function (_content, _node) {
                    return "";
                },
            });

            // Add rule to handle content links properly
            turndownService.addRule("contentLink", {
                filter: function (node) {
                    return (
                        node.nodeName === "A" &&
                        node.getAttribute("class") === "content-link"
                    );
                },
                replacement: function (content, _node) {
                    // Strip any HTML tags from content and return just the text
                    return content.replace(/<[^>]*>/g, '').trim();
                },
            });
            const markdownContent = turndownService.turndown(contentWithResolvedUUIDs);

            const embed: DiscordEmbed = {
                title: page.name,
                description: markdownContent,
            };
            const parser = new DOMParser();
            const doc = parser.parseFromString(pageContent, "text/html");
            const getImages = (el) =>
                [...el.getElementsByTagName("img")].map((img) =>
                    img.getAttribute("src"),
                );
            const images = getImages(doc);
            if (images.length > 0) {
                let link;
                if (images[0].startsWith("http")) {
                    link = images[0];
                } else {
                    link = await generateImageLink(images[0], false);
                }
                embed["image"] = {
                    url: link,
                };
            }
            embeds.push(embed);
            break;
        }
        case "image":
            embeds = [
                {
                    title: page.name,
                    image: {
                        url: await generateImageLink(pageSrc),
                    },
                    footer: {
                        text: page.image.caption as string,
                    },
                },
            ];
            break;
        case "video": {
            let link: string;
            if (pageSrc.startsWith("http")) {
                link = pageSrc;
            } else {
                link = await generateImageLink(pageSrc, false);
            }
            content = "[" + page.name + "](" + link + ")";
            break;
        }
        default:
            ui.notifications.warn("Journal page type not supported.");
            break;
    }

    return { content: content, embeds: embeds } as DiscordWebhookData;
}
