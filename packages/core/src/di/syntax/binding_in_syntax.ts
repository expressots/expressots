import { Scope } from "../constants/literal_types";
import { interfaces } from "../interfaces/interfaces";
import { BindingWhenOnSyntax } from "./binding_when_on_syntax";

class BindingInSyntax<T> implements interfaces.BindingInSyntax<T> {
  private _binding: interfaces.Binding<T>;

  public constructor(binding: interfaces.Binding<T>) {
    this._binding = binding;
  }

  public inRequestScope(): interfaces.BindingWhenOnSyntax<T> {
    this._binding.scope = Scope.Request;
    return new BindingWhenOnSyntax<T>(this._binding);
  }

  public inSingletonScope(): interfaces.BindingWhenOnSyntax<T> {
    this._binding.scope = Scope.Singleton;
    return new BindingWhenOnSyntax<T>(this._binding);
  }

  public inTransientScope(): interfaces.BindingWhenOnSyntax<T> {
    this._binding.scope = Scope.Transient;
    return new BindingWhenOnSyntax<T>(this._binding);
  }

  public inScope(scope: string): interfaces.BindingWhenOnSyntax<T> {
    // Validate that custom scope name doesn't conflict with built-in scopes
    if (
      scope === Scope.Singleton ||
      scope === Scope.Request ||
      scope === Scope.Transient
    ) {
      throw new Error(
        `Cannot use built-in scope name "${scope}" as custom scope. Use the corresponding method instead (e.g., inSingletonScope()).`,
      );
    }
    this._binding.scope = scope;
    return new BindingWhenOnSyntax<T>(this._binding);
  }
}

export { BindingInSyntax };
