<template>
  <span :tooltip="text" :position="position">
    <slot />
  </span>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    text: string;
    position?: "top" | "right" | "bottom" | "left";
  }>(),
  { position: "top" }
);
</script>
