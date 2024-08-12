import TurndownService from "turndown";
import { generateImageLink } from "./images.ts";
import { DiscordEmbed, DiscordWebhookData } from "./constants.ts";

export function convertToMarkdown(html: string): string {
    const turndownService = new TurndownService();
    turndownService.addRule("image", {
        filter: ["img"],
        replacement: function (_content, _node) {
            return "";
        },
    });
    return turndownService.turndown(html);
}

export async function createJournalData(
    page: JournalEntryPage,
): Promise<DiscordWebhookData> {
    let content = "";
    let embeds: DiscordEmbed[] = [];
    const pageContent = page.text.content as string;
    const pageSrc = page.src as string;

    switch (page.type) {
        case "text": {
            const turndownService = new TurndownService();
            turndownService.addRule("image", {
                filter: ["img"],
                replacement: function (_content, _node) {
                    return "";
                },
            });
            const embed: DiscordEmbed = {
                title: page.name,
                description: turndownService.turndown(pageContent),
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
