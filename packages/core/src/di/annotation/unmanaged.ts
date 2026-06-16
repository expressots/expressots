import * as METADATA_KEY from "../constants/metadata_keys.js";
import { Metadata } from "../planning/metadata.js";
import { tagParameter, DecoratorTarget } from "./decorator_utils.js";

function unmanaged() {
  return function (
    target: DecoratorTarget,
    targetKey: string | undefined,
    index: number,
  ): void {
    const metadata = new Metadata(METADATA_KEY.UNMANAGED_TAG, true);
    tagParameter(target, targetKey, index, metadata);
  };
}

export { unmanaged };
