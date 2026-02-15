import {
    MODULE_NAME,
    type ChannelTargetId,
    type DiscordEmbed,
} from "./constants.ts";
import { isChannelTargetActive, getChannelDisplayName } from "./helpers.ts";
import { postDiscordMessageAsPersona } from "./discord.ts";
import { generateImageLink } from "./images.ts";
import { CreatePostDialog } from "./create-post-dialog.ts";
import { getUserMentionMap } from "./settings/user-mention-config.ts";

type DegreeOfSuccessString =
    | "criticalFailure"
    | "failure"
    | "success"
    | "criticalSuccess";

interface CreatePostData {
    actorName: string;
    targetName: string | null;
    itemName: string | null;
    attackTotal: number | null;
    attackOutcome: string | null;
    damageTotal: number | null;
    damageBreakdown: string | null;
    tokenName: string;
    tokenImagePath: string;
    actionCost: string | null;
    traits: string[];
    isSpell: boolean;
    saveType: string | null;
    saveDC: number | null;
    isBasicSave: boolean;
    spellDescription: string | null;
    isCheck: boolean;
    checkName: string | null;
    checkDC: number | null;
    actionDescription: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ChatMessagePF2e = any;

const OUTCOME_LABELS: Record<DegreeOfSuccessString, string> = {
    criticalSuccess: "Critical Hit",
    success: "Hit",
    failure: "Miss",
    criticalFailure: "Critical Miss",
};

const CHECK_OUTCOME_LABELS: Record<DegreeOfSuccessString, string> = {
    criticalSuccess: "Critical Success",
    success: "Success",
    failure: "Failure",
    criticalFailure: "Critical Failure",
};

function isAttackRoll(message: ChatMessagePF2e): boolean {
    return (
        !!message.isCheckRoll &&
        message.flags?.pf2e?.context?.type === "attack-roll"
    );
}

function isSkillCheck(message: ChatMessagePF2e): boolean {
    return (
        !!message.isCheckRoll &&
        message.flags?.pf2e?.context?.type === "skill-check"
    );
}

const OTHER_CHECK_TYPES = new Set(["perception-check", "flat-check"]);

function isOtherCheck(message: ChatMessagePF2e): boolean {
    return (
        !!message.isCheckRoll &&
        OTHER_CHECK_TYPES.has(message.flags?.pf2e?.context?.type ?? "")
    );
}

function isActionCard(message: ChatMessagePF2e): boolean {
    return (
        !message.isCheckRoll &&
        !message.isDamageRoll &&
        !!message.flags?.pf2e?.origin
    );
}

/** Title-case a PF2e slug: "recall-knowledge" → "Recall Knowledge" */
function slugToTitle(slug: string): string {
    return slug
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
}

/** Extract the check/skill name from message context */
function extractCheckName(message: ChatMessagePF2e): string | null {
    const options: string[] = message.flags?.pf2e?.context?.options ?? [];

    // Look for "self:skill:athletics" or "skill:athletics" in roll options
    for (const opt of options) {
        const selfMatch = opt.match(/^self:skill:(.+)$/);
        if (selfMatch) return slugToTitle(selfMatch[1]);
        const bareMatch = opt.match(/^skill:(.+)$/);
        if (bareMatch) return slugToTitle(bareMatch[1]);
    }

    // Try context.slug (e.g. "athletics", "perception")
    const slug: string | undefined = message.flags?.pf2e?.context?.slug;
    if (slug) return slugToTitle(slug);

    // Fallback: derive from context type itself
    const contextType: string | undefined = message.flags?.pf2e?.context?.type;
    if (contextType === "perception-check") return "Perception";
    if (contextType === "flat-check") return "Flat Check";

    return null;
}

/** Extract the action name from roll options (e.g. "action:grapple" → "Grapple") */
function extractActionName(message: ChatMessagePF2e): string | null {
    const options: string[] = message.flags?.pf2e?.context?.options ?? [];
    for (const opt of options) {
        const match = opt.match(/^action:(.+)$/);
        if (match) return slugToTitle(match[1]);
    }
    return null;
}

/** Resolve item from origin UUID when message.item is null */
function resolveOriginItem(message: ChatMessagePF2e): {
    name: string | null;
    description: string | null;
    actionCost: string | null;
} {
    const originUuid: string | undefined = message.flags?.pf2e?.origin?.uuid;
    if (!originUuid) return { name: null, description: null, actionCost: null };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const item = fromUuidSync(originUuid) as any;
    if (!item) return { name: null, description: null, actionCost: null };

    const name: string | null = item.name ?? null;
    const description: string | null = item.system?.description?.value ?? null;

    let actionCost: string | null = null;
    const itemActionCost = item.actionCost;
    if (itemActionCost) {
        if (
            itemActionCost.type === "action" &&
            itemActionCost.value >= 1 &&
            itemActionCost.value <= 3
        ) {
            actionCost = String(itemActionCost.value);
        } else if (
            itemActionCost.type === "free" ||
            itemActionCost.type === "reaction"
        ) {
            actionCost = itemActionCost.type;
        }
    }

    return { name, description, actionCost };
}

/**
 * Parse structured data from message.flavor HTML.
 * PF2e check cards render flavor like:
 *   <h4 class="action">Grapple <span>(Athletics Check)</span></h4>
 *   <div ...>Target: Kyra (Fortitude DC 13)</div>
 *   <div ...><b>Success</b> Your target is Grabbed...</div>
 */
function parseFlavorData(message: ChatMessagePF2e): {
    title: string | null;
    checkName: string | null;
    targetName: string | null;
    outcomeDescription: string | null;
} {
    const result = {
        title: null as string | null,
        checkName: null as string | null,
        targetName: null as string | null,
        outcomeDescription: null as string | null,
    };

    const flavor: string | undefined = message.flavor;
    if (!flavor) return result;

    // Extract action title from h4: "Grapple ◆ (Athletics Check)"
    const h4Match = flavor.match(/<h4[^>]*>([\s\S]*?)<\/h4>/i);
    if (h4Match) {
        const h4Text = h4Match[1]
            .replace(/<span class="pf2-icon">[^<]*<\/span>/gi, "")
            .replace(/<[^>]+>/g, "")
            .trim();
        // Extract check type from parenthetical: "(Athletics Check)" → "Athletics"
        const checkMatch = h4Text.match(/\((.+?)\s+[Cc]heck\)/);
        if (checkMatch) {
            result.checkName = checkMatch[1].trim();
        }
        // Title is everything before the parenthetical
        const titlePart = h4Text.replace(/\(.*?\)/, "").trim();
        if (titlePart) result.title = titlePart;
    }

    // Extract target name from "Target: Name" or "Target: Name (DC info)"
    const targetMatch = flavor.match(/[Tt]arget:\s*(?:<[^>]*>)*\s*([^(<\n]+)/);
    if (targetMatch) {
        result.targetName = targetMatch[1].trim();
    }

    // Extract degree-of-success description block
    // PF2e renders these as sections with the degree label followed by description
    const degreePattern =
        /(?:<strong>|<b>)\s*(Critical Success|Success|Failure|Critical Failure)\s*(?:<\/strong>|<\/b>)\s*([\s\S]*?)(?=(?:<strong>|<b>)\s*(?:Critical |)(?:Success|Failure)|$)/i;
    const degreeMatch = flavor.match(degreePattern);
    if (degreeMatch) {
        const degreeText = degreeMatch[2]
            .replace(/<[^>]+>/g, "")
            .replace(/\s+/g, " ")
            .trim();
        if (degreeText) {
            result.outcomeDescription = `**${degreeMatch[1]}** ${degreeText}`;
        }
    }

    return result;
}

function extractTraits(message: ChatMessagePF2e): string[] {
    // Prefer roll options — they include contextual traits like "attack"
    const options: string[] = message.flags?.pf2e?.context?.options ?? [];
    const rollTraits = options
        .filter((o: string) => o.startsWith("item:trait:"))
        .map((o: string) => o.slice("item:trait:".length));
    if (rollTraits.length > 0) return rollTraits;

    // Fallback: item system traits (for messages without roll options)
    const rawTraits: unknown[] = message.item?.system?.traits?.value ?? [];
    return rawTraits
        .map((t: unknown) =>
            typeof t === "string"
                ? t
                : (t as { label?: string; name?: string }).label ||
                  (t as { label?: string; name?: string }).name ||
                  String(t),
        )
        .filter((t: string) => t.length > 0);
}

function extractCreatePostData(
    message: ChatMessagePF2e,
): CreatePostData | null {
    const isDamage = !!message.isDamageRoll;
    const isAttack = isAttackRoll(message);
    const isSkill = isSkillCheck(message);
    const isOther = isOtherCheck(message);
    const isAction = isActionCard(message);
    if (!isDamage && !isAttack && !isSkill && !isOther && !isAction)
        return null;

    const roll = message.rolls?.[0];
    // Non-rolling action cards don't need a roll
    if (!roll && !isAction) return null;

    const actorName: string = message.actor?.name ?? "Unknown";
    const tokenName: string =
        message.token?.name ?? message.actor?.name ?? "Unknown";
    const tokenImagePath: string =
        message.token?.texture?.src ??
        message.actor?.prototypeToken?.texture?.src ??
        "";
    let targetName: string | null = message.target?.actor?.name ?? null;
    if (!targetName) {
        // Fallback: resolve target from context flags (UUID-based)
        const targetFlag = message.flags?.pf2e?.context?.target;
        if (targetFlag?.actor) {
            const resolved = fromUuidSync(targetFlag.actor);
            targetName = resolved?.name ?? null;
        }
        // Try token UUID as fallback (skill checks may only have token ref)
        if (!targetName && targetFlag?.token) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const resolved = fromUuidSync(targetFlag.token) as any;
            targetName = resolved?.name ?? resolved?.actor?.name ?? null;
        }
    }
    let itemName: string | null = message.item?.name ?? null;

    // Determine action cost from the item
    let actionCost: string | null = null;
    if (message.item?.isOfType?.("spell")) {
        // Spells store action cost as system.time.value (e.g. "1", "2", "3", "free", "reaction")
        const timeVal: string | undefined = message.item.system?.time?.value;
        if (timeVal === "free" || timeVal === "reaction") {
            actionCost = timeVal;
        } else if (timeVal && /^[123]$/.test(timeVal)) {
            actionCost = timeVal;
        }
    } else {
        const itemActionCost = message.item?.actionCost;
        if (itemActionCost) {
            if (
                itemActionCost.type === "action" &&
                itemActionCost.value >= 1 &&
                itemActionCost.value <= 3
            ) {
                actionCost = String(itemActionCost.value);
            } else if (
                itemActionCost.type === "free" ||
                itemActionCost.type === "reaction"
            ) {
                actionCost = itemActionCost.type;
            }
        } else if (message.item?.isOfType?.("melee", "weapon")) {
            // Strikes default to 1 action
            actionCost = "1";
        }
    }

    const traits = extractTraits(message);

    // Spell fields
    const isSpell = !!message.item?.isOfType?.("spell");
    const saveType: string | null =
        message.item?.system?.defense?.save?.statistic ?? null;
    const isBasicSave: boolean =
        message.item?.system?.defense?.save?.basic ?? false;
    const spellDescription: string | null = isSpell
        ? (message.item?.system?.description?.value ?? null)
        : null;

    const degreeStrings: DegreeOfSuccessString[] = [
        "criticalFailure",
        "failure",
        "success",
        "criticalSuccess",
    ];

    // Skill check or other check (perception, flat)
    if (isSkill || isOther) {
        const total: number = roll.total;
        const degree: number | undefined = roll.degreeOfSuccess;
        const outcome =
            degree !== undefined && degree >= 0 && degree <= 3
                ? CHECK_OUTCOME_LABELS[degreeStrings[degree]]
                : null;
        let checkName = extractCheckName(message);

        // Fill in item name from action options or origin UUID if not on message
        if (!itemName) {
            itemName = extractActionName(message);
        }
        let actionDescription: string | null = null;
        if (!itemName || !actionCost) {
            const origin = resolveOriginItem(message);
            if (!itemName && origin.name) itemName = origin.name;
            if (!actionCost && origin.actionCost)
                actionCost = origin.actionCost;
            actionDescription = origin.description;
        }

        // Parse flavor HTML for missing fields (most reliable source)
        const flavorData = parseFlavorData(message);
        if (!checkName && flavorData.checkName) {
            checkName = flavorData.checkName;
        }
        if (!targetName && flavorData.targetName) {
            targetName = flavorData.targetName;
        }
        if (!itemName && flavorData.title) {
            itemName = flavorData.title;
        }
        // Use the degree-specific outcome description from the card
        if (flavorData.outcomeDescription) {
            actionDescription = flavorData.outcomeDescription;
        }

        return {
            actorName,
            targetName,
            itemName,
            attackTotal: total,
            attackOutcome: outcome,
            damageTotal: null,
            damageBreakdown: null,
            tokenName,
            tokenImagePath,
            actionCost,
            traits,
            isSpell,
            saveType,
            saveDC: null,
            isBasicSave,
            spellDescription,
            isCheck: true,
            checkName,
            checkDC: null, // Don't expose target DC to players
            actionDescription,
        };
    }

    // Non-rolling action card
    if (isAction) {
        let actionDescription: string | null =
            message.item?.system?.description?.value ?? null;

        // Fill in from origin UUID if message.item is missing
        if (!itemName || !actionDescription) {
            const origin = resolveOriginItem(message);
            if (!itemName && origin.name) itemName = origin.name;
            if (!actionCost && origin.actionCost)
                actionCost = origin.actionCost;
            if (!actionDescription) actionDescription = origin.description;
        }

        return {
            actorName,
            targetName,
            itemName,
            attackTotal: null,
            attackOutcome: null,
            damageTotal: null,
            damageBreakdown: null,
            tokenName,
            tokenImagePath,
            actionCost,
            traits,
            isSpell,
            saveType,
            saveDC: null,
            isBasicSave,
            spellDescription,
            isCheck: false,
            checkName: null,
            checkDC: null,
            actionDescription,
        };
    }

    // Attack roll: extract attack total and outcome directly from the roll
    if (isAttack) {
        const total: number = roll.total;
        const degree: number | undefined = roll.degreeOfSuccess;
        const outcome =
            degree !== undefined && degree >= 0 && degree <= 3
                ? OUTCOME_LABELS[degreeStrings[degree]]
                : null;

        return {
            actorName,
            targetName,
            itemName,
            attackTotal: total,
            attackOutcome: outcome,
            damageTotal: null,
            damageBreakdown: null,
            tokenName,
            tokenImagePath,
            actionCost,
            traits,
            isSpell,
            saveType,
            saveDC: null,
            isBasicSave,
            spellDescription,
            isCheck: false,
            checkName: null,
            checkDC: null,
            actionDescription: null,
        };
    }

    // Damage roll
    const damageTotal: number = roll.total ?? 0;

    // Build breakdown from DamageRoll.instances (each has .type and .total)
    const instances: {
        type: string;
        total: number;
        category: string | null;
    }[] = roll.instances ?? [];
    const DISPLAY_CATEGORIES = new Set(["persistent", "precision", "splash"]);
    const parts: string[] = [];
    for (const inst of instances) {
        const amount = inst.total ?? 0;
        if (amount === 0) continue;
        const cat =
            inst.category && DISPLAY_CATEGORIES.has(inst.category)
                ? inst.category
                : null;
        const label = cat
            ? `${amount} ${cat} ${inst.type}`
            : `${amount} ${inst.type}`;
        parts.push(label);
    }
    const damageBreakdown =
        parts.length > 0 ? parts.join(" + ") : String(damageTotal);

    // Outcome may be on the roll options or in the damageRoll flag
    const degreeOfSuccess: number | undefined =
        roll.options?.degreeOfSuccess ?? undefined;
    const attackOutcome =
        degreeOfSuccess !== undefined &&
        degreeOfSuccess >= 0 &&
        degreeOfSuccess <= 3
            ? OUTCOME_LABELS[degreeStrings[degreeOfSuccess]]
            : null;

    return {
        actorName,
        targetName,
        itemName,
        attackTotal: null, // filled by findAttackRoll
        attackOutcome,
        damageTotal,
        damageBreakdown,
        tokenName,
        tokenImagePath,
        actionCost,
        traits,
        isSpell,
        saveType,
        saveDC: null, // filled by findSaveDC
        isBasicSave,
        spellDescription,
        isCheck: false,
        checkName: null,
        checkDC: null,
        actionDescription: null,
    };
}

function findAttackRoll(damageMessage: ChatMessagePF2e): {
    total: number;
    outcome: string | null;
} | null {
    const originUuid: string | undefined =
        damageMessage.flags?.pf2e?.origin?.uuid;
    if (!originUuid) return null;

    const messages = game.messages.contents as ChatMessagePF2e[];
    const damageIndex = messages.indexOf(damageMessage);
    if (damageIndex === -1) return null;

    const searchStart = Math.max(0, damageIndex - 50);
    for (let i = damageIndex - 1; i >= searchStart; i--) {
        const candidate = messages[i];
        if (
            candidate.isCheckRoll &&
            candidate.flags?.pf2e?.context?.type === "attack-roll" &&
            candidate.flags?.pf2e?.origin?.uuid === originUuid
        ) {
            const roll = candidate.rolls?.[0];
            if (!roll) return null;
            const total: number = roll.total;
            const degree: number | undefined = roll.degreeOfSuccess;
            const degreeStrings: DegreeOfSuccessString[] = [
                "criticalFailure",
                "failure",
                "success",
                "criticalSuccess",
            ];
            const outcome =
                degree !== undefined && degree >= 0 && degree <= 3
                    ? OUTCOME_LABELS[degreeStrings[degree]]
                    : null;
            return { total, outcome };
        }
    }
    return null;
}

function findSaveInfo(message: ChatMessagePF2e): {
    dc: number | null;
    targetName: string | null;
} | null {
    const messages = game.messages.contents as ChatMessagePF2e[];
    const idx = messages.indexOf(message);
    if (idx === -1) return null;

    // Match by item origin UUID (flags.pf2e.origin.uuid) when available
    const originUuid: string | undefined = message.flags?.pf2e?.origin?.uuid;

    // Also match by caster actor UUID (flags.pf2e.context.origin.actor on save cards)
    const actorUuid: string | undefined = message.actor?.uuid;

    const searchStart = Math.max(0, idx - 50);
    for (let i = idx - 1; i >= searchStart; i--) {
        const candidate = messages[i];
        if (candidate.flags?.pf2e?.context?.type !== "saving-throw") continue;

        // Try matching: item origin UUID or caster actor UUID in context.origin
        const candidateOriginUuid: string | undefined =
            candidate.flags?.pf2e?.origin?.uuid;
        const candidateCasterUuid: string | undefined =
            candidate.flags?.pf2e?.context?.origin?.actor;

        const matchByItem = originUuid && candidateOriginUuid === originUuid;
        const matchByCaster = actorUuid && candidateCasterUuid === actorUuid;

        if (matchByItem || matchByCaster) {
            const dc: number | null =
                candidate.flags.pf2e.context.dc?.value ?? null;
            const targetName: string | null = candidate.actor?.name ?? null;
            return { dc, targetName };
        }
    }
    return null;
}

/** Convert simple Discord markdown to HTML for Foundry chat display. */
function discordMarkdownToHtml(text: string): string {
    return (
        text
            // Strip Discord custom emoji: <:name:id> or <a:name:id>
            .replace(/<a?:\w+:\d+>/g, "")
            // Bold: **text** → <strong>text</strong>
            .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
            // Italic: *text* → <em>text</em>
            .replace(/\*(.+?)\*/g, "<em>$1</em>")
            // Newlines to <br>
            .replace(/\n/g, "<br>")
            .trim()
    );
}

function getActionEmoji(actionCost: string | null): string {
    if (!actionCost) return "";
    try {
        const map = JSON.parse(
            game.settings.get(MODULE_NAME, "action-emojis") as string,
        ) as Record<string, string>;
        return map[actionCost] ?? "";
    } catch {
        return "";
    }
}

function buildMechanicalLines(data: CreatePostData): string[] {
    const lines: string[] = [];

    if (data.traits.length > 0) {
        lines.push(`-# ${data.traits.map((t) => t.toUpperCase()).join(" ")}`);
    }

    if (data.attackTotal !== null) {
        const outcomeStr = data.attackOutcome ? ` (${data.attackOutcome})` : "";
        if (data.isCheck) {
            lines.push(`**Result:** ${data.attackTotal}${outcomeStr}`);
        } else {
            lines.push(`**Attack:** ${data.attackTotal}${outcomeStr}`);
        }
    }

    if (data.saveType) {
        const basic = data.isBasicSave ? "basic " : "";
        const dcStr = data.saveDC !== null ? `DC ${data.saveDC} ` : "";
        const cap =
            data.saveType.charAt(0).toUpperCase() + data.saveType.slice(1);
        lines.push(`**Save:** ${dcStr}${basic}${cap}`);
    }

    if (data.damageTotal !== null) {
        const breakdownStr =
            data.damageBreakdown !== String(data.damageTotal)
                ? ` (${data.damageBreakdown})`
                : "";
        lines.push(`**Damage:** ${data.damageTotal}${breakdownStr}`);
    }

    if (data.spellDescription) {
        lines.push(data.spellDescription);
    }

    if (data.actionDescription) {
        lines.push(data.actionDescription);
    }

    return lines;
}

function generatePostTemplate(
    data: CreatePostData,
    style: "text" | "embed",
): {
    content: string;
    embeds: DiscordEmbed[];
} {
    const emoji = getActionEmoji(data.actionCost);
    const prefix = emoji ? `${emoji} ` : "";
    const actor = `**${data.actorName}**`;
    const target = data.targetName ? `**${data.targetName}**` : null;
    const item = data.itemName ? `**${data.itemName}**` : null;

    const checkLabel = data.checkName ? `${data.checkName} check` : null;

    let headline: string;
    if (data.isSpell) {
        if (target && item) {
            headline = `${actor} ${prefix}casts ${item} on ${target}`;
        } else if (item) {
            headline = `${actor} ${prefix}casts ${item}`;
        } else {
            headline = `${actor} ${prefix}casts a spell`;
        }
    } else if (data.isCheck) {
        // Skill / perception / flat checks
        if (target && item && checkLabel) {
            headline = `${prefix}${actor} uses ${item} (${checkLabel}) against ${target}`;
        } else if (item && checkLabel) {
            headline = `${prefix}${actor} uses ${item} (${checkLabel})`;
        } else if (checkLabel) {
            headline = `${prefix}${actor} rolls ${checkLabel}`;
        } else if (item) {
            headline = `${prefix}${actor} uses ${item}`;
        } else {
            headline = `${prefix}${actor} rolls a check`;
        }
    } else if (target && item) {
        headline = `${prefix}${actor} attacks ${target} with ${item}`;
    } else if (target) {
        headline = `${prefix}${actor} attacks ${target}`;
    } else if (item) {
        headline = `${prefix}${actor} uses ${item}`;
    } else {
        headline = `${prefix}${actor} deals damage`;
    }

    const mechanicalLines = buildMechanicalLines(data);

    if (style === "embed") {
        const embed: DiscordEmbed = {
            description: mechanicalLines.join("\n"),
            color: 0xed4245,
        };
        return { content: headline, embeds: [embed] };
    }

    // Text mode: everything in content
    const content = [headline, ...mechanicalLines, ""].join("\n");
    return { content, embeds: [] };
}

/**
 * Replace @Name patterns in text with "ActorName (<@USER_ID>)" mentions
 * using the user-mention-config setting (actorId → UserMentionEntry).
 * Matches both full actor names and aliases (if set).
 * Output format matches RPGSage: "Kyra (Level 1) (<@123456>)"
 */
function resolveUserMentions(text: string): string {
    const userMap = getUserMentionMap();

    // Build reverse lookup: lowercased name → { discordUserId, actorName }
    // Register both the full actor name and the alias (if set)
    const nameLookup = new Map<
        string,
        { discordUserId: string; actorName: string }
    >();
    for (const [actorId, entry] of userMap) {
        const actor = game.actors.get(actorId);
        const actorName = actor?.name ?? "";
        if (actorName) {
            nameLookup.set(actorName.toLowerCase(), {
                discordUserId: entry.discordUserId,
                actorName,
            });
        }
        if (entry.alias) {
            nameLookup.set(entry.alias.toLowerCase(), {
                discordUserId: entry.discordUserId,
                actorName,
            });
        }
    }

    if (nameLookup.size === 0) return text;

    // Build a regex that matches @Name for each known name (longest first
    // so "Kyra (Level 1)" is tried before "Kyra").
    const escaped = [...nameLookup.keys()]
        .sort((a, b) => b.length - a.length)
        .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const pattern = new RegExp(`@(${escaped.join("|")})`, "gi");

    return text.replace(pattern, (_match, name: string) => {
        const entry = nameLookup.get(name.toLowerCase());
        return entry
            ? `${entry.actorName} (<@${entry.discordUserId}>)`
            : _match;
    });
}

export async function showCreatePostDialog(
    message: ChatMessagePF2e,
): Promise<void> {
    const channel = game.settings.get(
        MODULE_NAME,
        "action-post-channel",
    ) as ChannelTargetId;
    if (!isChannelTargetActive(channel)) {
        ui.notifications.warn("No action post channel configured.");
        return;
    }

    const data = extractCreatePostData(message);
    if (!data) {
        ui.notifications.warn("Could not extract data from this message.");
        return;
    }

    // For damage rolls, try to find the associated attack roll
    if (message.isDamageRoll && !isAttackRoll(message)) {
        const attackRoll = findAttackRoll(message);
        if (attackRoll) {
            data.attackTotal = attackRoll.total;
            if (!data.attackOutcome && attackRoll.outcome) {
                data.attackOutcome = attackRoll.outcome;
            }
        }
    }

    // For spell damage rolls, look up save info from a nearby saving-throw card
    if (data.isSpell && data.saveType) {
        const saveInfo = findSaveInfo(message);
        if (saveInfo) {
            if (data.saveDC === null) data.saveDC = saveInfo.dc;
            if (!data.targetName && saveInfo.targetName)
                data.targetName = saveInfo.targetName;
        }
        // Fallback: get DC from the caster's spell DC on the actor
        if (data.saveDC === null) {
            data.saveDC =
                message.actor?.system?.attributes?.spellDC?.value ??
                message.actor?.system?.attributes?.classOrSpellDC?.value ??
                null;
        }
    }

    // Convert spell description HTML to Discord markdown (async UUID resolution)
    if (data.spellDescription) {
        const { convertToMarkdownAsync } = await import("./helpers.ts");
        let desc = await convertToMarkdownAsync(data.spellDescription);
        // Strip horizontal rules (no Discord equivalent) and format as subtext
        desc = desc
            .replace(/^[\s*-]{3,}$/gm, "")
            .replace(/\n{2,}/g, "\n")
            .trim();
        data.spellDescription = desc
            .split("\n")
            .map((line) => (line.trim() === "" ? "" : `-# ${line}`))
            .join("\n");
    }

    // Convert action description HTML to Discord markdown
    if (data.actionDescription) {
        const { convertToMarkdownAsync } = await import("./helpers.ts");
        let desc = await convertToMarkdownAsync(data.actionDescription);
        desc = desc
            .replace(/^[\s*-]{3,}$/gm, "")
            .replace(/\n{2,}/g, "\n")
            .trim();
        data.actionDescription = desc
            .split("\n")
            .map((line) => (line.trim() === "" ? "" : `-# ${line}`))
            .join("\n");
    }

    const style =
        (game.settings.get(MODULE_NAME, "action-post-style") as string) ===
        "embed"
            ? "embed"
            : "text";
    const { content: narrative, embeds } = generatePostTemplate(data, style);
    const channelName = getChannelDisplayName(channel);

    // Build HTML preview of embed for the dialog (only in embed mode)
    const embedPreview =
        embeds.length > 0 && embeds[0].description
            ? discordMarkdownToHtml(embeds[0].description)
            : "";

    try {
        const result = await CreatePostDialog.showDialog({
            content: narrative,
            channelName,
            embeds,
            embedPreview,
        });

        // Resolve @Name mentions to Discord <@ID> for the Discord post
        const discordContent = resolveUserMentions(result.content);
        const discordEmbeds = result.embeds.map((e) => ({
            ...e,
            description: e.description
                ? resolveUserMentions(e.description)
                : e.description,
        }));

        // Post with token persona
        const avatarUrl = await generateImageLink(data.tokenImagePath);
        await postDiscordMessageAsPersona(
            channel,
            discordContent,
            discordEmbeds,
            data.tokenName,
            avatarUrl,
        );

        ui.notifications.info(
            game.i18n.localize(`${MODULE_NAME}.CreatePost.Posted`),
        );

        // Mirror to Foundry chat as a GM-whispered message (original @Name text)
        const mirrorHtml = discordMarkdownToHtml(result.content);
        const embedHtml = result.embeds
            .map((e) =>
                e.description ? discordMarkdownToHtml(e.description) : "",
            )
            .filter((s) => s.length > 0)
            .join("<br>");
        const embedSection = embedHtml
            ? `<div style="margin-top: 4px; padding: 4px 8px; background: rgba(237,66,69,0.08); border-radius: 3px; font-size: 0.9em;">${embedHtml}</div>`
            : "";
        const chatData = {
            user: game.user.id,
            content: `<div class="pbd-discord-mirror" style="border-left: 3px solid #5865F2; padding-left: 8px; color: #5865F2;">${mirrorHtml}${embedSection}</div>`,
            whisper: ChatMessage.getWhisperRecipients("GM").map(
                (u: { id: string }) => u.id,
            ),
            speaker: { alias: data.tokenName },
        };
        await ChatMessage.create(chatData);
    } catch {
        // User cancelled — do nothing
    }
}
