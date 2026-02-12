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

### Game Channels

Manage any number of Discord channels through a unified settings menu. Two modes are available:

- **Bot Mode**: Provide a Discord bot token and the module auto-discovers channels and manages webhooks via RPGSage. A CORS proxy is required for bot API calls during setup (see [Cloudflare Proxy Setup](docs/cloudflare-proxy-setup.md)).
- **Manual Mode**: Paste webhook URLs directly for each channel.

Both modes store channels in a single unified config. Thread support is included — threads share their parent channel's webhook and post via Discord's `thread_id` parameter.

Per-feature channel selection lets you route different outputs to different channels:
- **Menu Channels**: Which channels appear in journal/image/text-selection context menus (empty = all)
- **Tracker Output Channel**: Where combat tracker updates are posted
- **PC Export Channel**: Where PC import notifications go
- **GM Output Channel**: Where NPC statblocks and exports are posted
- **Action Post Channel**: Where Create Post combat actions are posted

### Discord Integration

- **Journal Sharing**: Send journal pages to any configured channel via context menu
- **Text Selection**: Highlight text in a journal page and post selected text to any channel
- **Image Popouts**: Dropdown buttons on image popouts to post images directly to Discord
- **HTML to Markdown**: Journal content automatically converted to Discord-compatible Markdown
- **UUID Resolution**: Embedded content links resolved to proper text references
- **User Mentions**: Map actors to Discord user IDs for @mentions in posts

### Create Post (PF2e)

Right-click any combat chat card to post a formatted action summary to Discord. Supports:

- **Attack Rolls**: Headline with attacker, target, weapon; attack total and outcome (Hit/Miss/Critical)
- **Damage Rolls**: Damage total with type breakdown; auto-links the preceding attack roll
- **Spell Rolls**: Spell name, save type and DC, description formatted as subtext
- **Skill Checks**: Action name, skill, target, roll result and degree of success (Success/Failure/Critical), outcome description
- **Action Cards**: Non-rolling actions (Raise Shield, Stride, etc.) with description

Posts are sent as the character's token persona (name + avatar). The dialog allows editing before sending, and a GM-whispered mirror appears in Foundry chat.

Style options: **Text** (everything in message content) or **Embed** (mechanical details in a Discord embed).

Action emojis (for 1-action, 2-action, etc. glyphs) are auto-discovered from guild custom emojis during bot setup.

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

### Game Channels Setup

Open the **Game Channels** settings menu. Choose either:

1. **Bot Mode**: Enter your Discord bot token, set a CORS proxy URL ([setup guide](docs/cloudflare-proxy-setup.md)), click Test Connection. The module discovers channels via RPGSage webhooks. Add channels to your config.
2. **Manual Mode**: For each channel, paste the Discord webhook URL and give it a name. For threads, enter the thread name and ID.

Then configure which channels are used for each feature in the Export Settings and Tracker Settings menus.

### User Mentions
Map player characters to Discord user IDs to enable @mentions in combat tracker updates and Create Post output.

### Export Settings
- Action post channel and style (text/embed)
- PC export channel and auto-post toggle
- GM output channel
- NPC server upload vs local download
- Alias abbreviation length and mode
- Spoiler tag wrapping

### Tracker Settings
- Enable/disable tracker updates
- Output channel selection
- Display mode (Compact/Wide/Custom)
- Column visibility and custom headers
- Turn marker symbol

## Limitations

- PF2e-specific features (combat tracker, Create Post, exports) require the PF2e game system
- Influence statblocks require the pf2e-bestiary-tracking module
- Bot mode requires a CORS proxy for Discord API setup calls (message sending uses webhooks directly)

## Acknowledgements

- Journal support was inspired by and adapted from [Foundry to Discord](https://github.com/therealguy90/foundrytodiscord) code.
- Journal context menu support was inspired by and adapted from [Narrator Tools](https://github.com/elizeuangelo/fvtt-module-narrator-tools) code.
