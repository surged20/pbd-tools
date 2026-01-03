// foundry-pf2e types are available globally
import type * as fields from "foundry-pf2e/foundry/common/data/fields.d.mts";
import type { DataSchema } from "foundry-pf2e/foundry/common/data/fields.d.mts";
import { Channel } from "./constants.ts";
import { postDiscord } from "./discord.ts";
import { getActiveChannels } from "./helpers.ts";
import type { RegionEvent } from "foundry-pf2e/foundry/client/documents/region.mjs";

// Runtime globals
declare const RegionBehavior: any;

type PostDiscordTypeSchema = {
    channel: fields.StringField;
    content: fields.StringField;
    pause: fields.BooleanField;
    once: fields.BooleanField;
};

interface PostDiscordRegionBehaviorType
    extends foundry.data.regionBehaviors.RegionBehaviorType<
            PostDiscordTypeSchema,
            RegionBehavior | null
        >,
        fields.ModelPropsFromSchema<PostDiscordTypeSchema> {}

class PostDiscordRegionBehaviorType extends foundry.data.regionBehaviors
    .RegionBehaviorType<PostDiscordTypeSchema, RegionBehavior | null> {
    static override LOCALIZATION_PREFIXES = ["PostDiscordRegionBehaviorType"];

    static override defineSchema(): DataSchema {
        const fields = foundry.data.fields;
        return {
            events: this._createEventsField({
                events: [
                    CONST.REGION_EVENTS.TOKEN_ENTER,
                    CONST.REGION_EVENTS.TOKEN_EXIT,
                    CONST.REGION_EVENTS.TOKEN_MOVE_IN,
                    CONST.REGION_EVENTS.TOKEN_MOVE_OUT,
                    CONST.REGION_EVENTS.TOKEN_MOVE_WITHIN,
                    CONST.REGION_EVENTS.TOKEN_ANIMATE_IN,
                    CONST.REGION_EVENTS.TOKEN_ANIMATE_OUT,
                    CONST.REGION_EVENTS.TOKEN_TURN_START,
                    CONST.REGION_EVENTS.TOKEN_TURN_END,
                    CONST.REGION_EVENTS.TOKEN_ROUND_START,
                    CONST.REGION_EVENTS.TOKEN_ROUND_END,
                ],
                initial: [],
            }),
            channel: new fields.StringField({
                required: true,
                nullable: false,
                initial: Channel.IC,
                choices: getActiveChannels() as Record<Channel, string>,
            }),
            content: new fields.StringField({ required: true }),
            once: new fields.BooleanField({ initial: true }),
            pause: new fields.BooleanField({ initial: true }),
        };
    }

    protected override async _handleRegionEvent(
        _event: RegionEvent,
    ): Promise<void> {
        if (this.pause) {
            ui.notifications.info(
                game.i18n.format("PostDiscordRegionBehaviorType.Paused"),
            );
        }

        // Remainder only run by active GM
        if (!game.users.activeGM?.isSelf) return;

        if (this.once) {
            this.parent?.update({ disabled: true });
        }

        if (this.pause) {
            game.togglePause(true, true);
        }

        postDiscord(this.channel as Channel, this.content as string);
    }
}

export function regionsInit(): void {
    Object.assign(CONFIG.RegionBehavior.dataModels, {
        "pbd-tools.postDiscord": PostDiscordRegionBehaviorType,
    });

    Object.assign(CONFIG.RegionBehavior.typeIcons, {
        "pbd-tools.postDiscord": "fa-brands fa-discord",
    });

    Object.assign(CONFIG.RegionBehavior.typeLabels, {
        "pbd-tools.postDiscord": "TYPES.RegionBehavior.pbd-tools.postDiscord",
    });

    (foundry.applications.apps.DocumentSheetConfig.registerSheet as any)(
        RegionBehavior,
        "pbd-tools",
        (foundry.applications.sheets as any).RegionBehaviorConfig,
        {
            types: ["pbd-tools.postDiscord"],
            makeDefault: true,
        },
    );
}
