<template>
  <footer
    class="py-3 px-3 md:px-10 bg-white dark:bg-gray-800 text-slate-700 dark:text-white text-center"
  >
    <div class="font-medium">
      <a href="https://expresso-ts.com" target="_blank"> Expresso TS </a>
      © {{ currentYear }}
    </div>
  </footer>
</template>

<script setup lang="ts">
const currentYear = new Date().getFullYear();
</script>
