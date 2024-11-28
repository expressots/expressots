/**
 * Error thrown when an entity is not found.
 * @public API
 */
export class EntityNotFoundError extends Error {
  constructor(entityName: string, id: string) {
    super(`${entityName} with ID ${id} not found.`);
    this.name = "EntityNotFoundError";
  }
}

/**
 * Error thrown when an entity already exists.
 * @public API
 */
export class EntityAlreadyExistsError extends Error {
  constructor(entityName: string, id: string) {
    super(`${entityName} with ID ${id} already exists.`);
    this.name = "EntityAlreadyExistsError";
  }
}
