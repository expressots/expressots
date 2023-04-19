import type { LocaleObject } from "@/types";
import * as locale from "yup/lib/locale";

/**
 * Replaces all `${path}` by `{label}` and remove all "$" of "${}" to be compatible with vue-i18n
 */
function parse(locale: LocaleObject): LocaleObject {
  const result = Object.entries(locale).map(([key, value]) => {
    if (typeof value === "string") {
      value = value.replaceAll("${path}", "{label}").replaceAll("${", "{");
    } else if (value && typeof value === "object") {
      value = parse(value);
    }

    return [key, value];
  });

  return Object.fromEntries(result);
}

const fieldMessages: LocaleObject = parse({
  ...locale,
  mixed: {
    ...locale.mixed,
    notType:
      "{label} must be a `{type}` type, but the final value was: `{finalValue}`{cast}.{nullable}",
    cast: "(cast from the value `{value}`)",
    nullable:
      'If "null" is intended as an empty value be sure to mark the schema as `.nullable()`',
  },
});

export default fieldMessages;
