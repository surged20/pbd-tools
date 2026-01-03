// Actor Alias Dialog using ApplicationV2 framework for editing actor aliases before export

import type { ActorPF2e } from "foundry-pf2e";

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

export interface ActorAliasData {
    name: string;
    originalAlias: string;
    editedAlias?: string;
    actor: ActorPF2e;
}

interface ActorAliasDialogOptions {
    title: string;
    actors: ActorAliasData[];
    onConfirm: (actors: ActorAliasData[]) => void;
    onCancel?: () => void;
}

export class ActorAliasDialog extends foundry.applications.api.HandlebarsApplicationMixin(
    foundry.applications.api.ApplicationV2,
) {
    static DEFAULT_OPTIONS = {
        id: "actor-alias-dialog-{id}",
        classes: ["dialog", "pbd-tools-alias-dialog"],
        tag: "dialog",
        window: {
            title: "Edit Actor Aliases",
            icon: "fas fa-edit",
            minimizable: false,
            resizable: true,
        },
        position: {
            width: 600,
            height: "auto",
        },
    };

    static PARTS = {
        form: {
            template: "modules/pbd-tools/templates/actor-alias-dialog.hbs",
        },
        footer: {
            template: "templates/generic/form-footer.hbs",
        },
    };

    actors: ActorAliasData[];
    onConfirm: (actors: ActorAliasData[]) => void;
    onCancel?: () => void;

    constructor(options: ActorAliasDialogOptions) {
        super({
            window: {
                title: options.title,
            },
        });
        this.actors = options.actors;
        this.onConfirm = options.onConfirm;
        this.onCancel = options.onCancel;
    }

    async _prepareContext(
        _options: unknown,
    ): Promise<{ actors: ActorAliasData[] }> {
        return {
            actors: this.actors,
        };
    }

    async _preparePartContext(
        partId: string,
        context: { actors: ActorAliasData[] },
    ): Promise<unknown> {
        if (partId === "footer") {
            return {
                ...context,
                buttons: [
                    {
                        type: "button",
                        icon: "fas fa-file-export",
                        label: "Export",
                        action: "export",
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

        // Inject styles
        this.#injectStyles();

        // Set up form submission handler
        const form = this.element.querySelector("form");
        if (form) {
            form.addEventListener("submit", this.#onSubmit.bind(this));
        }
    }

    #injectStyles(): void {
        const styleId = "pbd-alias-dialog-styles";
        if (!document.getElementById(styleId)) {
            const style = document.createElement("style");
            style.id = styleId;
            style.textContent = `
                .pbd-alias-dialog-content {
                    padding: 10px;
                }
                .pbd-alias-list {
                    max-height: 400px;
                    overflow-y: auto;
                    border: 1px solid var(--color-border-light-primary);
                    border-radius: 3px;
                    padding: 5px;
                }
                .pbd-alias-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 8px;
                    border-bottom: 1px solid var(--color-border-light-tertiary);
                }
                .pbd-alias-row:last-child {
                    border-bottom: none;
                }
                .actor-info {
                    display: flex;
                    align-items: center;
                    flex: 1;
                }
                .actor-avatar {
                    width: 32px;
                    height: 32px;
                    border-radius: 3px;
                    margin-right: 10px;
                }
                .actor-name {
                    font-weight: bold;
                    color: var(--color-text-dark-primary);
                }
                .alias-input {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                }
                .alias-input label {
                    font-weight: bold;
                    min-width: 40px;
                }
                .alias-input input {
                    width: 120px;
                    padding: 4px;
                    border: 1px solid var(--color-border-light-primary);
                    border-radius: 3px;
                }
            `;
            document.head.appendChild(style);
        }
    }

    _onClose(_options: unknown): void {
        this.onCancel?.();
        return super._onClose(_options);
    }

    _onClickAction(event: PointerEvent, target: HTMLElement): void {
        const action = target.dataset.action;
        if (action === "export") {
            event.preventDefault();
            this.#handleExport();
        } else if (action === "cancel") {
            event.preventDefault();
            this.close();
        }
    }

    #onSubmit(event: Event): void {
        event.preventDefault();
        this.#handleExport();
    }

    #handleExport(): void {
        const updatedNpcs = this.#extractFormData();
        this.onConfirm(updatedNpcs);
        this.close();
    }

    #extractFormData(): ActorAliasData[] {
        const form = this.element.querySelector("form") as HTMLFormElement;
        if (!form) return this.actors;

        return this.actors.map((actor, index) => {
            const input = form.querySelector(
                `input[name="alias-${index}"]`,
            ) as HTMLInputElement;
            const editedAlias = input?.value || actor.originalAlias;

            return {
                ...actor,
                editedAlias:
                    editedAlias !== actor.originalAlias
                        ? editedAlias
                        : undefined,
            };
        });
    }

    static async showDialog(
        options: ActorAliasDialogOptions,
    ): Promise<ActorAliasData[]> {
        return new Promise((resolve, reject) => {
            const dialog = new ActorAliasDialog({
                ...options,
                onConfirm: (actors) => {
                    resolve(actors);
                },
                onCancel: () => {
                    reject(new Error("Dialog cancelled"));
                },
            });
            dialog.render(true);
        });
    }
}
