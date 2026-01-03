import type { ActorPF2e, EncounterPF2e, EncounterTracker } from "foundry-pf2e";
import { Channel, MODULE_NAME, isPF2e } from "./module/constants.ts";
import { convertToMarkdown, isComplexHazardOrNpc } from "./module/helpers.ts";
import {
    exportActorNpcTsv,
    exportEncounterNpcTsv,
    exportFolderNpcTsv,
    exportSceneNpcTsv,
} from "./module/export.ts";
import { regionsInit } from "./module/regions.ts";
import { isChannelActive } from "./module/helpers.ts";
import { registerSettings } from "./module/settings/settings.ts";
import { updateTracker } from "./module/tracker.ts";
import {
    postDiscordImage,
    postDiscord,
} from "./module/discord.ts";
import { initContextMenu } from "./module/context-menu.ts";
import {
    getInfluencePage,
    hasInfluence,
    postInfluenceStatblock,
} from "./module/influence.ts";
import { sendNPCStatblock } from "./module/npc-statblock.ts";
import type { ContextMenuEntry } from "foundry-pf2e/foundry/client/applications/ux/context-menu.mjs";
import type { ApplicationV1HeaderButton } from "foundry-pf2e/foundry/client/appv1/api/application-v1.mjs";
// Runtime globals
declare const getTemplate: (path: string, id?: string) => Promise<any>;

// Foundry classes available at runtime
declare const Application: any;
declare const ImagePopout: any;
declare const JournalSheet: any;

Hooks.on("init", () => {
    console.log("[PBD-Tools] Module init hook called");
    // Register region behaviors FIRST, before any other initialization
    regionsInit();

    registerSettings();
    console.log("[PBD-Tools] Init complete");

    const moduleData = game.modules.get(MODULE_NAME);
    if (moduleData) {
        const ChannelExport = {
            IC: Channel.IC,
            OOC: Channel.OOC,
            GM: Channel.GM,
        };
        (moduleData as any).api = {
            postDiscord,
            Channel: ChannelExport,
            convertToMarkdown,
        };
    }
});

Hooks.on("ready", () => {
    console.log("[PBD-Tools] Ready hook called, user isGM:", game.user.isGM);
    if (!game.user.isGM) return;

    initContextMenu();

    console.log("[PBD-Tools] Ready hook complete");
});

// Hook to store auto-generated aliases on actor creation (NPCs, Hazards, and PCs)
Hooks.on("createActor", async (actor: ActorPF2e, _options: any, _userId: string) => {
    // Only process NPCs, Hazards, and PCs, and only for GMs
    if (!game.user.isGM) return;
    if (!actor.isOfType("npc", "hazard", "character")) return;

    // Generate and store the default alias in flags
    const { generateDefaultAlias } = await import("./module/npcs.ts");
    const alias = generateDefaultAlias(actor.name);

    try {
        await actor.setFlag("pbd-tools", "alias", alias);
    } catch (error) {
        console.warn("[PBD-Tools] Failed to set alias flag on actor creation:", error);
    }
});

// Hook into Scene context menus (both Navigation and Directory) using the getSceneContextOptions hook
Hooks.on("getSceneContextOptions", (_html: HTMLElement, entryOptions: ContextMenuEntry[]) => {
    if (!game.user.isGM) return;

    // Add our export options to the scene context menu (works for both Navigation and Directory)
    entryOptions.push({
        name: `${MODULE_NAME}.Export.Server`,
        icon: '<i class="fas fa-cloud-upload"></i>',
        callback: (li: HTMLElement) => {
            // Scene Navigation uses sceneId, Scene Directory uses entryId
            const sceneId = li.dataset.sceneId || li.dataset.entryId;
            if (sceneId) {
                const scene = game.scenes.get(sceneId);
                if (scene) exportSceneNpcTsv(scene, true);
            }
        },
        condition: () => !!game.user.isGM
    });

    entryOptions.push({
        name: `${MODULE_NAME}.Export.Download`,
        icon: '<i class="fas fa-download"></i>',
        callback: (li: HTMLElement) => {
            // Scene Navigation uses sceneId, Scene Directory uses entryId
            const sceneId = li.dataset.sceneId || li.dataset.entryId;
            if (sceneId) {
                const scene = game.scenes.get(sceneId);
                if (scene) exportSceneNpcTsv(scene, false);
            }
        },
        condition: () => !!game.user.isGM
    });
});


Hooks.on("preUpdateToken", (_token: TokenDocument) => {
    if (
        game.settings.get(MODULE_NAME, "inhibit-movement-no-gm") &&
        !game.users.activeGM
    ) {
        ui.notifications.warn("GM must be connected to move tokens");
        return false;
    }
    return true;
});

