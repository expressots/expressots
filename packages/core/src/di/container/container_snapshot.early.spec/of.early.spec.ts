// Unit tests for: ContainerSnapshot.of

import { ContainerSnapshot } from "../container_snapshot";
import { interfaces } from "../../interfaces/interfaces";

describe("ContainerSnapshot.of() of static method", () => {
  describe("Happy Path", () => {
    it("should create a ContainerSnapshot instance", () => {
      // Arrange
      const bindings = {} as interfaces.Lookup<interfaces.Binding<unknown>>;
      const middleware = null;
      const activations = {} as interfaces.Lookup<interfaces.BindingActivation<unknown>>;
      const deactivations = {} as interfaces.Lookup<interfaces.BindingDeactivation<unknown>>;
      const moduleActivationStore = {} as interfaces.ModuleActivationStore;

      // Act
      const snapshot = ContainerSnapshot.of(
        bindings,
        middleware,
        activations,
        deactivations,
        moduleActivationStore,
      );

      // Assert
      expect(snapshot).toBeInstanceOf(ContainerSnapshot);
      expect(snapshot.bindings).toBe(bindings);
      expect(snapshot.middleware).toBe(middleware);
      expect(snapshot.activations).toBe(activations);
      expect(snapshot.deactivations).toBe(deactivations);
      expect(snapshot.moduleActivationStore).toBe(moduleActivationStore);
    });
  });
});

// End of unit tests for: ContainerSnapshot.of

