/* eslint-disable @typescript-eslint/no-explicit-any */
import { decorate, interfaces } from "../../inversify";
import provide from "../decorator/provide";

function autoProvide(
  container: interfaces.Container,
  ...modules: Array<any>
): void {
  modules.forEach((module) => {
    Object.keys(module).forEach((key) => {
      const entity = module[key];
      const decorator = provide(entity);
      decorate(decorator, entity);
    });
  });
}

export default autoProvide;
