import { MODULE_NAME } from "./constants.ts";

interface Addresses {
    local: string;
    remote: string;
    remoteIsAccessible: boolean;
}

type GameData = {
    addresses: Addresses;
};

export function isRemoteAccessible(): boolean {
    const overrideUrl = game.settings.get(
        MODULE_NAME,
        "override-remote-url",
    ) as string;
    const gameData = game.data as unknown;
    if (overrideUrl === "") {
        const addresses = (gameData as GameData).addresses as Addresses;
        return addresses.remoteIsAccessible;
    } else {
        return true;
    }
}

export function getRemoteURL(): string {
    const overrideUrl = game.settings.get(
        MODULE_NAME,
        "override-remote-url",
    ) as string;
    const gameData = game.data as unknown;
    if (overrideUrl === "") {
        const addresses = (gameData as GameData).addresses as Addresses;
        return addresses.remote;
    } else {
        return overrideUrl;
    }
}
