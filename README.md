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

### Discord Integration

- **Journal Sharing**: Send journal pages to IC, OOC, or GM Discord channels via context menu
- **Text Selection**: Highlight text in a journal page and post selected text to any channel
- **Image Popouts**: Dropdown buttons on image popouts to post images directly to Discord
- **HTML to Markdown**: Journal content automatically converted to Discord-compatible Markdown
- **UUID Resolution**: Embedded content links resolved to proper text references

### Combat Tracker (PF2e)

- **Automatic Updates**: Post combat tracker state to Discord when turns change
- **Display Modes**: Compact, Wide, or Custom column layouts
- **Configurable Content**:
  - Initiative order with turn marker
  - AC display (hidden, value, or alias)
  - HP display (hidden, PC only, or PC + opposition damage)
  - Hero points, conditions/effects, NPC aliases
- **User Mentions**: Optionally mention Discord users when their character's turn begins
- **Begin/End Messages**: Optional messages when combat starts and ends

### NPC/Hazard Export (PF2e)

- **TSV Export**: Export NPCs and complex hazards to RPG Sage-compatible TSV format
- **Multiple Export Sources**:
  - Individual actors via context menu or sheet button
  - All NPCs in an encounter via combat tracker
  - All NPCs in a folder via folder context menu
  - All NPCs in a scene via scene context menu
- **Alias System**: Auto-generated aliases stored persistently, editable before export
- **Spoiler Tags**: Optionally wrap stat values in Discord spoiler tags
- **Server or Download**: Upload to server with chat import command, or download locally

### PC Export (PF2e)

- **PathBuilder JSON**: Export player characters to PathBuilder 2e format
- **Import Commands**: Chat message with RPG Sage import/reimport commands
- **Discord Notification**: Optional automatic post to Discord with import link

### NPC Statblock (PF2e)

- **Statblock Posting**: Send formatted NPC statblocks to GM Discord channel
- **Full Details**: Name, level, traits, AC, HP, saves, speeds, attributes, skills, attacks, actions, spells
- **Influence Statblock**: Post influence tracking data (requires pf2e-bestiary-tracking module)
- **Customizable Colors**: Configure embed colors for statblocks

### Region Behaviors

- **Post to Discord**: Create regions that post custom messages to Discord when triggered
- **Trigger Events**: Token enter/exit, move, turn start/end, round start/end
- **Options**: Once-only trigger, pause game on trigger, channel selection

## Configuration

### Discord Webhooks
Create webhooks for the IC, OOC, and GM channels in Discord. Copy the webhook URL to the appropriate channel settings in the module configuration.

Optional per-channel settings:
- Custom username for posts
- Custom avatar image for posts

### Combat Tracker Mentions
Map player characters to Discord user IDs to enable @mentions when their turn begins.

### Export Settings
- Server upload vs local download
- Automatic Discord posting
- Alias abbreviation length and mode
- Spoiler tag wrapping

### Tracker Settings
- Enable/disable tracker updates
- Output channel selection
- Display mode (Compact/Wide/Custom)
- Column visibility and custom headers
- Turn marker symbol

## Limitations

- Assumes a standard PbD channel configuration with IC, OOC, and GM channels
- PF2e-specific features require the PF2e game system
- Influence statblocks require the pf2e-bestiary-tracking module

## Acknowledgements

- Journal support was inspired by and adapted from [Foundry to Discord](https://github.com/therealguy90/foundrytodiscord) code.
- Journal context menu support was inspired by and adapted from [Narrator Tools](https://github.com/elizeuangelo/fvtt-module-narrator-tools) code.
