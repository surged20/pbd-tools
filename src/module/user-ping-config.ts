import { MODULE_NAME } from "./constants.ts";

export class UserPingConfig extends FormApplication {
    static override get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            title: game.i18n.localize(`${MODULE_NAME}.UserPingConfig.Title`),
            template: 'modules/pbd-tools/templates/user-ping-config.html',
            width: 750,
            height: 600,
            closeOnSubmit: false,
            tabs: [{ navSelector: '.tabs', contentSelector: '.tabs-content', initial: 'sceneTab' }]
        });
    }

    static registerSettings(): void {
        game.settings.register(MODULE_NAME, 'user-ping-config', {
            name: "",
            hint: "",
            type: Object,
            scope: "world",
            config: false,
            default: {}
        });
    }

    override getData(): any {
        const pcs = game.actors
            .filter(actor => actor.type === 'character');
        const userPingConfig = game.settings.get(MODULE_NAME, 'user-ping-config');
        return { pcs, userPingConfig };
    }

    override activateListeners(html) {
        super.activateListeners(html);

        html.find('.delete-entry').click(async event => {
            const actorId = event.currentTarget.getAttribute('data-actor-id-placeholder');
            const setting = game.settings.get(MODULE_NAME, 'user-ping-config') as any;
            delete setting[actorId];
            await game.settings.set(MODULE_NAME, 'user-ping-config', setting);
            this.render();
        });
    }

    async _updateObject(_event, formData) {
        const actorId = formData.actorId;
        const userId = formData.userId;
        if (!actorId || !userId || userId === "") return;
    
        const setting = game.settings.get(MODULE_NAME, 'user-ping-config') as any;
        setting[actorId] = {userId: userId};
        await game.settings.set(MODULE_NAME, 'user-ping-config', setting);
        this.render();
      }

    override async _renderInner(data, options) {
        const inner = await super._renderInner(data, options);

        const configRows = inner.find('#config-rows');
        for (const [actorId, setting] of Object.entries(data.userPingConfig)) {
            const actor = game.actors.get(actorId);
            const actorName = actor ? actor.name : 'Unknown Actor';
            const userId = (<any>setting).userId; // FIXME Type error
            const rowHtml = `
            <tr>
              <td style="text-align: center;">${actorName}</td>
              <td style="text-align: center;">${userId}</td>
              <td><button class="btn btn-danger delete-entry" data-actor-id-placeholder="${actorId}">Delete</button></td>
            </tr>
          `;
            configRows.append(rowHtml);
        }

        return inner;
    }

    settingExistsForActor(actorId) {
        const setting = game.settings.get(MODULE_NAME, 'user-ping-config') as any;
        return setting.hasOwnProperty(actorId);
    }
}
