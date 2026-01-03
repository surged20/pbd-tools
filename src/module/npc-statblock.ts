import type { NPCPF2e } from "foundry-pf2e";
import { Channel } from "./constants.ts";
import { postDiscord } from "./discord.ts";
import { isChannelActive } from "./helpers.ts";
import { validateDiscordMessage, handleValidationResult } from "./discord-validation.ts";

interface StatblockData {
    name: string;
    level: number;
    traits: string[];
    ac: number;
    hp: { value: number; max: number; details?: string };
    saves: { fortitude: number; reflex: number; will: number };
    speeds: Record<string, number>;
    recalls: Array<{ skill: string; dc: number }>;
    attributes: Record<string, number>;
    senses: string[];
    perception: number;
    languages: string[];
    skills: Record<string, number>;
    attacks: Array<{
        name: string;
        type: string; // melee or ranged
        bonus: number;
        traits: string[];
        damage: string;
    }>;
    actions: Array<{
        name: string;
        actionType: string;
        traits: string[];
        description: string;
    }>;
    inventory: string[];
    spells?: Array<{
        level: number;
        spells: string[];
        dc?: number;
        attack?: number;
    }>;
}

export function formatNPCStatblock(actor: NPCPF2e): string {
    const data = extractStatblockData(actor);
    return buildStatblockMessage(data);
}

function extractStatblockData(actor: NPCPF2e): StatblockData {
    const system = actor.system;

    // Basic info
    const name = actor.name;
    const level = system.details.level.value;
    // Filter out legacy alignment traits (lawful, chaotic, good, evil)
    const legacyAlignmentTraits = ['lawful', 'chaotic', 'good', 'evil'];
    const traits = system.traits.value.map(trait =>
        typeof trait === 'string' ? trait : (trait as any).name || (trait as any).label || String(trait)
    ).filter(trait => trait && !legacyAlignmentTraits.includes(trait.toLowerCase()));

    // Combat stats
    const ac = system.attributes.ac.value;
    const hp = {
        value: system.attributes.hp.value,
        max: system.attributes.hp.max,
        details: system.attributes.hp.details || undefined
    };
    // Saves
    const saves = {
        fortitude: system.saves.fortitude.value,
        reflex: system.saves.reflex.value,
        will: system.saves.will.value
    };

    // Speeds
    const speeds: Record<string, number> = {};
    if (system.attributes.speed.value) speeds.land = system.attributes.speed.value;
    Object.entries(system.attributes.speed.otherSpeeds || {}).forEach(([key, speed]) => {
        if (speed && typeof speed === 'object' && 'value' in speed) {
            speeds[key] = speed.value as number;
        }
    });

    // Recall Knowledge - extract from system identification data
    const recalls = extractRecallKnowledge(actor);

    // Attributes
    const attributes: Record<string, number> = {};
    Object.entries(system.abilities).forEach(([key, ability]) => {
        if (ability && typeof ability === 'object' && 'mod' in ability) {
            attributes[key] = ability.mod as number;
        }
    });

    // Perception
    const perception = (system.attributes as any).perception?.value || system.abilities.wis.mod;

    // Senses
    const senses = Object.values((system.traits as any).senses || {})
        .map(sense => typeof sense === 'string' ? sense : (sense as any).label || (sense as any).type)
        .filter(Boolean);

    // Languages
    const languages = (system.traits as any).languages?.value || [];

    // Skills
    const skills: Record<string, number> = {};
    Object.entries(system.skills).forEach(([key, skill]) => {
        if (skill && typeof skill === 'object' && 'value' in skill && skill.value > 0) {
            skills[key] = skill.value as number;
        }
    });

    // Add lore skills
    actor.itemTypes.lore?.forEach(lore => {
        const skillName = lore.name.toLowerCase().replace(' lore', '');
        skills[skillName] = lore.system.mod.value;
    });

    // Attacks
    const attacks = extractAttacks(actor);

    // Actions
    const actions = extractActions(actor);

    // Inventory
    const inventory = extractInventory(actor);

    // Spells
    const spells = extractSpells(actor);

    return {
        name,
        level,
        traits,
        ac,
        hp,
        saves,
        speeds,
        recalls,
        attributes,
        senses,
        perception,
        languages,
        skills,
        attacks,
        actions,
        inventory,
        spells: spells.length > 0 ? spells : undefined
    };
}

