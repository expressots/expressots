<template>
  <x-page>
    <MovieForm @submit="handleCreate" />
  </x-page>
</template>

<script setup lang="ts">
import { MovieForm } from "@/components";
import { ROUTE_NAMES } from "@/enums";
import { useMovieStore } from "@/stores";
import type { IMovieForm } from "@/types";
import { useNotification } from "@kyvg/vue3-notification";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";

const router = useRouter();
const movieStore = useMovieStore();
const notification = useNotification();
const { t } = useI18n();

async function handleCreate(values: IMovieForm) {
  await movieStore.add(values);
  notification.notify({
    title: t("movie.notification.create.title"),
    type: "success",
    text: t("movie.notification.create.text"),
  });

  await router.push({ name: ROUTE_NAMES.MOVIE });
}
</script>
