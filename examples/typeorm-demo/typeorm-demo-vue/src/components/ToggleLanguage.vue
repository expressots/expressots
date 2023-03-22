<template>
  <Menu as="div" class="relative inline-block text-left">
    <MenuButton :class="dropdownClasses">
      {{ currentLanguage }}
      <font-awesome-icon icon="fa-solid fa-chevron-down" class="ml-2 text-xs" />
    </MenuButton>

    <transition
      enter-active-class="transition ease-out duration-100"
      enter-from-class="transform opacity-0 scale-95"
      enter-to-class="transform opacity-100 scale-100"
      leave-active-class="transition ease-in duration-75"
      leave-from-class="transform opacity-100 scale-100"
      leave-to-class="transform opacity-0 scale-95"
    >
      <MenuItems
        :class="[
          'absolute left-0 z-10 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none',
          menuItemsClasses,
        ]"
      >
        <div class="py-1 w-16">
          <MenuItem
            v-slot="{ active }"
            v-for="(icon, key) in languages"
            :key="key"
          >
            <button
              :class="[{ 'bg-gray-300': active }, 'w-full px-2']"
              @click="changeLocale(key)"
            >
              <span class="text-2xl">{{ icon }}</span>
            </button>
          </MenuItem>
        </div>
      </MenuItems>
    </transition>
  </Menu>
</template>

<script setup lang="ts">
import { changeLocale, type I18N_TYPE } from "@/i18n";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/vue";
import { computed } from "vue";
import { useI18n } from "vue-i18n";

interface IProps {
  position?: "top" | "bottom";
}

const props = withDefaults(defineProps<IProps>(), { position: "bottom" });

const hoverStyles = ["hover:text-black", "hover:bg-gray-100"].join(" ");
const dropdownClasses = [
  "toggle-language-button",
  "inline-flex",
  "justify-between",
  "items-center",
  "px-2",
  "text-2xl",
  "rounded-lg",
  "font-medium",
  "transition-colors",
  "text-white",
  hoverStyles,
].join(" ");

const menuItemsClasses = computed(() => {
  if (props.position === "top") {
    return "origin-bottom-right bottom-full mb-2";
  } else {
    return "origin-top-right mt-2";
  }
});

const languages = {
  "pt-BR": "🇧🇷",
  "en-US": "🇺🇸",
};

const { locale } = useI18n<I18N_TYPE>();

const currentLanguage = computed(() => languages[locale.value]);
</script>
<style scoped>
.dropdown-button[data-headlessui-state="open"] {
  background-color: theme("colors.gray.200");
  color: theme("colors.gray.800");
}
</style>
