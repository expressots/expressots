import type { LocaleObject as LocaleObjectBase } from "yup/lib/locale";
import type { Message } from "yup/lib/types";

export interface LocaleObject extends Required<LocaleObjectBase> {
  mixed: LocaleObjectBase["mixed"] & {
    nullable: Message;
    cast: Message<{ value: string }>;
  };
}
