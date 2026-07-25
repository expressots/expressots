<template>
  <slot name="action" :on="{ click: open }" />

  <transition>
    <div
      class="x-dialog fixed z-10 inset-0 overflow-y-auto"
      v-if="modelValue || show || internalShow"
    >
      <div
        class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0"
      >
        <div
          class="fixed inset-0 transition-opacity"
          aria-hidden="true"
          @click="close"
        >
          <div class="absolute inset-0 bg-gray-600 opacity-30"></div>
        </div>

        <!-- This element is to trick the browser into centering the modal contents. -->
        <span
          class="hidden sm:inline-flex sm:align-middle sm:h-screen"
          aria-hidden="true"
        >
          &#8203;
        </span>
        <div
          class="x-dialog-modal inline-flex flex-col align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-20 sm:align-top sm:max-w-lg sm:w-full max-h-[85vh]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-headline"
          v-bind="$attrs"
        >
          <XDialogTitle :type="type" :title="title" />

          <div
            class="x-dialog-content bg-green-30 flex-1 overflow-y-auto text-gray-500 text-sm sm:items-start px-4 py-3 h-full"
          >
            <p v-if="message">{{ message }}</p>
            <slot v-else />
          </div>

          <div
            class="x-dialog-footer bg-slate-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse"
          >
            <slot
              name="footer"
              :on-cancel="{
                click: close,
                disabled: loadingCancel,
                loading: loadingCancel,
              }"
              :on-confirm="{
                click: confirm,
                disabled: loadingConfirm,
                loading: loadingConfirm,
              }"
            >
              <button
                type="button"
                @click="confirm"
                class="w-full transition-colors inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-400 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="loadingCancel"
              >
                <font-awesome-icon
                  v-if="loadingConfirm"
                  class="animate-spin text-xl text-white"
                  icon="fa-solid fa-circle-notch"
                />
                <template v-else>{{ t("confirm") }}</template>
              </button>

              <button
                v-if="cancel !== false"
                type="button"
                @click="close"
                class="mt-3 w-full transition-colors inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="loadingConfirm"
              >
                <font-awesome-icon
                  v-if="loadingCancel"
                  class="animate-spin text-xl text-gray-400"
                  icon="fa-solid fa-circle-notch"
                />
                <template v-else>{{ t("cancel") }}</template>
              </button>
            </slot>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script lang="ts">
export default {
  inheritAttrs: false,
};
</script>

<script setup lang="ts">
import debounce from "just-debounce-it";
import { ref } from "vue";
import XDialogTitle from "./XDialogTitle.vue";
import { useI18n } from "vue-i18n";

const props = withDefaults(
  defineProps<{
    type: "info" | "warn" | "danger";
    modelValue?: boolean;
    show?: boolean;
    title: string;
    message?: string;
    cancel?: false | (() => Promise<void> | void);
    confirm?: false | (() => Promise<void> | void);
  }>(),
  { cancel: undefined, confirm: undefined }
);
const emit = defineEmits<{
  (e: "update:modelValue", payload: boolean): void;
}>();
const { t } = useI18n();

/**
 * Attributes
 */

const internalShow = ref(false);
const loadingCancel = ref(false);
const loadingConfirm = ref(false);

/**
 * Functions
 */

const debounceCancel = debounce(() => {
  props.cancel && props.cancel();
  internalShow.value = false;
  emit("update:modelValue", false);
  setTimeout(() => (loadingCancel.value = false), 1000); // prevent button click while modal disappear
}, 300);
const debounceConfirm = debounce(() => {
  props.confirm && props.confirm();
  internalShow.value = false;
  emit("update:modelValue", false);
  setTimeout(() => (loadingConfirm.value = false), 1000); // prevent button click while modal disappear
}, 300);

async function close() {
  if (loadingCancel.value) return;

  loadingCancel.value = true;

  debounceCancel();
  !props.cancel && debounceCancel.flush();
}

async function confirm() {
  if (loadingConfirm.value) return;

  loadingConfirm.value = true;

  debounceConfirm();
  !props.confirm && debounceConfirm.flush();
}

async function open() {
  internalShow.value = true;
  emit("update:modelValue", true);
}
</script>

<style scoped>
.v-enter-active,
.v-leave-active {
  transition: opacity 0.5s ease;
}

.v-enter-from,
.v-leave-to {
  opacity: 0;
}
</style>

<i18n lang="json">
{
  "en-US": {
    "confirm": "Confirm",
    "cancel": "Cancel"
  },
  "pt-BR": {
    "confirm": "Confirmar",
    "cancel": "Cancelar"
  }
}
</i18n>
