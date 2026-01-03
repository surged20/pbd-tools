// Actor Alias Dialog using ApplicationV2 framework for editing actor aliases before export

// Runtime globals available in Foundry
declare const foundry: any;

export interface ActorAliasData {
    name: string;
    originalAlias: string;
    editedAlias?: string;
    actor: any; // ActorPF2e
}

interface ActorAliasDialogOptions {
    title: string;
    actors: ActorAliasData[];
    onConfirm: (actors: ActorAliasData[]) => void;
    onCancel?: () => void;
}

export class ActorAliasDialog extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
    static DEFAULT_OPTIONS = {
        id: "actor-alias-dialog-{id}",
        classes: ["dialog", "pbd-tools-alias-dialog"],
        tag: "dialog",
        window: {
            title: "Edit Actor Aliases",
            icon: "fas fa-edit",
            minimizable: false,
            resizable: true
        },
        position: {
            width: 600,
            height: "auto"
        },
        actions: {
            export: ActorAliasDialog.#onExport,
            cancel: ActorAliasDialog.#onCancel
        }
    };

    actors: ActorAliasData[];
    onConfirm: (actors: ActorAliasData[]) => void;
    onCancel?: () => void;

    constructor(options: ActorAliasDialogOptions) {
        super({
            window: {
                title: options.title
            }
        });
        this.actors = options.actors;
        this.onConfirm = options.onConfirm;
        this.onCancel = options.onCancel;
    }

    async _prepareContext(_options: any) {
        return {
            actors: this.actors
        };
    }

    _onRender(_context: any, _options: any) {
        super._onRender(_context, _options);

        // Inject styles
        this.#injectStyles();

        // Set up form submission handler
        const form = this.element.querySelector("form");
        if (form) {
            form.addEventListener("submit", this.#onSubmit.bind(this));
        }
    }

    #injectStyles() {
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

    _onClose(_options: any) {
        this.onCancel?.();
        return super._onClose(_options);
    }

    static async #onExport(event: Event, target: HTMLElement) {
        const dialog = (target.closest(".application") as any)?.app;
        if (dialog) {
            event.preventDefault();
            dialog.#handleExport();
        }
    }

    static async #onCancel(event: Event, target: HTMLElement) {
        const dialog = (target.closest(".application") as any)?.app;
        if (dialog) {
            event.preventDefault();
            dialog.close();
        }
    }

    #onSubmit(event: Event) {
        event.preventDefault();
        this.#handleExport();
    }

    #handleExport() {
        const updatedNpcs = this.#extractFormData();
        this.onConfirm(updatedNpcs);
        this.close();
    }

    #extractFormData(): ActorAliasData[] {
        const form = this.element.querySelector("form") as HTMLFormElement;
        if (!form) return this.actors;

        return this.actors.map((actor, index) => {
            const input = form.querySelector(`input[name="alias-${index}"]`) as HTMLInputElement;
            const editedAlias = input?.value || actor.originalAlias;

            return {
                ...actor,
                editedAlias: editedAlias !== actor.originalAlias ? editedAlias : undefined,
            };
        });
    }

    static PARTS = {
        form: {
            template: "modules/pbd-tools/templates/actor-alias-dialog.hbs"
        },
        footer: {
            template: "templates/generic/form-footer.hbs"
        }
    };



    static async showDialog(options: ActorAliasDialogOptions): Promise<ActorAliasData[]> {
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
