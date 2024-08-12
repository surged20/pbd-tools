import TurndownService from 'turndown';
import { generateImageLink } from "./images.ts";

export function convertToMarkdown(html: string) {
    const turndownService = new TurndownService();
    turndownService.addRule('image', {
        filter: ['img'],
        replacement: function (_content, _node) {
            return '';
        }
    });
    return turndownService.turndown(html);
}

export async function createJournalData (pageData: any) {
    let content = "";
    let embeds: any = [];

    switch (pageData.type) {
        case "text":
            const turndownService = new TurndownService();
            turndownService.addRule('image', {
                filter: ['img'],
                replacement: function (_content, _node) {
                    return '';
                }
            });
            const embed = {
                title: pageData.name,
                description: turndownService.turndown(pageData.text.content)
            };
            const parser = new DOMParser();
            const doc = parser.parseFromString(pageData.text.content, "text/html");
            const getImages = el =>
                [...el.getElementsByTagName('img')].map(img => img.getAttribute('src'));
            const images = getImages(doc);
            if (images.length > 0) {
                let link;
                if (images[0].startsWith("http")) {
                    link = images[0];
                } else {
                    link = await generateImageLink(images[0], false);
                }
                embed["image"] = {
                    url: link
                }
            }
            embeds.push(embed);
            break;
        case "image":
            embeds = [{                                                                                                                                     
                title: pageData.name,
                image: {
                    url: await generateImageLink(pageData.src)
                },
                footer: {
                    text: pageData.image.caption
                }
            }];
            break;
        case "video":
            let link;
            if (pageData.src.startsWith("http")) {
                link = pageData.src;
            } else {
                link = await generateImageLink(pageData.src, false);
            }
            content = "[" + pageData.name + "](" + link + ")";
            break;
        default:
            ui.notifications.warn("Journal page type not supported.");
            break;
    }

    return [content, embeds];
}