// Create Post Dialog using ApplicationV2 framework

// Runtime globals available in Foundry
declare const foundry: {
    applications: {
        api: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ApplicationV2: any;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            HandlebarsApplicationMixin: <T>(base: T) => any;
        };
    };
};

interface DiscordEmbed {
    title?: string;
    description?: string;
    color?: number;
}

interface CreatePostDialogResult {
    content: string;
    embeds: DiscordEmbed[];
}

interface CreatePostDialogOptions {
    content: string;
    channelName: string;
    embeds?: DiscordEmbed[];
    embedPreview?: string;
}

export class CreatePostDialog extends foundry.applications.api.HandlebarsApplicationMixin(
    foundry.applications.api.ApplicationV2,
) {
    static DEFAULT_OPTIONS = {
        id: "create-post-dialog-{id}",
        classes: ["dialog", "pbd-tools-create-post-dialog"],
        tag: "dialog",
        window: {
            title: "pbd-tools.CreatePost.DialogTitle",
            icon: "fa-brands fa-discord",
            minimizable: false,
            resizable: true,
        },
        position: {
            width: 600,
            height: 500,
        },
    };

    static PARTS = {
        form: {
            template: "modules/pbd-tools/templates/create-post-dialog.hbs",
        },
        footer: {
            template: "templates/generic/form-footer.hbs",
        },
    };

    #content: string;
    #channelName: string;
    #embeds: DiscordEmbed[];
    #embedPreview: string;
    #wasConfirmed = false;
    onPost: (result: CreatePostDialogResult) => void;
    onCancel?: () => void;

    constructor(
        options: CreatePostDialogOptions & {
            onPost: (result: CreatePostDialogResult) => void;
            onCancel?: () => void;
        },
    ) {
        super({
            window: {
                title: game.i18n.localize("pbd-tools.CreatePost.DialogTitle"),
            },
        });
        this.#content = options.content;
        this.#channelName = options.channelName;
        this.#embeds = options.embeds ?? [];
        this.#embedPreview = options.embedPreview ?? "";
        this.onPost = options.onPost;
        this.onCancel = options.onCancel;
    }

    async _prepareContext(_options: unknown): Promise<{
        content: string;
        channelName: string;
        embedPreview: string;
    }> {
        return {
            content: this.#content,
            channelName: this.#channelName,
            embedPreview: this.#embedPreview,
        };
    }

    async _preparePartContext(
        partId: string,
        context: { content: string; channelName: string; embedPreview: string },
    ): Promise<unknown> {
        if (partId === "footer") {
            return {
                ...context,
                buttons: [
                    {
                        type: "button",
                        icon: "fa-brands fa-discord",
                        label: "Post",
                        action: "post",
                    },
                    {
                        type: "button",
                        icon: "fas fa-times",
                        label: "Cancel",
                        action: "cancel",
                    },
                ],
            };
        }
        return context;
    }

    _onRender(_context: unknown, _options: unknown): void {
        super._onRender(_context, _options);
        this.#injectStyles();

        const form = this.element.querySelector("form");
        if (form) {
            form.addEventListener("submit", this.#onSubmit.bind(this));
        }
    }

    #injectStyles(): void {
        const styleId = "pbd-create-post-dialog-styles";
        if (!document.getElementById(styleId)) {
            const style = document.createElement("style");
            style.id = styleId;
            style.textContent = `
                .pbd-create-post-content {
                    padding: 10px;
                }
                .pbd-create-post-channel {
                    margin-bottom: 8px;
                    color: var(--color-text-dark-secondary);
                }
                .pbd-create-post-textarea {
                    width: 100%;
                    min-height: 200px;
                    font-family: monospace;
                    padding: 8px;
                    border: 1px solid var(--color-border-light-primary);
                    border-radius: 3px;
                    resize: vertical;
                }
                .pbd-create-post-embed-preview {
                    margin-top: 8px;
                    padding: 8px 12px;
                    border-left: 3px solid #ED4245;
                    background: rgba(237, 66, 69, 0.06);
                    border-radius: 0 3px 3px 0;
                    font-size: 0.9em;
                    color: var(--color-text-dark-secondary);
                    white-space: pre-line;
                }
                .pbd-create-post-embed-label {
                    font-size: 0.8em;
                    text-transform: uppercase;
                    color: var(--color-text-dark-inactive);
                    margin-top: 12px;
                    margin-bottom: 2px;
                }
                .pbd-tools-create-post-dialog .form-footer {
                    display: flex;
                    flex-direction: row;
                    gap: 8px;
                    padding: 10px;
                    justify-content: flex-start;
                }
                .pbd-tools-create-post-dialog .form-footer button {
                    flex: 0 0 auto;
                }
            `;
            document.head.appendChild(style);
        }
    }

    _onClose(_options: unknown): void {
        if (!this.#wasConfirmed) {
            this.onCancel?.();
        }
        return super._onClose(_options);
    }

    _onClickAction(event: PointerEvent, target: HTMLElement): void {
        const action = target.dataset.action;
        if (action === "post") {
            event.preventDefault();
            this.#handlePost();
        } else if (action === "cancel") {
            event.preventDefault();
            this.close();
        }
    }

    #onSubmit(event: Event): void {
        event.preventDefault();
        this.#handlePost();
    }

    #handlePost(): void {
        const form = this.element.querySelector("form") as HTMLFormElement;
        if (!form) return;
        const textarea = form.querySelector(
            'textarea[name="post-content"]',
        ) as HTMLTextAreaElement;
        if (!textarea) return;

        const content = textarea.value.trim();
        if (!content) return;

        this.#wasConfirmed = true;
        this.onPost({ content, embeds: this.#embeds });
        this.close();
    }

    static async showDialog(
        options: CreatePostDialogOptions,
    ): Promise<CreatePostDialogResult> {
        return new Promise((resolve, reject) => {
            const dialog = new CreatePostDialog({
                ...options,
                onPost: (result: CreatePostDialogResult) => {
                    resolve(result);
                },
                onCancel: () => {
                    reject(new Error("Dialog cancelled"));
                },
            });
            dialog.render(true);
        });
    }
}
