/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-explicit-any */
import interfaces from "../interfaces/interfaces.js";
import ProvideWhenOnSyntax from "./provide_when_on_syntax.js";
import ProvideWhenSyntax from "./provide_when_syntax.js";
import ProvideOnSyntax from "./provide_on_syntax.js";
import ProvideDoneSyntax from "./provide_done_syntax.js";
import { interfaces as inversifyInterfaces } from "../../inversify.js";

class ProvideInSyntax<T> implements interfaces.ProvideInSyntax<T> {
  private _bindingInSyntax: (
    bind: inversifyInterfaces.Bind,
    target: any,
  ) => inversifyInterfaces.BindingInSyntax<T>;
  private _provideDoneSyntax: interfaces.ProvideDoneSyntax;

  public constructor(
    bindingInSyntax: (
      bind: inversifyInterfaces.Bind,
      target: any,
    ) => inversifyInterfaces.BindingInSyntax<T>,
    provideDoneSyntax: interfaces.ProvideDoneSyntax,
  ) {
    this._bindingInSyntax = bindingInSyntax;
    this._provideDoneSyntax = provideDoneSyntax;
  }

  public inSingletonScope(): interfaces.ProvideWhenOnSyntax<T> {
    const bindingWhenOnSyntax = (bind: inversifyInterfaces.Bind, target: any) =>
      this._bindingInSyntax(bind, target).inSingletonScope();
    const inDoneSyntax = new ProvideDoneSyntax(bindingWhenOnSyntax);
    const provideWhenSyntax = new ProvideWhenSyntax<T>(
      bindingWhenOnSyntax,
      inDoneSyntax,
    );
    const provideOnSyntax = new ProvideOnSyntax<T>(
      bindingWhenOnSyntax,
      inDoneSyntax,
    );
    return new ProvideWhenOnSyntax(provideWhenSyntax, provideOnSyntax);
  }

  public inTransientScope(): interfaces.ProvideWhenOnSyntax<T> {
    const bindingWhenOnSyntax = (bind: inversifyInterfaces.Bind, target: any) =>
      this._bindingInSyntax(bind, target).inTransientScope();
    const inDoneSyntax = new ProvideDoneSyntax(bindingWhenOnSyntax);

    const provideWhenSyntax = new ProvideWhenSyntax<T>(
      bindingWhenOnSyntax,
      inDoneSyntax,
    );
    const provideOnSyntax = new ProvideOnSyntax<T>(
      bindingWhenOnSyntax,
      inDoneSyntax,
    );
    return new ProvideWhenOnSyntax(provideWhenSyntax, provideOnSyntax);
  }

  public inScope(scope: string): interfaces.ProvideWhenOnSyntax<T> {
    const bindingWhenOnSyntax = (bind: inversifyInterfaces.Bind, target: any) =>
      this._bindingInSyntax(bind, target).inScope(scope);
    const inDoneSyntax = new ProvideDoneSyntax(bindingWhenOnSyntax);

    const provideWhenSyntax = new ProvideWhenSyntax<T>(
      bindingWhenOnSyntax,
      inDoneSyntax,
    );
    const provideOnSyntax = new ProvideOnSyntax<T>(
      bindingWhenOnSyntax,
      inDoneSyntax,
    );
    return new ProvideWhenOnSyntax(provideWhenSyntax, provideOnSyntax);
  }

  public done(force?: boolean): any {
    return this._provideDoneSyntax.done(force);
  }
}

export default ProvideInSyntax;
