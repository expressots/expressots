import { ROUTE_NAMES } from "@/enums";
import type { RouteRecordRaw } from "vue-router";

export interface RouteList {
  name: string;
  url: { name: ROUTE_NAMES };
}

export function getRoutePath(routeName: ROUTE_NAMES): string | null {
  const route = routes.find((route) => route.name === routeName);

  return route?.path || null;
}

export const routes: Readonly<RouteRecordRaw[]> = [
  {
    path: "/",
    name: ROUTE_NAMES.HOME,
    component: () => import("@/views/HomeView.vue"),
  },
  {
    path: "/movies",
    name: ROUTE_NAMES.MOVIE,
    component: () => import("@/views/movie/IndexView.vue"),
  },
  {
    path: "/movie/:id",
    name: ROUTE_NAMES.MOVIE_UPDATE,
    component: () => import("@/views/movie/UpdateView.vue"),
  },
  {
    path: "/movie/create",
    name: ROUTE_NAMES.MOVIE_CREATE,
    component: () => import("@/views/movie/CreateView.vue"),
  },
  {
    path: "/:pathMatch(.*)*",
    name: ROUTE_NAMES.NOT_FOUND,
    component: () => import("@/views/404.vue"),
  },
];
