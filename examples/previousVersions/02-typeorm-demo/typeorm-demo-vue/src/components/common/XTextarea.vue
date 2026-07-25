<template>
  <div>
    <label
      v-if="label"
      :for="id"
      :class="['text-left block leading-5', { required }]"
    >
      {{ label }}
    </label>
    <textarea
      v-bind="$attrs"
      :id="id"
      :value="modelValue || value"
      class="x-textarea"
      :class="{ has_error: error }"
      :placeholder="placeholder"
      :readonly="readonly"
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
import { StringHelper } from "@/helpers";

interface IProps {
  modelValue?: string | number | undefined;

  id?: string;
  label?: string;
  value?: string;
  required?: boolean;
  placeholder?: string;
  readonly?: boolean;
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
