import { MODULE_NAME } from "./constants.ts";

/**
 * Generates an image link from a given source.
 *
 * @param {string} imageSource - The source of the image.
 * @param {boolean} [requireAvatarCompatible=true] - Whether the image needs to be avatar compatible.
 * @return {Promise<string>} The generated image link.
 */
export async function generateImageLink(imageSource, requireAvatarCompatible = true) {
  const supportedFormats = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
  let imageUrl;

  if (!imageSource || imageSource === "") {
    return getDefaultAvatarLink();
  }

  if (imageSource.startsWith("http")) {
    imageUrl = imageSource;
  } else {
    if (isRemoteAccessible()) {
      const convertedURI = convertToValidURI(imageSource);
      imageUrl = `${getRemoteURL()}${convertedURI}`;
    } else {
      return "";
    }
  }

  const urlParts = imageUrl.split('.');
  const fileExtension = urlParts[urlParts.length - 1].toLowerCase().split('?')[0];

  if (!requireAvatarCompatible || supportedFormats.includes(fileExtension)) {
    return imageUrl;
  } else {
    return getDefaultAvatarLink();
  }
}

function convertToValidURI(filePath) {
    if(filePath.includes("%")){
        return filePath;
    }
    else{
        return encodeURIComponent(filePath);
    }
}

interface Addresses {
    local: string;
    remote: string;
    remoteIsAccessible: boolean;
}

function isRemoteAccessible(): boolean {
  const overrideUrl = game.settings.get(MODULE_NAME, "override-remote-url") as string;
  if (overrideUrl === "") {
    const addresses = (game.data as any).addresses as Addresses;
    return addresses.remoteIsAccessible;
  } else {
    return true;
  }
}

function getRemoteURL(): string {
  const overrideUrl = game.settings.get(MODULE_NAME, "override-remote-url") as string;
  if (overrideUrl === "") {
    const addresses = (game.data as any).addresses as Addresses;
    return addresses.remote;
  } else {
    return overrideUrl;
  }
}

export function getDefaultAvatarLink(): string {
  return "https://r2.foundryvtt.com/website-static-public/assets/icons/fvtt.png";
}