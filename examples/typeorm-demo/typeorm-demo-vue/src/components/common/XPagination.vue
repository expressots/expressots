<template>
  <div
    class="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6"
    v-show="totalPage > 1"
  >
    <div class="flex flex-1 justify-between sm:hidden">
      <button
        class="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        @click="prev"
      >
        Anterior
      </button>
      <button
        class="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        @click="next"
      >
        Próximo
      </button>
    </div>
    <div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-center">
      <div>
        <nav
          class="isolate inline-flex -space-x-px rounded-md shadow-sm"
          aria-label="Paginação"
        >
          <button
            :class="[
              'relative inline-flex items-center rounded-l-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 focus:z-20',
              { 'cursor-not-allowed text-gray-300 border-gray-200': !canPrev },
            ]"
            @click="prev"
            :disabled="!canPrev"
          >
            <span class="sr-only">Anterior</span>
            <font-awesome-icon
              icon="fa-solid fa-chevron-left"
              class="text-xs px-2"
              aria-hidden="true"
            />
          </button>

          <template v-for="(page, index) in pages" :key="index">
            <button
              v-if="typeof page.value === 'number'"
              :class="page.class"
              @click="to(page.value as number)"
            >
              {{ page.value }}
            </button>
            <span :class="page.class" v-else>
              {{ page.value }}
            </span>
          </template>

          <button
            :class="[
              'relative inline-flex items-center rounded-r-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 focus:z-20',
              { 'cursor-not-allowed text-gray-300 border-gray-200': !canNext },
            ]"
            @click="next"
            :disabled="!canNext"
          >
            <span class="sr-only">Próximo</span>
            <font-awesome-icon
              icon="fa-solid fa-chevron-right"
              class="text-xs px-2"
              aria-hidden="true"
            />
          </button>
        </nav>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Meta } from "@/types";
import { computed } from "vue";

const props = defineProps<{
  meta: Meta;
}>();
const emit = defineEmits<{ (e: "change", payload: Meta): void }>();

/**
 * Attributes
 */

const normalClass =
  "relative inline-flex items-center border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 focus:z-20";
const activeClass = "z-10 bg-indigo-50 border-indigo-500 text-indigo-600";
const responsiveClass =
  "relative hidden items-center border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 focus:z-20 md:inline-flex";

/**
 * Functions
 */

function prev() {
  if (!canPrev.value) return;

  to(currentPage.value - 1);
}

function next() {
  if (!canNext.value) return;

  to(currentPage.value + 1);
}

function to(page: number) {
  if (page < 1 || page > totalPage.value) return;

  const meta = Object.assign(
    { ...props.meta },
    { "x-pagination-current-page": page.toString() }
  );

  emit("change", meta);
}

/**
 * Computed
 */

const currentPage = computed(() =>
  Number(props.meta["x-pagination-current-page"])
);
const totalPage = computed(() => Number(props.meta["x-pagination-page-count"]));
const pages = computed(() => {
  let values: Array<number | string> = Array(totalPage.value)
    .fill(null)
    .map((_, index) => index + 1);

  if (currentPage.value > 2) {
    values = values.slice(currentPage.value - 2);
  }

  let _pages: Array<{ value: number | string; class: Array<string> }>;

  // limit to 6 elements ( 3 first and 3 lasts )
  if (values.length > 6) {
    values.splice(3, values.length - 6);
    values.splice(3, 0, "...");

    // add class
    _pages = values.map((value, index) => {
      const classes = [normalClass];

      if ([2, 4].includes(index)) {
        classes.push(responsiveClass);
      }

      if (value === currentPage.value) {
        classes.push(activeClass);
      }

      return {
        value,
        class: classes,
      };
    });
  } else {
    // add class
    _pages = values.map((value) => {
      const classes = [normalClass];

      if (value === currentPage.value) classes.push(activeClass);

      return { value, class: classes };
    });
  }

  return _pages;
});
const canPrev = computed(() => currentPage.value > 1);
const canNext = computed(() => currentPage.value !== totalPage.value);
</script>
