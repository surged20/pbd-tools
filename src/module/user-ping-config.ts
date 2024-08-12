import { ActorPF2e } from "@actor";
import { MODULE_NAME } from "./constants.ts";

interface UserPingConfigData extends FormApplicationData {
    pcs: ActorPF2e[];
    userMap: Map<string, string>;
}

interface UserPingConfigFormData extends FormData {
    actorId: string;
    userId: string;
}

export class UserPingConfig extends FormApplication {
    static override get defaultOptions(): FormApplicationOptions {
        return foundry.utils.mergeObject(super.defaultOptions, {
            title: game.i18n.localize(`${MODULE_NAME}.UserPingConfig.Title`),
            template: "modules/pbd-tools/templates/user-ping-config.html",
            width: 750,
            height: 600,
            closeOnSubmit: false,
            tabs: [
                {
                    navSelector: ".tabs",
                    contentSelector: ".tabs-content",
                    initial: "sceneTab",
                },
            ],
        });
    }

    static registerSettings(): void {
        game.settings.register(MODULE_NAME, "user-ping-config", {
            name: "",
            hint: "",
            type: Array,
            scope: "world",
            config: false,
            default: {},
        });
    }

    override getData(): UserPingConfigData {
        const pcs: ActorPF2e[] = game.actors.filter(
            (actor) => actor.type === "character",
        );
        const userMap = new Map<string, string>(
            game.settings.get(MODULE_NAME, "user-ping-config") as Map<
                string,
                string
            >,
        );
        return { pcs, userMap } as UserPingConfigData;
    }

    override activateListeners(html: JQuery): void {
        super.activateListeners(html);

        html.find(".delete-entry").click(async (event) => {
            const actorId = event.currentTarget.getAttribute(
                "data-actor-id-placeholder",
            ) as string;
            const userMap = new Map<string, string>(
                game.settings.get(MODULE_NAME, "user-ping-config") as Map<
                    string,
                    string
                >,
            );
            userMap.delete(actorId);
            await game.settings.set(
                MODULE_NAME,
                "user-ping-config",
                Array.from(userMap),
            );
            this.render();
        });
    }

    async _updateObject(
        _event: Event,
        formData: Record<string, unknown> & UserPingConfigFormData,
    ): Promise<void> {
        const actorId = formData.actorId;
        const userId = formData.userId;
        if (!actorId || !userId || userId === "") return;

        const userMap = new Map<string, string>(
            game.settings.get(MODULE_NAME, "user-ping-config") as Map<
                string,
                string
            >,
        );
        userMap.set(actorId, userId);
        await game.settings.set(
            MODULE_NAME,
            "user-ping-config",
            Array.from(userMap),
        );
        this.render();
    }

    override async _renderInner(
        data: UserPingConfigData,
        options: RenderOptions,
    ): Promise<JQuery> {
        const inner = await super._renderInner(data, options);

        const configRows = inner.find("#config-rows");
        data.userMap.forEach((userId: string, actorId: string) => {
            const actor = game.actors.get(actorId);
            const actorName = actor ? actor.name : "Unknown Actor";
            const rowHtml = `
            <tr>
              <td style="text-align: center;">${actorName}</td>
              <td style="text-align: center;">${userId}</td>
              <td><button class="btn btn-danger delete-entry" data-actor-id-placeholder="${actorId}">Delete</button></td>
            </tr>
          `;
            configRows.append(rowHtml);
        });

        return inner;
    }
}
