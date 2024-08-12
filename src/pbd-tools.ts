import { Channel, MODULE_NAME, isPF2e } from "./module/constants.ts";
import { registerSettings, isChannelActive } from "./module/settings.ts";
import { updateTracker } from "./module/tracker.ts";
import { postDiscordImage, postDiscordJournal, postDiscordNPC } from "./module/discord.ts";
import { initContextMenu } from "./module/context-menu.ts";

Hooks.on("init", () => {
    registerSettings();
});


Hooks.on("ready", () => {
    if (!game.user.isGM) return;

    initContextMenu();
})

Hooks.on("renderCombatTracker", async (_app, html: JQuery<JQuery.Node>) => {
    if (!game.user.isGM || !isPF2e() || (game?.combat?.turns.length === 0)) return;

    const tooltip = game.i18n.localize(`${MODULE_NAME}.UpdateTrackerTooltip`);
    const encounterControls = html.find('.encounter-controls')[0];
    const encounterTitle = html.find('.encounter-title')[0];
    const a = document.createElement("a");
    a.setAttribute('class', 'combat-button combat-control');
    a.setAttribute('role', `button`);
    a.setAttribute('aria-label', tooltip);
    a.setAttribute('data-tooltip', tooltip);
    a.setAttribute('data-control', "update-tracker");

    const i = document.createElement("i");
    i.setAttribute('class', 'fa-brands fa-discord');
    a.appendChild(i);
    encounterControls.insertBefore(a, encounterTitle);
    a.addEventListener("click", (event) => {
        event.preventDefault();
        updateTracker();
    });
});

Hooks.on('getAbstractNPCSheetHeaderButtons', (sheet, buttons: any) => { // FIXME any
    if (!game.user.isGM) return;

    if (isChannelActive(Channel.GM))
        buttons.unshift(                                
            {
                label: "Create NPC",
                class: 'send-npc-to-discord-gm',
                icon: 'fa-brands fa-discord',
                onclick: async () => {
                    postDiscordNPC(sheet);
                }
            }
        );
});

Hooks.on('getJournalSheetHeaderButtons', (sheet, buttons: any) => { // FIXME any
    if (!game.user.isGM) return;

    if (isChannelActive(Channel.IC))
        buttons.unshift(                                
            {
                label: "IC",
                class: 'send-page-to-discord-ic',
                icon: 'fa-brands fa-discord',
                onclick: async () => {
                    postDiscordJournal(Channel.IC, sheet);
                }
            }
    );
    if (isChannelActive(Channel.OOC))
        buttons.unshift(                                
            {
                label: "OOC",
                class: 'send-page-to-discord-ooc',
                icon: 'fa-brands fa-discord',
                onclick: async () => {
                    postDiscordJournal(Channel.OOC, sheet);
                }
            }
        );
    if (isChannelActive(Channel.GM))
        buttons.unshift(                                
            {
                label: "GM",
                class: 'send-page-to-discord-gm',
                icon: 'fa-brands fa-discord',
                onclick: async () => {
                    postDiscordJournal(Channel.GM, sheet);
                }
            }
        );
});

Hooks.on('getImagePopoutHeaderButtons', (sheet, buttons: any) => { // FIXME any
    if (!game.user.isGM) return;

    if (isChannelActive(Channel.IC))
        buttons.unshift(                                
            {
                label: "IC",
                class: 'send-image-to-discord-ic',
                icon: 'fa-brands fa-discord',
                onclick: async () => {
                    postDiscordImage(Channel.IC, sheet);
                }
            }
    );
    if (isChannelActive(Channel.OOC))
        buttons.unshift(                                
            {
                label: "OOC",
                class: 'send-image-to-discord-ooc',
                icon: 'fa-brands fa-discord',
                onclick: async () => {
                    postDiscordImage(Channel.OOC, sheet);
                }
            }
        );
    if (isChannelActive(Channel.GM))
        buttons.unshift(                                
            {
                label: "GM",
                class: 'send-image-to-discord-gm',
                icon: 'fa-brands fa-discord',
                onclick: async () => {
                    postDiscordImage(Channel.GM, sheet);
                }
            }
        );
});