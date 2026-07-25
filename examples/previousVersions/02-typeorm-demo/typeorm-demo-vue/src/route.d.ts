type Layout = "empty" | "main";

declare module "vue-router" {
  interface RouteMeta {
    layout?: Layout;
  }
}

export {};