function extractRecallKnowledge(actor: NPCPF2e): Array<{ skill: string; dc: number }> {
    const recalls: Array<{ skill: string; dc: number }> = [];
    const system = actor.system;
    const level = system.details.level.value;

    // Standard DC calculation based on level
    const standardDC = Math.max(10 + level, 14);

    // Get identification data from system
    const identification = (system as any).details?.identification;
    if (identification) {
        // Extract skills and their DCs from identification data
        Object.entries(identification.skills || {}).forEach(([skill, data]) => {
            if (data && typeof data === 'object' && 'dc' in data) {
                recalls.push({
                    skill: skill.charAt(0).toUpperCase() + skill.slice(1),
                    dc: (data as any).dc || standardDC
                });
            }
        });
    }

    // Fallback: use creature type to determine likely skills
    if (recalls.length === 0) {
        const creatureType = (system.details as any).creatureType?.toLowerCase() || 'humanoid';
        const skillMapping: Record<string, string[]> = {
            'undead': ['Religion', 'Occultism'],
            'fiend': ['Religion'],
            'celestial': ['Religion'],
            'fey': ['Nature'],
            'elemental': ['Arcana', 'Nature'],
            'construct': ['Arcana', 'Crafting'],
            'dragon': ['Arcana'],
            'beast': ['Nature'],
            'plant': ['Nature'],
            'humanoid': ['Society']
        };

        const skills = skillMapping[creatureType] || ['Society'];
        skills.forEach(skill => {
            recalls.push({ skill, dc: standardDC });
        });
    }

    return recalls;
}

function extractAttacks(actor: NPCPF2e): Array<{
    name: string;
    type: string;
    bonus: number;
    traits: string[];
    damage: string;
}> {
    const attacks: Array<{
        name: string;
        type: string;
        bonus: number;
        traits: string[];
        damage: string;
    }> = [];

    actor.itemTypes.melee?.forEach(strike => {
        const name = strike.name;
        const bonus = strike.system.bonus.value;
        const traits = strike.system.traits.value;

        // Determine if melee or ranged based on traits
        const isRanged = traits.some(trait =>
            typeof trait === 'string' ?
            ['ranged', 'thrown', 'propulsive'].includes(trait.toLowerCase()) :
            ['ranged', 'thrown', 'propulsive'].includes(((trait as any).name || (trait as any).label || '').toLowerCase())
        );
        const type = isRanged ? 'ranged' : 'melee';

        // Build damage string
        let damage = '';
        const damageRolls = strike.system.damageRolls;
        if (damageRolls && Object.keys(damageRolls).length > 0) {
            const damageStrings = Object.values(damageRolls).map(roll => {
                let str = roll.damage;
                if (roll.damageType) str += ` ${roll.damageType}`;
                if ((roll as any).critical) str += ` plus ${(roll as any).critical}`;
                return str;
            });
            damage = damageStrings.join(', ');
        }

        attacks.push({ name, type, bonus, traits, damage });
    });

    return attacks;
}

function extractActions(actor: NPCPF2e): Array<{
    name: string;
    actionType: string;
    traits: string[];
    description: string;
}> {
    const actions: Array<{
        name: string;
        actionType: string;
        traits: string[];
        description: string;
    }> = [];

    // Get actions and reactions
    [...(actor.itemTypes.action || []), ...(actor.itemTypes.feat || [])]
        .forEach(item => {
            if (item.system.actionType) {
                const name = item.name;
                const actionType = item.system.actionType.value || 'passive';
                const traits = item.system.traits?.value || [];
                const description = item.system.description?.value || '';

                // Clean up description (remove HTML, limit length)
                const cleanDescription = description
                    .replace(/<[^>]*>/g, '')
                    .replace(/\s+/g, ' ')
                    .trim()
                    .substring(0, 500);

                actions.push({ name, actionType, traits, description: cleanDescription });
            }
        });

    return actions;
}

