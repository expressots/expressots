import type { RouteList } from "@/router";
import { defineStore } from "pinia";
import { useRoute } from "vue-router";

interface StateTree {}

const useGlobalStore = defineStore("global", {
  state: (): StateTree => ({}),
  actions: {
    isActivePage(url: RouteList["url"]) {
      const route = useRoute();

      return typeof url === "object" && route.name === url.name;
    },
  },
});

export { useGlobalStore };
