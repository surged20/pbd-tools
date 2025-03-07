import {
    ActorPF2e,
    EncounterPF2e,
    EncounterTrackerPF2e,
    NPCSheetPF2e,
} from "foundry-pf2e";
import { Channel, MODULE_NAME, isPF2e } from "./module/constants.ts";
import { convertToMarkdown, isComplexHazardOrNpc } from "./module/helpers.ts";
import {
    exportPcJson,
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
    postDiscordJournal,
    postDiscord,
} from "./module/discord.ts";
import { initContextMenu } from "./module/context-menu.ts";
import {
    getInfluencePage,
    hasInfluence,
    postInfluenceStatblock,
} from "./module/influence.ts";

Hooks.on("init", () => {
    registerSettings();

    regionsInit();

    const moduleData = game.modules.get(MODULE_NAME);
    if (moduleData)
        // @ts-expect-error api is unknown
        moduleData.api = { postDiscord, Channel, convertToMarkdown };
});

Hooks.on("ready", () => {
    if (!game.user.isGM) return;

    initContextMenu();
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
        game.settings.get(MODULE_NAME, "tracker-output-channel"),
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
    html: JQuery<JQuery.Node>,
    tooltip: string,
    control: string,
    icon: string,
): HTMLAnchorElement {
    const encounterControls = html.find(".encounter-controls")[0];
    const encounterTitle = html.find(".encounter-title")[0];
    const a = document.createElement("a");
    a.setAttribute("class", "combat-button combat-control");
    a.setAttribute("role", `button`);
    a.setAttribute("aria-label", tooltip);
    a.setAttribute("data-tooltip", tooltip);
    a.setAttribute("data-control", control);

    const i = document.createElement("i");
    i.setAttribute("class", icon);
    a.appendChild(i);
    encounterControls.insertBefore(a, encounterTitle);

    return a;
}
Hooks.on(
    "renderCombatTracker",
    async (
        app: EncounterTrackerPF2e<EncounterPF2e>,
        html: JQuery<JQuery.Node>,
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
                game.settings.get(MODULE_NAME, "tracker-output-channel"),
            );
            if (!trackerEnabled || !channelActive) return;

            const tooltip = game.i18n.localize(
                `${MODULE_NAME}.UpdateTrackerTooltip`,
            );
            const a = createCombatControl(
                html,
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
            );
            const icon = server ? "fa-cloud-upload" : "fa-download";

            const tooltip = game.i18n.localize(
                `${MODULE_NAME}.ExportNpcsTrackerTooltip`,
            );
            const a = createCombatControl(
                html,
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

function actorFolderCallback(li: JQuery<JQuery.Node>, server: boolean): void {
    const di = li.closest(".directory-item");
    const folder = game.folders.get(di.data("folderId"));
    if (folder) exportFolderNpcTsv(folder, server);
}

Hooks.on(
    "getActorDirectoryFolderContext",
    (_html: JQuery<JQuery.Node>, entryOptions: ContextMenuEntry[]) => {
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

function actorEntryCallback(li: JQuery<JQuery.Node>, server: boolean): void {
    const actor = game.actors.get(li.data("documentId")) as ActorPF2e;
    if (actor?.isOfType("character")) exportPcJson(actor, server);
    else if (isComplexHazardOrNpc(actor)) exportActorNpcTsv(actor, server);
}

function actorEntryCondition(li: JQuery<JQuery.Node>): boolean {
    const actor = game.actors.get(li.data("documentId")) as ActorPF2e;
    return !!actor?.isOfType("character") || isComplexHazardOrNpc(actor);
}

Hooks.on(
    "getActorDirectoryEntryContext",
    (_html: JQuery<JQuery.Node>, entryOptions: ContextMenuEntry[]) => {
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
            name: `${MODULE_NAME}.Statblock.SendInfluence`,
            icon: '<i class="fa-brands fa-discord"></i>',
            callback: async (li) => {
                const page = getInfluencePage(li);
                if (page) postInfluenceStatblock(page);
            },
            condition: (li) => {
                const page = getInfluencePage(li);
                if (page === undefined) return false;
                return hasInfluence(page);
            },
        });
    },
);

Hooks.on(
    "getActorSheetHeaderButtons",
    (sheet: NPCSheetPF2e, buttons: ApplicationHeaderButton[]) => {
        if (
            !game.user.isGM ||
            !isPF2e() ||
            !isChannelActive(Channel.GM) ||
            !isComplexHazardOrNpc(sheet.actor)
        )
            return;

        const server: boolean = game.settings.get(
            MODULE_NAME,
            "npc-export-server",
        );
        const icon = server ? "fa-cloud-upload" : "fa-download";
        buttons.unshift({
            label: `${MODULE_NAME}.Export.RpgSage`,
            class: "send-npc-to-rpg-sage",
            icon: "fas " + icon,
            onclick: async () => exportActorNpcTsv(sheet.actor, server),
        });
    },
);

Hooks.on(
    "getJournalSheetHeaderButtons",
    (sheet: JournalSheet<JournalEntry>, buttons: ApplicationHeaderButton[]) => {
        if (!game.user.isGM) return;

        if (isChannelActive(Channel.IC))
            buttons.unshift({
                label: "IC",
                class: "send-page-to-discord-ic",
                icon: "fa-brands fa-discord",
                onclick: async () => {
                    postDiscordJournal(Channel.IC, sheet);
                },
            });
        if (isChannelActive(Channel.OOC))
            buttons.unshift({
                label: "OOC",
                class: "send-page-to-discord-ooc",
                icon: "fa-brands fa-discord",
                onclick: async () => {
                    postDiscordJournal(Channel.OOC, sheet);
                },
            });
        if (isChannelActive(Channel.GM))
            buttons.unshift({
                label: "GM",
                class: "send-page-to-discord-gm",
                icon: "fa-brands fa-discord",
                onclick: async () => {
                    postDiscordJournal(Channel.GM, sheet);
                },
            });
    },
);

Hooks.on(
    "getImagePopoutHeaderButtons",
    (
        popout: ImagePopout<foundry.abstract.Document>,
        buttons: ApplicationHeaderButton[],
    ) => {
        if (!game.user.isGM) return;

        if (isChannelActive(Channel.IC))
            buttons.unshift({
                label: "IC",
                class: "send-image-to-discord-ic",
                icon: "fa-brands fa-discord",
                onclick: async () => {
                    postDiscordImage(Channel.IC, popout);
                },
            });
        if (isChannelActive(Channel.OOC))
            buttons.unshift({
                label: "OOC",
                class: "send-image-to-discord-ooc",
                icon: "fa-brands fa-discord",
                onclick: async () => {
                    postDiscordImage(Channel.OOC, popout);
                },
            });
        if (isChannelActive(Channel.GM))
            buttons.unshift({
                label: "GM",
                class: "send-image-to-discord-gm",
                icon: "fa-brands fa-discord",
                onclick: async () => {
                    postDiscordImage(Channel.GM, popout);
                },
            });
    },
);

Hooks.on(
    "getSceneNavigationContext",
    (_html: JQuery<JQuery.Node>, options: ContextMenuEntry[]) => {
        options.push({
            name: `${MODULE_NAME}.Export.Npcs`,
            icon: '<i class="fas fa-cloud-upload"></i>',
            callback: async (li) => {
                const scene = game.scenes.get(li.data("sceneId"));
                if (scene) exportSceneNpcTsv(scene, true);
            },
            condition: (_li) => !!game.user.isGM,
        });
        options.push({
            name: `${MODULE_NAME}.Export.Npcs`,
            icon: '<i class="fas fa-download"></i>',
            callback: async (li) => {
                const scene = game.scenes.get(li.data("sceneId"));
                if (scene) exportSceneNpcTsv(scene, false);
            },
            condition: (_li) => !!game.user.isGM,
        });
    },
);

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
// @ts-expect-error not resolving vite type
if (import.meta.hot) {
    // @ts-expect-error not resolving vite type
    import.meta.hot.on(
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

    // @ts-expect-error not resolving vite type
    import.meta.hot.on(
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