function extractInventory(actor: NPCPF2e): string[] {
    const inventory: string[] = [];

    // Get equipment
    actor.itemTypes.equipment?.forEach(item => {
        let entry = item.name;
        if (item.system.quantity > 1) {
            entry = `${item.name} (${item.system.quantity})`;
        }
        inventory.push(entry);
    });

    // Get weapons not already included in attacks
    actor.itemTypes.weapon?.forEach(item => {
        let entry = item.name;
        if (item.system.quantity > 1) {
            entry = `${item.name} (${item.system.quantity})`;
        }
        inventory.push(entry);
    });

    return inventory;
}

function extractSpells(actor: NPCPF2e): Array<{
    level: number;
    spells: string[];
    dc?: number;
    attack?: number;
}> {
    const spellsByLevel: Record<number, string[]> = {};
    let dc: number | undefined;
    let attack: number | undefined;

    // Get spellcasting entries
    actor.itemTypes.spellcastingEntry?.forEach(entry => {
        dc = entry.system.spelldc?.dc;
        attack = entry.system.spelldc?.value;

        // Get spells from this entry
        Object.entries(entry.system.slots || {}).forEach(([levelStr, slot]) => {
            const level = parseInt(levelStr);
            if (slot.prepared) {
                Object.values(slot.prepared).forEach(prepared => {
                    if (prepared.id) {
                        const spell = actor.items.get(prepared.id);
                        if (spell) {
                            if (!spellsByLevel[level]) spellsByLevel[level] = [];
                            spellsByLevel[level].push(spell.name);
                        }
                    }
                });
            }
        });
    });

    // Convert to array format
    const spells = Object.entries(spellsByLevel)
        .map(([levelStr, spellNames]) => ({
            level: parseInt(levelStr),
            spells: spellNames,
            dc: dc,
            attack: attack
        }))
        .sort((a, b) => a.level - b.level);

    return spells;
}

