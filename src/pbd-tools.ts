import { CreaturePF2e } from "@actor";
import { CreatureSheetPF2e } from "@actor/creature/sheet.js";
import { Channel, MODULE_NAME, isPF2e } from "./module/constants.ts";
import { regionsInit } from "./module/regions.ts";
import { registerSettings, isChannelActive } from "./module/settings.ts";
import { updateTracker } from "./module/tracker.ts";
import {
    postDiscordImage,
    postDiscordJournal,
    postDiscordPathbuilderJson,
    postDiscordNPC,
    postDiscord,
} from "./module/discord.ts";
import { initContextMenu } from "./module/context-menu.ts";

Hooks.on("init", () => {
    registerSettings();

    regionsInit();

    const moduleData = game.modules.get(MODULE_NAME);
    // @ts-ignore
    moduleData.api = { postDiscord, Channel };
});

Hooks.on("ready", () => {
    if (!game.user.isGM) return;

    initContextMenu();
});

Hooks.on("preUpdateToken", (_token: TokenDocument) => {
    if (!game.users.activeGM) {
        ui.notifications.warn("GM must be connected to move tokens");
        return false;
    }
    return true;
});

Hooks.on("renderCombatTracker", async (_app, html: JQuery<JQuery.Node>) => {
    if (
        !game.user.isGM ||
        !isPF2e() ||
        !isChannelActive(Channel.IC) ||
        !game.combat ||
        !game.combat.started ||
        game.combat.turns.length === 0
    )
        return;

    const tooltip = game.i18n.localize(`${MODULE_NAME}.UpdateTrackerTooltip`);
    const encounterControls = html.find(".encounter-controls")[0];
    const encounterTitle = html.find(".encounter-title")[0];
    const a = document.createElement("a");
    a.setAttribute("class", "combat-button combat-control");
    a.setAttribute("role", `button`);
    a.setAttribute("aria-label", tooltip);
    a.setAttribute("data-tooltip", tooltip);
    a.setAttribute("data-control", "update-tracker");

    const i = document.createElement("i");
    i.setAttribute("class", "fa-brands fa-discord");
    a.appendChild(i);
    encounterControls.insertBefore(a, encounterTitle);
    a.addEventListener("click", (event) => {
        event.preventDefault();
        updateTracker();
    });
});

Hooks.on(
    "getActorDirectoryEntryContext",
    (_html: JQuery<JQuery.Node>, entryOptions: ContextMenuEntry[]) => {
        entryOptions.push({
            name: "Export to RPG Sage",
            icon: '<i class="fa-brands fa-discord"></i>',
            callback: async (li) => {
                const actor = game.actors.get(li.data("documentId"));
                if (actor?.isOfType("character"))
                    postDiscordPathbuilderJson(actor);
            },
            condition: (li) => {
                const actor = game.actors.get(li.data("documentId"));
                return !!actor?.isOfType("character");
            },
        });
    },
);

Hooks.on(
    "getActorSheetHeaderButtons",
    (
        sheet: CreatureSheetPF2e<CreaturePF2e>,
        buttons: ApplicationHeaderButton[],
    ) => {
        if (
            !game.user.isGM ||
            !isPF2e() ||
            !isChannelActive(Channel.GM) ||
            sheet.actor.type !== "npc"
        )
            return;

        buttons.unshift({
            label: "RPG Sage",
            class: "send-actor-to-discord-gm",
            icon: "fa-brands fa-discord",
            onclick: async () => postDiscordNPC(sheet),
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
