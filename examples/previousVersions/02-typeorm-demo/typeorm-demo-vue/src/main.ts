import { createApp } from "vue";
import { createPinia } from "pinia";
import { library } from "@fortawesome/fontawesome-svg-core";
import { fab } from "@fortawesome/free-brands-svg-icons";
import { fas } from "@fortawesome/free-solid-svg-icons";
import { far } from "@fortawesome/free-regular-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import Notifications from "@kyvg/vue3-notification";
import { autoAnimatePlugin } from "@formkit/auto-animate/vue";

import App from "./App.vue";
import { router } from "@/router";

import "./assets/main.css";

import { registerComponents } from "@/components/common";
import i18n from "@/i18n";

library.add(fab, fas, far);

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(Notifications);
app.use(autoAnimatePlugin);
app.use(i18n);

registerComponents(app);

app.component("font-awesome-icon", FontAwesomeIcon);

app.mount("#app");