function buildStatblockMessage(data: StatblockData): string {
    const lines: string[] = [];

    // Header
    lines.push(`**${data.name}** - Level ${data.level}`);
    if (data.traits.length > 0) {
        lines.push(`*${data.traits.join(', ')}*`);
    }

    // Combat stats
    lines.push('');
    lines.push(`**AC** ${data.ac} **HP** ${data.hp.value}/${data.hp.max}${data.hp.details ? ` (${data.hp.details})` : ''}`);

    // Saves
    lines.push(`**Saves** Fort ${data.saves.fortitude >= 0 ? '+' : ''}${data.saves.fortitude}, Ref ${data.saves.reflex >= 0 ? '+' : ''}${data.saves.reflex}, Will ${data.saves.will >= 0 ? '+' : ''}${data.saves.will}`);

    // Speeds
    if (Object.keys(data.speeds).length > 0) {
        const speedEntries = Object.entries(data.speeds)
            .map(([type, speed]) => type === 'land' ? `${speed} ft` : `${type} ${speed} ft`)
            .join(', ');
        lines.push(`**Speed** ${speedEntries}`);
    }

    // Recall Knowledge
    if (data.recalls.length > 0) {
        const recallEntries = data.recalls.map(recall => `${recall.skill} DC ${recall.dc}`);
        lines.push(`**Recall Knowledge** ${recallEntries.join(', ')}`);
    }

    // Attributes
    const attrEntries = Object.entries(data.attributes)
        .map(([attr, mod]) => `${attr.toUpperCase()} ${mod >= 0 ? '+' : ''}${mod}`)
        .join(', ');
    lines.push(`**Attributes** ${attrEntries}`);

    // Senses
    let sensesLine = `**Senses** Perception ${data.perception >= 0 ? '+' : ''}${data.perception}`;
    if (data.senses.length > 0) {
        sensesLine += `, ${data.senses.join(', ')}`;
    }
    lines.push(sensesLine);

    // Languages
    if (data.languages.length > 0) {
        lines.push(`**Languages** ${data.languages.join(', ')}`);
    }

    // Skills
    if (Object.keys(data.skills).length > 0) {
        const skillEntries = Object.entries(data.skills)
            .map(([skill, mod]) => `${skill} ${mod >= 0 ? '+' : ''}${mod}`)
            .join(', ');
        lines.push(`**Skills** ${skillEntries}`);
    }

    // Attacks
    if (data.attacks.length > 0) {
        lines.push('');
        lines.push('**Attacks**');
        data.attacks.forEach(attack => {
            let line = `-# **${attack.name}** *${attack.type}* ${attack.bonus >= 0 ? '+' : ''}${attack.bonus}`;
            if (attack.traits.length > 0) {
                line += ` (${attack.traits.join(', ')})`;
            }
            if (attack.damage) {
                line += ` **Damage** ${attack.damage}`;
            }
            lines.push(line);
        });
    }

    // Actions
    if (data.actions.length > 0) {
        lines.push('');
        lines.push('**Actions**');
        data.actions.forEach(action => {
            const actionSymbol = getActionSymbol(action.actionType);
            let line = `-# **${action.name}** ${actionSymbol}`;
            if (action.traits.length > 0) {
                line += ` (${action.traits.join(', ')})`;
            }
            lines.push(line);
            if (action.description) {
                lines.push(`-# ${action.description}`);
            }
        });
    }

    // Inventory
    if (data.inventory.length > 0) {
        lines.push('');
        lines.push(`**Inventory** ${data.inventory.join(', ')}`);
    }

    // Spells
    if (data.spells && data.spells.length > 0) {
        lines.push('');
        lines.push('**Spells**');
        if (data.spells[0].dc || data.spells[0].attack) {
            let spellStats = '';
            if (data.spells[0].dc) spellStats += `DC ${data.spells[0].dc}`;
            if (data.spells[0].attack) {
                if (spellStats) spellStats += ', ';
                spellStats += `Attack ${data.spells[0].attack >= 0 ? '+' : ''}${data.spells[0].attack}`;
            }
            lines.push(`-# ${spellStats}`);
        }
        data.spells.forEach(level => {
            const levelName = level.level === 0 ? 'Cantrips' : `${level.level}${getOrdinalSuffix(level.level)} Level`;
            lines.push(`-# **${levelName}** ${level.spells.join(', ')}`);
        });
    }

    return lines.join('\n');
}

function getActionSymbol(actionType: string): string {
    switch (actionType.toLowerCase()) {
        case 'action': return '(1)';
        case 'two-actions': return '(2)';
        case 'three-actions': return '(3)';
        case 'reaction': return '(R)';
        case 'free': return '(F)';
        case 'passive': return '';
        default: return '';
    }
}

function getOrdinalSuffix(num: number): string {
    const ones = num % 10;
    const tens = Math.floor(num / 10) % 10;

    if (tens === 1) {
        return 'th';
    } else if (ones === 1) {
        return 'st';
    } else if (ones === 2) {
        return 'nd';
    } else if (ones === 3) {
        return 'rd';
    } else {
        return 'th';
    }
}

export async function sendNPCStatblock(actor: NPCPF2e): Promise<void> {
    if (!isChannelActive(Channel.GM)) {
        ui.notifications.warn("GM Discord channel is not configured");
        return;
    }

    try {
        const statblock = formatNPCStatblock(actor);

        // Pre-validate statblock size before attempting to send
        const validationResult = validateDiscordMessage(statblock, []);
        if (!handleValidationResult(validationResult, `NPC statblock for ${actor.name}`)) {
            return;
        }

        await postDiscord(Channel.GM, statblock);
        ui.notifications.info(`Sent ${actor.name} statblock to Discord`);
    } catch (error) {
        console.error("Failed to send NPC statblock:", error);
        ui.notifications.error("Failed to send statblock to Discord");
    }
}