import { provide } from "inversify-binding-decorators";

@provide(EnvValidatorProvider)
class EnvValidatorProvider {

    public static Get(key: string, defaultValue: any = undefined): any {
        return process.env[key] ?? defaultValue;
    }
}

declare global {
    interface String {
        AsBoolean(): boolean | undefined;
    }

    interface String {
        AsNumber(): number | undefined;
    }

    interface String {
        AsString(): string | undefined;
    }
}

String.prototype.AsBoolean = function (): boolean | undefined {
    switch (this.toLowerCase().trim()) {
        case "true":
        case "1":
        case "yes":
            return true;
        case "false":
        case "0":
        case "no":
            return false;
        default:
            return undefined;
    }
};

String.prototype.AsNumber = function (): number | undefined {
    return Number(this);
};

String.prototype.AsString = function (): string | undefined {
    return String(this);
};

export { EnvValidatorProvider as Environments }