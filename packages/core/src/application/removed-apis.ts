/**
 * Compile-time tombstones for public names removed in v4.
 *
 * When a name is removed outright, TypeScript reports only "has no exported
 * member" and, unless the replacement is spelled similarly, offers no
 * suggestion. `AppFactory` and `bootstrap` share no letters, so anyone
 * writing v3 code from memory (a large share of AI-assisted code today)
 * gets a dead end. Keeping the name as a tombstone turns that dead end into
 * an error message that names the replacement: every call fails to compile
 * with the migration text inline, and a call that slips through at runtime
 * throws the same text.
 *
 * Only names whose replacement has no textual similarity belong here. For
 * the other v4 removals (`InMemoryDataProvider`, `LazyServiceIdentifer`)
 * the compiler already suggests the new name on its own.
 *
 * Remove in v5.
 */

const APP_FACTORY_REMOVED =
  "AppFactory was removed in ExpressoTS v4. Start the application with " +
  "`await bootstrap(App)` from @expressots/core, where App extends AppExpress. " +
  "See https://doc.expresso-ts.com/docs/core/bootstrap";

type AppFactoryRemoved = typeof APP_FACTORY_REMOVED;

/**
 * Tombstone for the v3 `AppFactory`.
 *
 * @deprecated Removed in v4. Use `await bootstrap(App)` from `@expressots/core`.
 * Any call to `AppFactory.create()` fails to compile with the migration
 * message; the runtime throws the same message.
 */
export const AppFactory: {
  /**
   * @deprecated Removed in v4. Use `await bootstrap(App)` from `@expressots/core`.
   */
  create(...args: Array<AppFactoryRemoved>): never;
} = Object.freeze({
  create(): never {
    throw new Error(APP_FACTORY_REMOVED);
  },
});
