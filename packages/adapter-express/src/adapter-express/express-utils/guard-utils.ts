import "reflect-metadata";
import { GUARD_METADATA_KEY } from "@expressots/core";
import type { GuardClass, IGuard } from "@expressots/core";
import type { NewableFunction } from "./interfaces";

/**
 * Extract guards from controller metadata
 */
export function getControllerGuards(
  constructor: NewableFunction,
): Array<GuardClass | IGuard> {
  return (
    (Reflect.getMetadata(
      GUARD_METADATA_KEY.controllerGuards,
      constructor,
    ) as Array<GuardClass | IGuard>) || []
  );
}

/**
 * Extract guards from method metadata
 */
export function getMethodGuards(
  constructor: NewableFunction,
  methodName: string | symbol,
): Array<GuardClass | IGuard> {
  return (
    (Reflect.getMetadata(
      GUARD_METADATA_KEY.methodGuards,
      constructor,
      methodName,
    ) as Array<GuardClass | IGuard>) || []
  );
}

