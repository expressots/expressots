import { ROUTE_NAMES } from "@/enums";
import i18n from "@/i18n";
import type { ComputedRef } from "vue";
import { computed } from "vue";
import type { RouteList } from "./";

const t = i18n.global.t;

export const enabledRoutes: ComputedRef<Array<RouteList>> = computed(() => {
  return [
    {
      name: t("home"),
      url: { name: ROUTE_NAMES.HOME },
    },
    {
      name: t("movies"),
      url: { name: ROUTE_NAMES.MOVIE },
    },
  ];
});
