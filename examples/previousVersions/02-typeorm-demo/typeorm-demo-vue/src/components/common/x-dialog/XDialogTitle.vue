<template>
  <div class="x-dialog-title flex gap-x-2 w-full py-3 px-4 border-b">
    <div
      v-if="type === 'info'"
      class="inline-flex flex-shrink-0 items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10"
    >
      <font-awesome-icon
        icon="fa-solid fa-circle-info"
        class="text-blue-400 text-xl"
      />
    </div>
    <div
      v-else-if="type === 'warn'"
      class="inline-flex flex-shrink-0 items-center justify-center h-12 w-12 rounded-full bg-yellow-100 sm:mx-0 sm:h-10 sm:w-10"
    >
      <font-awesome-icon
        icon="fa-solid fa-triangle-exclamation"
        class="text-yellow-400 text-xl"
      />
    </div>
    <div
      v-else-if="type === 'danger'"
      class="inline-flex flex-shrink-0 items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10"
    >
      <font-awesome-icon
        icon="fa-solid fa-circle-exclamation"
        class="text-red-400 text-xl"
      />
    </div>

    <h3
      class="flex-1 flex items-center text-lg leading-6 font-medium text-gray-900 text-center sm:text-left"
      id="modal-headline"
    >
      {{ title }}
    </h3>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  type: "info" | "warn" | "danger";
  title: string;
}>();
</script>
