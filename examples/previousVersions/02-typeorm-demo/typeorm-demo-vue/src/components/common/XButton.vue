<template>
  <button :class="['x-button', { loading }]" :disabled="disabled || loading">
    <font-awesome-icon
      v-if="loading"
      class="animate-spin text-white"
      icon="fa-solid fa-circle-notch"
    />
    <slot v-else />
  </button>
</template>

<script setup lang="ts">
import type { ButtonHTMLAttributes } from "vue";

interface Props extends ButtonHTMLAttributes {
  disabled?: boolean;
  loading?: boolean;
}

defineProps<Props>();
</script>
