import type { DiscordEmbed } from "./constants.ts";

// Discord API limits based on https://discord.com/developers/docs/resources/message#message-object-message-structure
// and https://discord.com/developers/docs/resources/message#embed-object-embed-limits
export const DISCORD_LIMITS = {
    // Message content limit
    CONTENT_MAX_LENGTH: 2000,

    // Embed limits
    MAX_EMBEDS: 10,
    TOTAL_EMBEDS_SIZE: 6000,

    // Individual embed limits
    EMBED_TITLE_MAX: 256,
    EMBED_DESCRIPTION_MAX: 4096,
    EMBED_FIELD_NAME_MAX: 256,
    EMBED_FIELD_VALUE_MAX: 1024,
    EMBED_FIELD_MAX_COUNT: 25,
    EMBED_FOOTER_TEXT_MAX: 2048,
    EMBED_AUTHOR_NAME_MAX: 256,

    // Total characters across all embed fields
    EMBED_TOTAL_CHAR_LIMIT: 6000,
} as const;

export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

/**
 * Calculate the total character count for a Discord embed
 */
function calculateEmbedSize(embed: DiscordEmbed): number {
    let size = 0;

    if (embed.title) size += embed.title.length;
    if (embed.description) size += embed.description.length;
    if (embed.footer?.text) size += embed.footer.text.length;
    if (embed.author?.name) size += embed.author.name.length;

    // Note: This doesn't include field counts since the current DiscordEmbed type doesn't define fields
    // If fields are added to the type later, this would need to be updated

    return size;
}

/**
 * Validate a single Discord embed against Discord's limits
 */
function validateEmbed(embed: DiscordEmbed, index: number): ValidationResult {
    const result: ValidationResult = {
        valid: true,
        errors: [],
        warnings: []
    };

    // Check title length
    if (embed.title && embed.title.length > DISCORD_LIMITS.EMBED_TITLE_MAX) {
        result.valid = false;
        result.errors.push(`Embed ${index + 1}: Title exceeds ${DISCORD_LIMITS.EMBED_TITLE_MAX} characters (${embed.title.length} chars)`);
    }

    // Check description length
    if (embed.description && embed.description.length > DISCORD_LIMITS.EMBED_DESCRIPTION_MAX) {
        result.valid = false;
        result.errors.push(`Embed ${index + 1}: Description exceeds ${DISCORD_LIMITS.EMBED_DESCRIPTION_MAX} characters (${embed.description.length} chars)`);
    }

    // Check footer text length
    if (embed.footer?.text && embed.footer.text.length > DISCORD_LIMITS.EMBED_FOOTER_TEXT_MAX) {
        result.valid = false;
        result.errors.push(`Embed ${index + 1}: Footer text exceeds ${DISCORD_LIMITS.EMBED_FOOTER_TEXT_MAX} characters (${embed.footer.text.length} chars)`);
    }

    // Check author name length
    if (embed.author?.name && embed.author.name.length > DISCORD_LIMITS.EMBED_AUTHOR_NAME_MAX) {
        result.valid = false;
        result.errors.push(`Embed ${index + 1}: Author name exceeds ${DISCORD_LIMITS.EMBED_AUTHOR_NAME_MAX} characters (${embed.author.name.length} chars)`);
    }

    // Check total embed size
    const embedSize = calculateEmbedSize(embed);
    if (embedSize > DISCORD_LIMITS.EMBED_TOTAL_CHAR_LIMIT) {
        result.valid = false;
        result.errors.push(`Embed ${index + 1}: Total size exceeds ${DISCORD_LIMITS.EMBED_TOTAL_CHAR_LIMIT} characters (${embedSize} chars)`);
    }

    return result;
}

/**
 * Validate a Discord message against all Discord API limits
 */
export function validateDiscordMessage(content: string, embeds: DiscordEmbed[]): ValidationResult {
    const result: ValidationResult = {
        valid: true,
        errors: [],
        warnings: []
    };

    // Check message content length
    if (content.length > DISCORD_LIMITS.CONTENT_MAX_LENGTH) {
        result.valid = false;
        result.errors.push(`Message content exceeds ${DISCORD_LIMITS.CONTENT_MAX_LENGTH} characters (${content.length} chars)`);
    }

    // Check embed count
    if (embeds.length > DISCORD_LIMITS.MAX_EMBEDS) {
        result.valid = false;
        result.errors.push(`Too many embeds: ${embeds.length} (max ${DISCORD_LIMITS.MAX_EMBEDS})`);
    }

    // Validate individual embeds and calculate total embed size
    let totalEmbedSize = 0;
    embeds.forEach((embed, index) => {
        const embedResult = validateEmbed(embed, index);
        result.errors.push(...embedResult.errors);
        result.warnings.push(...embedResult.warnings);
        if (!embedResult.valid) {
            result.valid = false;
        }
        totalEmbedSize += calculateEmbedSize(embed);
    });

    // Check total embeds size
    if (totalEmbedSize > DISCORD_LIMITS.TOTAL_EMBEDS_SIZE) {
        result.valid = false;
        result.errors.push(`Total embeds size exceeds ${DISCORD_LIMITS.TOTAL_EMBEDS_SIZE} characters (${totalEmbedSize} chars)`);
    }

    // Add warnings for approaching limits
    if (content.length > DISCORD_LIMITS.CONTENT_MAX_LENGTH * 0.9) {
        result.warnings.push(`Message content is approaching the limit (${content.length}/${DISCORD_LIMITS.CONTENT_MAX_LENGTH} chars)`);
    }

    if (totalEmbedSize > DISCORD_LIMITS.TOTAL_EMBEDS_SIZE * 0.9) {
        result.warnings.push(`Total embeds size is approaching the limit (${totalEmbedSize}/${DISCORD_LIMITS.TOTAL_EMBEDS_SIZE} chars)`);
    }

    return result;
}

/**
 * Log validation results to console and show UI notifications
 */
export function handleValidationResult(result: ValidationResult, context: string): boolean {
    if (!result.valid) {
        const errorMessage = `Discord message validation failed for ${context}:`;
        console.warn(`[PBD-Tools] ${errorMessage}`, result.errors);

        // Show UI error notification
        ui.notifications.error(`Failed to send ${context}: Message exceeds Discord size limits`);

        // Log detailed errors
        result.errors.forEach(error => {
            console.warn(`[PBD-Tools] Discord validation error: ${error}`);
        });

        return false;
    }

    // Log warnings if any
    if (result.warnings.length > 0) {
        result.warnings.forEach(warning => {
            console.warn(`[PBD-Tools] Discord validation warning: ${warning}`);
        });
    }

    return true;
}