function beginEndEnabled(): boolean {
    const trackerEnabled = game.settings.get(
        MODULE_NAME,
        "enable-discord-tracker",
    ) as boolean;
    const channelActive = isChannelActive(
        game.settings.get(MODULE_NAME, "tracker-output-channel") as Channel,
    );
    const beginEndEnabled = game.settings.get(
        MODULE_NAME,
        "tracker-begin-end",
    ) as boolean;

    return trackerEnabled && channelActive && beginEndEnabled;
}

Hooks.on("combatStart", async (_encounter: EncounterPF2e) => {
    if (!beginEndEnabled()) return;

    await postDiscord(
        Channel.IC,
        "## " + game.i18n.localize(`${MODULE_NAME}.BeginEncounter`),
    );
    await updateTracker();
});

Hooks.on("deleteCombat", async (_encounter: EncounterPF2e) => {
    if (!beginEndEnabled()) return;

    await postDiscord(
        Channel.IC,
        "## " + game.i18n.localize(`${MODULE_NAME}.EndEncounter`),
    );
});

function createCombatControl(
    element: Document,
    tooltip: string,
    control: string,
    icon: string,
): HTMLAnchorElement {
    // const encounterControls = html.find(".encounter-controls")[0];
    // const encounterTitle = html.find(".encounter-title")[0];
    const encounterControls = element.querySelector(".encounter-controls");
    const encounterTitle = element.querySelector(".encounter-title");
    const a = document.createElement("a");
    a.setAttribute("class", "combat-button combat-control");
    a.setAttribute("role", `button`);
    a.setAttribute("aria-label", tooltip);
    a.setAttribute("data-tooltip", tooltip);
    a.setAttribute("data-control", control);

    const i = document.createElement("i");
    i.setAttribute("class", icon);
    a.appendChild(i);
    if (encounterControls && encounterTitle) {
        encounterControls.insertBefore(a, encounterTitle);
    }

    return a;
}
Hooks.on(
    "renderCombatTracker",
    async (
        app: EncounterTracker<EncounterPF2e>,
        // html: JQuery<JQuery.Node>,
    ) => {
        if (
            !game.user.isGM ||
            !isPF2e() ||
            !app.viewed ||
            app.viewed.turns.length === 0
        )
            return;

        if (app.viewed.started) {
            const trackerEnabled = game.settings.get(
                MODULE_NAME,
                "enable-discord-tracker",
            );
            const channelActive = isChannelActive(
                game.settings.get(
                    MODULE_NAME,
                    "tracker-output-channel",
                ) as Channel,
            );
            if (!trackerEnabled || !channelActive) return;

            const tooltip = game.i18n.localize(
                `${MODULE_NAME}.UpdateTrackerTooltip`,
            );
            const a = createCombatControl(
                // html,
                app.element as unknown as Document,
                tooltip,
                "update-tracker",
                "fa-brands fa-discord",
            );
            a.addEventListener("click", (event) => {
                event.preventDefault();
                updateTracker();
            });
        } else {
            const server: boolean = game.settings.get(
                MODULE_NAME,
                "npc-export-server",
            ) as boolean;
            const icon = server ? "fa-cloud-upload" : "fa-download";

            const tooltip = game.i18n.localize(
                `${MODULE_NAME}.ExportNpcsTrackerTooltip`,
            );
            const a = createCombatControl(
                // html,
                app.element as unknown as Document,
                tooltip,
                "export-npcs",
                `fas ${icon}`,
            );
            a.addEventListener("click", (event) => {
                event.preventDefault();
                exportEncounterNpcTsv(app.viewed, server);
            });
        }
    },
);

function actorFolderCallback(li: HTMLElement, server: boolean): void {
    const di = li.closest(".directory-item");
    const folderId = (di as HTMLElement)?.dataset?.folderId || (di as any)?.data?.("folderId");
    const folder = game.folders.get(folderId);
    if (folder) exportFolderNpcTsv(folder, server);
}

Hooks.on(
    "getActorFolderContextOptions",
    (_application: any, entryOptions: ContextMenuEntry[]) => {
        entryOptions.push({
            name: `${MODULE_NAME}.Export.Server`,
            icon: '<i class="fas fa-cloud-upload"></i>',
            callback: async (li) => actorFolderCallback(li, true),
            condition: (_li) => {
                return true;
            },
        });
        entryOptions.push({
            name: `${MODULE_NAME}.Export.Download`,
            icon: '<i class="fas fa-download"></i>',
            callback: async (li) => actorFolderCallback(li, false),
            condition: (_li) => {
                return true;
            },
        });
    },
);

