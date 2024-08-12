# Play by Discord Tools
![Supported Foundry Versions](https://img.shields.io/endpoint?url=https://foundryshields.com/version?url=https://github.com/surged20/pbd-tools/releases/latest/download/module.json)
![GitHub License](https://img.shields.io/github/license/surged20/pbd-tools)
![Total Download Count](https://img.shields.io/github/downloads/surged20/pbd-tools/total)
![Latest Release Download Count](https://img.shields.io/github/downloads/surged20/pbd-tools/latest/module.zip)

Foundry VTT module to assist with managing a Play by Discord game from Foundry VTT.

## How to Install

### Manual Install
In Foundry setup, click on the Install Module button and put the following path in the Manifest URL. You could also use a path from a specific release.

`https://github.com/surged20/pbd-tools/releases/latest/download/module.json`

## Features

### General

- Send journal pages and image popouts to IC, OOC, or GM channels
- Send highlighted text in a journal page to IC, OOC, or GM channels

### PF2e only

- Send Foundry combat tracker state to IC channel with optional user mentions
- Send RPGSage PC/NPC create, update, and stats commands to GM channel

## Limitations

The module has a hardcoded assumption of a standard PbD channel configuration with IC, OOC, and GM channels.

## Configuration

- Create webhooks for the IC, OOC, and GM channels. Copy the webhook URL from Discord to the appropriate channel settings.
- Optionally set an alternative username and avatar image for each channel to be used for posts.
- Optionally set up PC to Discord User ID mapping to enable mentions on combat tracker updates

## Acknowledgements

- Journal support was inspired by and adapted from [Foundry to Discord](https://github.com/therealguy90/foundrytodiscord) code.
- Journal context menu support was inspired by and adapted from [Narrator Tools](https://github.com/elizeuangelo/fvtt-module-narrator-tools) code.