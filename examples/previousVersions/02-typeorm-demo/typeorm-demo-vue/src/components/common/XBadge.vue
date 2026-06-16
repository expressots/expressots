<template>
  <div class="x-badge text-xs inline-block px-2 py-0.5 rounded-full">
    <slot />
  </div>
</template>

<style>
.x-badge {
  background-color: theme("backgroundColor.gray.200");
  color: theme("textColor.gray.800");
}
</style>
