<template>
  <div>
    <label
      v-if="label"
      :for="id"
      class="text-left block leading-5"
      :class="{ required }"
    >
      {{ label }}
    </label>
    <input
      :id="id"
      :value="modelValue || value"
      class="x-input"
      :class="{ has_error: error }"
      :required="required"
      :placeholder="placeholder"
      :readonly="readonly"
      :type="type"
      v-bind="$attrs"
      @input="
        (e) => {
          $emit('input', e);
          $emit('update:modelValue', (e.target as HTMLInputElement).value);
        }
        "
    />
    <small v-if="!hideError" class="text-red-500 block">
      {{ error || "&nbsp;" }}
    </small>
  </div>
</template>

<script setup lang="ts">
import type { Ref } from "vue";
import { StringHelper } from "@/helpers";

type InputTypes =
  | "button"
  | "checkbox"
  | "color"
  | "date"
  | "datetime-local"
  | "email"
  | "file"
  | "hidden"
  | "image"
  | "month"
  | "number"
  | "password"
  | "radio"
  | "range"
  | "reset"
  | "search"
  | "submit"
  | "tel"
  | "text"
  | "time"
  | "url"
  | "week";

interface IProps {
  modelValue?: string | null | number | Ref<string | number> | undefined;

  id?: string;
  label?: string;
  value?: string | null;
  required?: boolean;
  placeholder?: string;
  readonly?: boolean;
  type?: InputTypes;
  error?: string | undefined;

  hideError?: boolean;
}

interface IEmit {
  (e: "input", payload: Event): void;
  (e: "update:modelValue", payload: string): void;
}

withDefaults(defineProps<IProps>(), {
  id: () => StringHelper.randomString(),
  modelValue: "",
  value: "",
  type: "text",
  label: undefined,
  placeholder: undefined,
  error: undefined,
});

defineEmits<IEmit>();
</script>

<script lang="ts">
export default {
  inheritAttrs: false,
};
</script>
