import type { ActorPF2e } from "foundry-pf2e";
import { MODULE_NAME } from "../constants.ts";
import type {
    FormApplicationData,
    FormApplicationOptions,
} from "foundry-pf2e/foundry/client/appv1/api/form-application-v1.mjs";

// Runtime globals available in Foundry
// @ts-ignore - FormApplication is available globally in Foundry
declare const FormApplication: any;
import type { AppV1RenderOptions } from "foundry-pf2e/foundry/client/appv1/api/application-v1.mjs";

interface UserMentionConfigData extends FormApplicationData {
    pcs: ActorPF2e[];
    userMap: Map<string, string>;
}

interface UserMentionConfigFormData extends FormData {
    actorId: string;
    userId: string;
}

// @ts-ignore - Extending from runtime global FormApplication
export class UserMentionConfig extends FormApplication {
    static get defaultOptions(): FormApplicationOptions {
        return foundry.utils.mergeObject(super.defaultOptions, {
            title: game.i18n.localize(`${MODULE_NAME}.UserMentionConfig.Title`),
            template: "modules/pbd-tools/templates/user-mention-config.hbs",
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
        game.settings.register(MODULE_NAME, "user-mention-config", {
            name: "",
            hint: "",
            type: Array,
            scope: "world",
            config: false,
            default: {},
        });
    }

    getData(): UserMentionConfigData {
        const pcs: ActorPF2e[] = game.actors.filter(
            (actor) => actor.type === "character",
        );
        const userMap = new Map<string, string>(
            game.settings.get(MODULE_NAME, "user-mention-config") as Map<
                string,
                string
            >,
        );
        return { pcs, userMap } as UserMentionConfigData;
    }

    activateListeners(html: JQuery): void {
        super.activateListeners(html);

        html.find(".delete-entry").click(async (event) => {
            const actorId = event.currentTarget.getAttribute(
                "data-actor-id-placeholder",
            ) as string;
            const userMap = new Map<string, string>(
                game.settings.get(MODULE_NAME, "user-mention-config") as Map<
                    string,
                    string
                >,
            );
            userMap.delete(actorId);
            await game.settings.set(
                MODULE_NAME,
                "user-mention-config",
                Array.from(userMap),
            );
            this.render();
        });
    }

    async _updateObject(
        _event: Event,
        formData: Record<string, unknown> & UserMentionConfigFormData,
    ): Promise<void> {
        const actorId = formData.actorId;
        const userId = formData.userId;
        if (!actorId || !userId || userId === "") return;

        const userMap = new Map<string, string>(
            game.settings.get(MODULE_NAME, "user-mention-config") as Map<
                string,
                string
            >,
        );
        userMap.set(actorId, userId);
        await game.settings.set(
            MODULE_NAME,
            "user-mention-config",
            Array.from(userMap),
        );
        this.render();
    }

    async _renderInner(
        data: UserMentionConfigData,
        options: AppV1RenderOptions,
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
