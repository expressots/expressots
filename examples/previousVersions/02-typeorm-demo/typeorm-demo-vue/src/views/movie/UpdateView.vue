<template>
  <x-page>
    <MovieForm v-if="movie" :values="movie" @submit="onSubmit" />
  </x-page>
</template>

<!-- <script lang="ts">
export default {
  beforeRouteEnter(to, from, next) {
    //const movieStore = useMovieStore();

    const id = Number(to.params.id);
    const exist = movieStore.findById(id);

    // if user not exist, redirect to 404 page
    if (!exist) {
      return next({
        name: ROUTE_NAMES.NOT_FOUND,
        params: {
          pathMatch: to.path.split("/").slice(1),
        },
      });
    }

    next();
  },
};
</script> -->

<script setup lang="ts">
import { MovieForm } from "@/components";
import { MovieService } from "@/services";
import type { IMovie } from "@/types";
import { onBeforeMount, ref } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();
const id = Number(route.params.id);
const movie = ref<IMovie>();
function onSubmit() {}

onBeforeMount(async () => {
  //movies.value = movieStore.movies;
  const response = await MovieService.getMovie(id);
  movie.value = response.data;
});
</script>
