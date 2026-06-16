import * as METADATA_KEY from "../constants/metadata_keys.js";
import { Metadata } from "../planning/metadata.js";
import { tagParameter, DecoratorTarget } from "./decorator_utils.js";

function targetName(name: string) {
  return function (
    target: DecoratorTarget,
    targetKey: string,
    index: number,
  ): void {
    const metadata = new Metadata(METADATA_KEY.NAME_TAG, name);
    tagParameter(target, targetKey, index, metadata);
  };
}

export { targetName };
