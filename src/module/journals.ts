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
    pageData: JournalSheetPageData,
): Promise<DiscordWebhookData> {
    let content = "";
    let embeds: DiscordEmbed[] = [];
    const pageDataSrc = pageData.src as string;

    switch (pageData.type) {
        case "text": {
            const turndownService = new TurndownService();
            turndownService.addRule("image", {
                filter: ["img"],
                replacement: function (_content, _node) {
                    return "";
                },
            });
            const embed: DiscordEmbed = {
                title: pageData.name,
                description: turndownService.turndown(pageData.text.content),
            };
            const parser = new DOMParser();
            const doc = parser.parseFromString(
                pageData.text.content as string,
                "text/html",
            );
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
                    title: pageData.name,
                    image: {
                        url: await generateImageLink(pageDataSrc),
                    },
                    footer: {
                        text: pageData.image.caption as string,
                    },
                },
            ];
            break;
        case "video": {
            let link: string;
            if (pageDataSrc.startsWith("http")) {
                link = pageData.src as string;
            } else {
                link = await generateImageLink(pageDataSrc, false);
            }
            content = "[" + pageData.name + "](" + link + ")";
            break;
        }
        default:
            ui.notifications.warn("Journal page type not supported.");
            break;
    }

    return { content: content, embeds: embeds } as DiscordWebhookData;
}
