<script setup lang="ts">
import layouts from "@/layouts";
import { computed } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();

const layout = computed(() => layouts[route.meta.layout || "main"]);
</script>

<template>
  <component :is="layout" />
</template>
