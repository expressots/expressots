import XButton from "./XButton.vue";
import XInput from "./XInput.vue";
import XSelect from "./XSelect.vue";
import XAlert from "./XAlert.vue";
import XPage from "./XPage.vue";
import XPagination from "./XPagination.vue";
import XDialog from "./x-dialog/index.vue";
import XTable from "./XTable.vue";
import XSwitch from "./XSwitch.vue";
import XTooltip from "./XTooltip.vue";
import XTextarea from "./XTextarea.vue";
import XBadge from "./XBadge.vue";

import type { App } from "vue";

function registerComponents(app: App) {
  app.component("x-button", XButton);
  app.component("x-input", XInput);
  app.component("x-textarea", XTextarea);
  app.component("x-select", XSelect);
  app.component("x-alert", XAlert);
  app.component("x-page", XPage);
  app.component("x-pagination", XPagination);
  app.component("x-dialog", XDialog);
  app.component("x-table", XTable);
  app.component("x-switch", XSwitch);
  app.component("x-tooltip", XTooltip);
  app.component("x-badge", XBadge);
}

export {
  XButton,
  XInput,
  XTextarea,
  XSelect,
  XAlert,
  XPage,
  XPagination,
  XDialog,
  XTable,
  XSwitch,
  XTooltip,
  XBadge,
  registerComponents,
};
