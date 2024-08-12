export const MODULE_NAME = "pbd-tools"

export const enum Channel {
    IC = 0,
    OOC,
    GM
}

export const DEFAULT_AVATAR = "icons/vtt-512.png"

export function isPF2e() {
    return (game.system as any).name === "pf2e";
}