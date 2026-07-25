<template>
  <x-page>
    <div class="flex justify-between pb-2">
      <h1 class="font-medium text-2xl">
        {{ t("movies") }}
      </h1>

      <router-link
        class="x-button bg-blue-500 hover:bg-blue-600"
        :to="{ name: ROUTE_NAMES.MOVIE_CREATE }"
      >
        <font-awesome-icon icon="fa-solid fa-plus" />

        {{ t("button.create") }}
      </router-link>
    </div>

    <x-table :headers="headers" :items="movieStore.movies">
      <template #[`item.actions`]="{ item }">
        <router-link
          class="x-button bg-blue-500 hover:bg-blue-600"
          :to="{ name: ROUTE_NAMES.MOVIE_UPDATE, params: { id: item.id } }"
        >
          <font-awesome-icon icon="fa-solid fa-pen-to-square" />
        </router-link>
        <x-button
          class="bg-red-500 hover:bg-red-600"
          @click="movieStore.remove(item.id)"
        >
          <font-awesome-icon icon="fa-solid fa-ban" />
        </x-button>
      </template>
    </x-table>
  </x-page>
</template>

<script setup lang="ts">
import { ROUTE_NAMES } from "@/enums";
import { useMovieStore } from "@/stores";
import { computed, onBeforeMount, ref } from "vue";
import { useI18n } from "vue-i18n";

const movieStore = useMovieStore();
const { t } = useI18n();

const headers = computed(() => [
  { text: "ID", value: "id" },
  { text: t("movie.title"), value: "title" },
  { text: t("movie.year"), value: "year" },
  { text: t("movie.genre"), value: "genre" },
  {
    text: t("header.actions"),
    value: "actions",
    headerClass: "w-[10%]",
    cellClass: "space-x-2",
  },
]);

/** Functions */

onBeforeMount(() => {
  movieStore.loadMovies();
});
</script>
