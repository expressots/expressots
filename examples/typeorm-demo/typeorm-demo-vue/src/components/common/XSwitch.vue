<template>
  <div
    class="relative inline-block w-10 mx-2 align-middle select-none transition duration-200 ease-in cursor-pointer"
    @click="(e) => $emit('update:modelValue', !modelValue)"
  >
    <div
      :class="[
        { 'translate-x-[65%]': modelValue },
        `transition-transform duration-200 absolute block w-6 h-6 rounded-full bg-gray-400 border-white dark:border-gray-500 dark:bg-gray-400 border-4 z-[1]`,
      ]"
    />
    <label
      for="toggle"
      class="toggle-label block overflow-hidden h-6 rounded-full bg-white dark:bg-gray-500 cursor-pointer"
    ></label>
  </div>
</template>

<script setup lang="ts">
defineProps<{ modelValue?: boolean }>();

defineEmits<{
  (e: "update:modelValue", payload: boolean): void;
}>();
</script>
