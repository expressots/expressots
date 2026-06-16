<template>
  <div class="p-1 inline-flex items-center">
    <font-awesome-icon
      icon="fa-solid fa-moon"
      size="xl"
      class="text-gray-500 dark:text-gray-400"
    />
    <x-switch v-model="isLightTheme" />
    <font-awesome-icon
      icon="fa-solid fa-sun"
      size="xl"
      class="text-yellow-500 dark:text-yellow-400"
    />
  </div>
</template>
<script setup lang="ts">
import { onBeforeMount, ref, watch } from "vue";

const isLightTheme = ref<undefined | boolean>(undefined);

onBeforeMount(() => {
  let preferredTheme = localStorage.getItem("user-theme");

  if (!preferredTheme) {
    preferredTheme = matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  isLightTheme.value = preferredTheme === "light";
});

watch(isLightTheme, (bool) => {
  const theme = bool ? "light" : "dark";

  localStorage.setItem("user-theme", theme);
  document.documentElement.className = theme;
});
</script>
