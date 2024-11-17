import * as ERROR_MSGS from "../constants/error_msgs";
import * as METADATA_KEY from "../constants/metadata_keys";
import { interfaces } from "../interfaces/interfaces";
import { getFirstArrayDuplicate } from "../utils/js";

function targetIsConstructorFunction<T = NonNullable<unknown>>(
  target: DecoratorTarget<T>,
): target is ConstructorFunction<T> {
  return (target as ConstructorFunction<T>).prototype !== undefined;
}

type Prototype<T> = {
  [Property in keyof T]: T[Property] extends NewableFunction
    ? T[Property]
    : T[Property] | undefined;
} & { constructor: NewableFunction };

interface ConstructorFunction<T = Record<string, unknown>> {
  new (...args: Array<unknown>): T;
  prototype: Prototype<T>;
}

export type DecoratorTarget<T = unknown> =
  | ConstructorFunction<T>
  | Prototype<T>;

function _throwIfMethodParameter(
  parameterName: string | symbol | undefined,
): void {
  if (parameterName !== undefined) {
    throw new Error(ERROR_MSGS.INVALID_DECORATOR_OPERATION);
  }
}

function tagParameter(
  annotationTarget: DecoratorTarget,
  parameterName: string | symbol | undefined,
  parameterIndex: number,
  metadata: interfaces.MetadataOrMetadataArray,
): void {
  _throwIfMethodParameter(parameterName);
  _tagParameterOrProperty(
    METADATA_KEY.TAGGED,
    annotationTarget as ConstructorFunction,
    parameterIndex.toString(),
    metadata,
  );
}

function tagProperty(
  annotationTarget: DecoratorTarget,
  propertyName: string | symbol,
  metadata: interfaces.MetadataOrMetadataArray,
): void {
  if (targetIsConstructorFunction(annotationTarget)) {
    throw new Error(ERROR_MSGS.INVALID_DECORATOR_OPERATION);
  }
  _tagParameterOrProperty(
    METADATA_KEY.TAGGED_PROP,
    annotationTarget.constructor,
    propertyName,
    metadata,
  );
}

function _ensureNoMetadataKeyDuplicates(
  metadata: interfaces.MetadataOrMetadataArray,
): Array<interfaces.Metadata> {
  let metadatas: Array<interfaces.Metadata> = [];
  if (Array.isArray(metadata)) {
    metadatas = metadata;
    const duplicate = getFirstArrayDuplicate(metadatas.map((md) => md.key));
    if (duplicate !== undefined) {
      throw new Error(
        `${ERROR_MSGS.DUPLICATED_METADATA} ${duplicate.toString()}`,
      );
    }
  } else {
    metadatas = [metadata];
  }
  return metadatas;
}

function _tagParameterOrProperty(
  metadataKey: string,
  annotationTarget: NewableFunction,
  key: string | symbol,
  metadata: interfaces.MetadataOrMetadataArray,
): void {
  const metadatas: Array<interfaces.Metadata> =
    _ensureNoMetadataKeyDuplicates(metadata);

  let paramsOrPropertiesMetadata: Record<
    string | symbol,
    Array<interfaces.Metadata> | undefined
  > = {};
  // read metadata if available
  if (Reflect.hasOwnMetadata(metadataKey, annotationTarget)) {
    paramsOrPropertiesMetadata = Reflect.getMetadata(
      metadataKey,
      annotationTarget,
    );
  }

  let paramOrPropertyMetadata: Array<interfaces.Metadata> | undefined =
    paramsOrPropertiesMetadata[key as string];

  if (paramOrPropertyMetadata === undefined) {
    paramOrPropertyMetadata = [];
  } else {
    for (const m of paramOrPropertyMetadata) {
      if (metadatas.some((md) => md.key === m.key)) {
        throw new Error(
          `${ERROR_MSGS.DUPLICATED_METADATA} ${m.key.toString()}`,
        );
      }
    }
  }

  // set metadata
  paramOrPropertyMetadata.push(...metadatas);
  paramsOrPropertiesMetadata[key] = paramOrPropertyMetadata;
  Reflect.defineMetadata(
    metadataKey,
    paramsOrPropertiesMetadata,
    annotationTarget,
  );
}

function createTaggedDecorator(metadata: interfaces.MetadataOrMetadataArray) {
  return <T>(
    target: DecoratorTarget,
    targetKey?: string | symbol,
    indexOrPropertyDescriptor?: number | TypedPropertyDescriptor<T>,
  ): void => {
    if (typeof indexOrPropertyDescriptor === "number") {
      tagParameter(target, targetKey, indexOrPropertyDescriptor, metadata);
    } else {
      tagProperty(target, targetKey as string | symbol, metadata);
    }
  };
}

function _decorate(
  decorators: Array<DecoratorTarget | ParameterDecorator | MethodDecorator>,
  target: object | NewableFunction,
): void {
  Reflect.decorate(
    decorators as Array<ClassDecorator>,
    target as NewableFunction,
  );
}

function _param(paramIndex: number, decorator: ParameterDecorator) {
  return function (target: string, key: string): void {
    decorator(target, key, paramIndex);
  };
}

// Allows VanillaJS developers to use decorators:
// decorate(injectable(), FooBar);
// decorate(targetName('foo', 'bar'), FooBar);
// decorate(named('foo'), FooBar, 0);
// decorate(tagged('bar'), FooBar, 1);
function decorate(
  decorator: DecoratorTarget | ParameterDecorator | MethodDecorator,
  target: object,
  parameterIndexOrProperty?: number | string,
): void {
  if (typeof parameterIndexOrProperty === "number") {
    _decorate(
      [_param(parameterIndexOrProperty, decorator as ParameterDecorator)],
      target,
    );
  } else if (typeof parameterIndexOrProperty === "string") {
    Reflect.decorate(
      [decorator as MethodDecorator],
      target,
      parameterIndexOrProperty,
    );
  } else {
    _decorate([decorator], target);
  }
}

export { decorate, tagParameter, tagProperty, createTaggedDecorator };