function actorEntryCallback(li: HTMLElement, server: boolean): void {
    const documentId = li.dataset.entryId || li.dataset.documentId;
    if (!documentId) return;
    const actor = game.actors.get(documentId) as ActorPF2e;
    if (actor?.isOfType("character")) {
        // Use the new PC export function with alias dialog
        import("./module/npcs.ts").then(({ exportPcWithAliasDialog }) => {
            exportPcWithAliasDialog(actor, server);
        });
    } else if (isComplexHazardOrNpc(actor)) {
        exportActorNpcTsv(actor, server);
    }
}

function actorEntryCondition(li: HTMLElement): boolean {
    const documentId = li.dataset.entryId || li.dataset.documentId;
    if (!documentId) return false;
    const actor = game.actors.get(documentId) as ActorPF2e;
    return !!actor?.isOfType("character") || isComplexHazardOrNpc(actor);
}

Hooks.on(
    "getActorContextOptions",
    (_application: any, entryOptions: ContextMenuEntry[]) => {
        entryOptions.push({
            name: `${MODULE_NAME}.Export.Server`,
            icon: '<i class="fas fa-cloud-upload"></i>',
            callback: async (li) => actorEntryCallback(li, true),
            condition: (li) => {
                return actorEntryCondition(li);
            },
        });
        entryOptions.push({
            name: `${MODULE_NAME}.Export.Download`,
            icon: '<i class="fas fa-download"></i>',
            callback: async (li) => actorEntryCallback(li, false),
            condition: (li) => {
                return actorEntryCondition(li);
            },
        });
        entryOptions.push({
            name: `${MODULE_NAME}.Statblock.SendNPC`,
            icon: '<i class="fa-brands fa-discord"></i>',
            callback: async (li) => {
                const documentId = li.dataset.entryId || li.dataset.documentId;
                if (!documentId) return;
                const actor = game.actors.get(documentId) as ActorPF2e;
                if (actor && actor.isOfType("npc")) {
                    await sendNPCStatblock(actor);
                }
            },
            condition: (li) => {
                const documentId = li.dataset.entryId || li.dataset.documentId;
                if (!documentId) return false;
                const actor = game.actors.get(documentId) as ActorPF2e;
                const isNpc = !!actor?.isOfType("npc");
                const channelActive = isChannelActive(Channel.GM);
                return isNpc && channelActive;
            },
        });
        entryOptions.push({
            name: `${MODULE_NAME}.Statblock.SendInfluence`,
            icon: '<i class="fa-brands fa-discord"></i>',
            callback: async (li) => {
                const page = getInfluencePage($(li));
                if (page) postInfluenceStatblock(page);
            },
            condition: (li) => {
                const page = getInfluencePage($(li));
                if (page === undefined) return false;
                return hasInfluence(page);
            },
        });
    },
);

// NPC/Actor sheet header button handler
Hooks.on(
    "getActorSheetHeaderButtons",
    (app: any, buttons: ApplicationV1HeaderButton[]) => {
        if (!game.user.isGM) return;

        if (
            isPF2e() &&
            isChannelActive(Channel.GM) &&
            (app as any).actor &&
            isComplexHazardOrNpc((app as any).actor)
        ) {
            const server: boolean = game.settings.get(
                MODULE_NAME,
                "npc-export-server",
            ) as boolean;
            const icon = server ? "fa-cloud-upload" : "fa-download";
            const button = {
                label: `${MODULE_NAME}.Export.RpgSage`,
                class: "send-npc-to-rpg-sage",
                icon: "fas " + icon,
                onclick: async () => {
                    await exportActorNpcTsv((app as any).actor, server);
                },
            };
            buttons.unshift(button);
        }
    },
);

// ImagePopout dropdown button handler
Hooks.on("getHeaderControlsImagePopout", (popout, buttons) => {
    if (!game.user.isGM) return;

    const createPopoutButton = (channel: Channel, label: string) => {
        return {
            action: `pbd-discord-${label.toLowerCase()}`,
            icon: "fa-brands fa-discord",
            label: `${MODULE_NAME}.Discord.${label}`,
            visible: true,
            onClick: (event: any) => {
                event?.preventDefault?.();
                event?.stopPropagation?.();
                postDiscordImage(channel, popout);
            },
        };
    };

    if (isChannelActive(Channel.IC)) {
        buttons.unshift(createPopoutButton(Channel.IC, "IC"));
    }

    if (isChannelActive(Channel.OOC)) {
        buttons.unshift(createPopoutButton(Channel.OOC, "OOC"));
    }

    if (isChannelActive(Channel.GM)) {
        buttons.unshift(createPopoutButton(Channel.GM, "GM"));
    }
});

// Note: renderImagePopout hook not needed for ApplicationV2 dropdown buttons

