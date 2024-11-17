/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-explicit-any */
import ProvideInWhenOnSyntax from "../syntax/provide_in_when_on_syntax";
import ProvideWhenSyntax from "../syntax/provide_when_syntax";
import ProvideOnSyntax from "../syntax/provide_on_syntax";
import ProvideInSyntax from "../syntax/provide_in_syntax";
import ProvideDoneSyntax from "../syntax/provide_done_syntax";
import interfaces from "../interfaces/interfaces";
import { interfaces as inversifyInterfaces } from "../../../di/inversify";

function fluentProvide(
  serviceIdentifier: inversifyInterfaces.ServiceIdentifier<any>,
) {
  const bindingWhenOnSyntax = (bind: inversifyInterfaces.Bind, target: any) =>
    bind<any>(serviceIdentifier).to(target);
  const bindingConstraintFunction = (
    bind: inversifyInterfaces.Bind,
    target: any,
  ) => (<any>bindingWhenOnSyntax(bind, target))._binding;
  const provideDoneSyntax = new ProvideDoneSyntax(bindingConstraintFunction);

  const provideInWhenOnSyntax: interfaces.ProvideInWhenOnSyntax<any> =
    new ProvideInWhenOnSyntax<any>(
      new ProvideInSyntax<any>(
        (bind: inversifyInterfaces.Bind, target: any) =>
          bindingWhenOnSyntax(bind, target),
        provideDoneSyntax,
      ),
      new ProvideWhenSyntax<any>(bindingWhenOnSyntax, provideDoneSyntax),
      new ProvideOnSyntax<any>(bindingWhenOnSyntax, provideDoneSyntax),
    );

  return provideInWhenOnSyntax;
}

export default fluentProvide;
