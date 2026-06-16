<template>
  <form class="flex flex-col gap-2" @submit="onSubmit">
    <x-input
      class="w-full md:w-1/2"
      id="title"
      v-model="valueTitle"
      required
      :label="$t('movie.title')"
      :error="errors.title"
    />
    <x-input
      class="w-full md:w-1/2"
      id="year"
      v-model.number="valueYear"
      required
      :label="$t('movie.year')"
      :error="errors.year"
      type="number"
    />
    <x-input
      class="w-full md:w-1/2"
      id="genre"
      v-model="valueGenre"
      required
      :label="$t('movie.genre')"
      :error="errors.genre"
    />

    <x-button type="submit" data-test="update" class="w-full md:w-32">
      {{ values?.title ? t("button.update") : t("button.create") }}
    </x-button>
  </form>
</template>

<script setup lang="ts">
import type { IMovieForm } from "@/types";
import { useField, useForm } from "vee-validate";
import { useI18n } from "vue-i18n";
import { number, object, string } from "yup";

const props = defineProps<{ values?: IMovieForm }>();

const emit = defineEmits<{
  (e: "submit", payload: IMovieForm): void;
}>();

const { t } = useI18n();

const initialValues: IMovieForm = {
  title: props.values?.title || "",
  year: props.values?.year || 0,
  genre: props.values?.genre || "",
};

const validationSchema = object().shape({
  title: string().label(t("movie.title")).required(),
  year: number()
    .label(t("movie.year"))
    .typeError(t("field.mixed.default", { label: t("movie.year") }))
    .transform((value) => value || "") // avoid zero
    .required(),
  genre: string().label(t("movie.genre")).required(),
});

const { errors, handleSubmit } = useForm({
  initialValues,
  validationSchema,
});

const { value: valueTitle } = useField<string>("title");
const { value: valueYear } = useField<number>("year");
const { value: valueGenre } = useField<string>("genre");

/**
 * Functions
 */

const onSubmit = handleSubmit((values) => emit("submit", values));
</script>

<i18n lang="json">
{
  "en-US": {
    "button": {
      "update": "Update",
      "create": "Create"
    }
  },
  "pt-BR": {
    "button": {
      "update": "Atualizar",
      "create": "Criar"
    }
  }
}
</i18n>