// Extend JournalSheet context menu for Discord options
Hooks.on("ready", () => {
    if (!game.user.isGM) return;

    // Store the original _getEntryContextOptions method
    const originalGetEntryContextOptions = (JournalSheet as any).prototype._getEntryContextOptions;

    // Extend the method to add our Discord options
    (JournalSheet as any).prototype._getEntryContextOptions = function () {
        const options: ContextMenuEntry[] = originalGetEntryContextOptions.call(this);

        // Add Discord post options for each active channel
        if (isChannelActive(Channel.IC)) {
            options.push({
                name: `${MODULE_NAME}.Discord.IC`,
                icon: '<i class="fa-brands fa-discord"></i>',
                callback: (li: HTMLElement) => {
                    const pageId = li.dataset.pageId || li.dataset.entryId;

                    // Get the journal sheet instance to find the page
                    const journalSheet = li.closest('.journal-sheet') as HTMLElement;
                    if (journalSheet && (journalSheet as any).dataset) {
                        const app = (ui as any).windows[parseInt((journalSheet as any).dataset.appid)] as any;
                        if (app && app.document && app.document.pages && pageId) {
                            const page = app.document.pages.find((p: any) => p.id === pageId || p.sort === pageId || p.name === pageId);
                            if (page) {
                                import("./module/discord.ts").then(({ postDiscordJournalPage }) => {
                                    postDiscordJournalPage(Channel.IC, page);
                                });
                            }
                        }
                    }
                },
                condition: () => true
            });
        }

        if (isChannelActive(Channel.OOC)) {
            options.push({
                name: `${MODULE_NAME}.Discord.OOC`,
                icon: '<i class="fa-brands fa-discord"></i>',
                callback: (li: HTMLElement) => {
                    const pageId = li.dataset.pageId || li.dataset.entryId;

                    // Get the journal sheet instance to find the page
                    const journalSheet = li.closest('.journal-sheet') as HTMLElement;
                    if (journalSheet && (journalSheet as any).dataset) {
                        const app = (ui as any).windows[parseInt((journalSheet as any).dataset.appid)] as any;
                        if (app && app.document && app.document.pages && pageId) {
                            const page = app.document.pages.find((p: any) => p.id === pageId || p.sort === pageId || p.name === pageId);
                            if (page) {
                                import("./module/discord.ts").then(({ postDiscordJournalPage }) => {
                                    postDiscordJournalPage(Channel.OOC, page);
                                });
                            }
                        }
                    }
                },
                condition: () => true
            });
        }

        if (isChannelActive(Channel.GM)) {
            options.push({
                name: `${MODULE_NAME}.Discord.GM`,
                icon: '<i class="fa-brands fa-discord"></i>',
                callback: (li: HTMLElement) => {
                    const pageId = li.dataset.pageId || li.dataset.entryId;

                    // Get the journal sheet instance to find the page
                    const journalSheet = li.closest('.journal-sheet') as HTMLElement;
                    if (journalSheet && (journalSheet as any).dataset) {
                        const app = (ui as any).windows[parseInt((journalSheet as any).dataset.appid)] as any;
                        if (app && app.document && app.document.pages && pageId) {
                            const page = app.document.pages.find((p: any) => p.id === pageId || p.sort === pageId || p.name === pageId);
                            if (page) {
                                import("./module/discord.ts").then(({ postDiscordJournalPage }) => {
                                    postDiscordJournalPage(Channel.GM, page);
                                });
                            }
                        }
                    }
                },
                condition: () => true
            });
        }

        return options;
    };
});



function rerenderApps(_path: string): void {
    const apps = [
        ...Object.values(ui.windows),
        ...foundry.applications.instances.values(),
        ui.sidebar,
    ];
    for (const app of apps) {
        app.render();
    }
}

// HMR for language and template files
if ((import.meta as any).hot) {
    (import.meta as any).hot.on(
        "lang-update",
        async ({ path }: { path: string }): Promise<void> => {
            const lang = (await fu.fetchJsonWithTimeout(path)) as object;
            if (!(typeof lang === "object")) {
                ui.notifications.error(`Failed to load ${path}`);
                return;
            }
            const apply = (): void => {
                fu.mergeObject(game.i18n.translations, lang);
                rerenderApps(path);
            };
            if (game.ready) {
                apply();
            } else {
                Hooks.once("ready", apply);
            }
        },
    );

    (import.meta as any).hot.on(
        "template-update",
        async ({ path }: { path: string }): Promise<void> => {
            const apply = async (): Promise<void> => {
                delete Handlebars.partials[path];
                await getTemplate(path);
                rerenderApps(path);
            };
            if (game.ready) {
                apply();
            } else {
                Hooks.once("ready", apply);
            }
        },
    );
}
