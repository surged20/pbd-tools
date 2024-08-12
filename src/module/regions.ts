import type * as fields from "foundry-types/common/data/fields.d.ts";
import { Channel } from "./constants.ts";
import { postDiscord } from "./discord.ts";

type PostDiscordTypeSchema = {
    channel: fields.NumberField;
    content: fields.StringField;
    pause: fields.BooleanField;
    once: fields.BooleanField;
};

interface PostDiscordRegionBehaviorType
    extends foundry.data.regionBehaviors.RegionBehaviorType<
            PostDiscordTypeSchema,
            RegionBehavior | null
        >,
        ModelPropsFromSchema<PostDiscordTypeSchema> {}

class PostDiscordRegionBehaviorType extends foundry.data.regionBehaviors
    .RegionBehaviorType<PostDiscordTypeSchema, RegionBehavior | null> {
    static LOCALIZATION_PREFIXES = ["PostDiscordRegionBehaviorType"];

    static #CHANNELS = Object.freeze({
        ic: Channel.IC,
        ooc: Channel.OOC,
        gm: Channel.GM,
    });

    static readonly CHANNELS = PostDiscordRegionBehaviorType.#CHANNELS;

    static override defineSchema(): fields.DataSchema {
        const fields = foundry.data.fields;
        return {
            events: this._createEventsField({
                events: [
                    CONST.REGION_EVENTS.TOKEN_ENTER,
                    CONST.REGION_EVENTS.TOKEN_EXIT,
                    CONST.REGION_EVENTS.TOKEN_MOVE,
                    CONST.REGION_EVENTS.TOKEN_MOVE_IN,
                    CONST.REGION_EVENTS.TOKEN_MOVE_OUT,
                    CONST.REGION_EVENTS.TOKEN_PRE_MOVE,
                    CONST.REGION_EVENTS.TOKEN_ROUND_END,
                    CONST.REGION_EVENTS.TOKEN_ROUND_START,
                    CONST.REGION_EVENTS.TOKEN_TURN_END,
                    CONST.REGION_EVENTS.TOKEN_TURN_START,
                ],
                initial: [],
            }),
            channel: new fields.NumberField({
                required: true,
                nullable: false,
                initial: Channel.IC,
                choices: Object.entries(this.CHANNELS).reduce(
                    (obj, [key, value]) => {
                        obj[value] =
                            `PostDiscordRegionBehaviorType.FIELDS.channel.choices.${key}`;
                        return obj;
                    },
                    {},
                ),
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

        postDiscord(this.channel, this.content);
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

    DocumentSheetConfig.registerSheet(
        RegionBehavior,
        "pbd-tools.postDiscord",
        // @ts-expect-error missing RegionBehaviorConfig type
        foundry.applications.sheets.RegionBehaviorConfig,
        {
            types: ["pbd-tools.postDiscord"],
            makeDefault: true,
        },
    );
}
