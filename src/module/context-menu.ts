import { postDiscordJournalSelection } from "./discord.ts";
import { Channel } from "./constants.ts";

class PBDContextMenu {
    menu: HTMLElement = document.createElement("menu");
    items: object[] = [];

    constructor(data) {
        this.build(data.items);
    }

    build(options) {
        this.menu = document.createElement("menu");
        this.menu.classList.add("context-menu");
        options.forEach((option) => this.buildOption(option));
        document.body.appendChild(this.menu);
    }

    buildOption(option) {
        const li = document.createElement("LI");
        li.classList.add("context-menu-item");
        li.addEventListener("click", async () => {
            const selection = PBDContextMenu.getSelectionText();
            if (selection)
                await postDiscordJournalSelection(option.channel, selection);
        });
        const button = document.createElement("button");
        button.classList.add("context-menu-btn");
        const i = document.createElement("i");
        i.classList.add("context-menu-icon");
        i.classList.add("fa-brands");
        i.classList.add("fa-discord");
        const span = document.createElement("span");
        span.classList.add("context-menu-text");
        span.textContent = option.label;
        button.appendChild(i);
        button.appendChild(span);
        li.appendChild(button);
        this.menu.appendChild(li);
    }

    show(x, y) {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const mw = this.menu.offsetWidth;
        const mh = this.menu.offsetHeight;
        x = x + mw > w ? x - mw : x;
        y = y + mh > h ? y - mh : y;
        this.menu.style.left = x + "px";
        this.menu.style.top = y + "px";
        this.menu.classList.add("show-context-menu");
    }

    hide() {
        this.menu.classList.remove("show-context-menu");
    }

    isOpen() {
        return this.menu.classList.contains("show-context-menu");
    }

    private static getSelectionText() {
        let html = "";
        const selection = window.getSelection();
        if (selection?.rangeCount && !selection.isCollapsed) {
            const fragments = selection.getRangeAt(0).cloneContents();
            const size = fragments.childNodes.length;
            for (let i = 0; i < size; i++) {
                if (fragments.childNodes[i].nodeType === fragments.TEXT_NODE)
                    html += (fragments.childNodes[i] as Text).wholeText;
                else html += (fragments.childNodes[i] as Element).outerHTML;
            }
        }
        return html;
    }
}

export function initContextMenu(): void {
    const contextMenu = new PBDContextMenu({
        items: [
            { label: "Post to IC", channel: Channel.IC },
            { label: "Post to OOC", channel: Channel.OOC },
            { label: "Post to GM", channel: Channel.GM },
        ],
    });

    document.addEventListener("contextmenu", (ev: PointerEvent) => {
        const target = ev.target as HTMLTextAreaElement;
        if (
            target.classList.contains("journal-entry-pages") ||
            $(target).parents("div.journal-entry-pages").length ||
            target.classList.contains("editor-content") ||
            $(target).parents("div.editor-content").length
        ) {
            const time = contextMenu.isOpen() ? 100 : 0;
            contextMenu.hide();
            setTimeout(() => {
                contextMenu.show(ev.pageX, ev.pageY);
            }, time);
        }
    });

    document.addEventListener("click", () => contextMenu.hide());
}
