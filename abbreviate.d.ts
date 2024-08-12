declare module "abbreviate" {
    export type AbbreviateOptions = {
        length?: number;
        keepSeparators?: boolean;
        strict?: boolean;
    };
    function abbreviate(str: string, arg: AbbreviateOptions): string;
    export default abbreviate;
}
