import {
  XPage,
  XButton,
  XSelect,
  XInput,
  XTextarea,
  XAlert,
  XPagination,
  XDialog,
  XTable,
  XSwitch,
  XTooltip,
  XBadge,
} from "@/components";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

declare module "@vue/runtime-core" {
  export interface GlobalComponents {
    XPage: typeof XPage;
    XButton: typeof XButton;
    XSelect: typeof XSelect;
    XInput: typeof XInput;
    XTextarea: typeof XTextarea;
    XAlert: typeof XAlert;
    XPagination: typeof XPagination;
    XDialog: typeof XDialog;
    XTable: typeof XTable;
    XSwitch: typeof XSwitch;
    XTooltip: typeof XTooltip;
    XBadge: typeof XBadge;
    FontAwesomeIcon: typeof FontAwesomeIcon;
  }
}

export {};
