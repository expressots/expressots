<template>
  <Menu as="li" class="relative inline-block text-left">
    <MenuButton :class="dropdownClasses">
      <font-awesome-icon icon="fa-solid fa-bars" />
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
        class="absolute left-0 z-10 mt-2 w-40 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
      >
        <div class="py-1">
          <MenuItem
            v-slot="{ active }"
            v-for="({ name, url }, index) in routes"
            :key="index"
          >
            <RouterLink
              :to="url"
              :class="[
                active ? 'bg-gray-100 text-gray-900' : 'text-gray-500',
                'block px-4 py-2 text-sm',
                { 'active text-gray-900 font-medium': isActivePage(url) },
              ]"
            >
              {{ name }}
            </RouterLink>
          </MenuItem>
        </div>
      </MenuItems>
    </transition>
  </Menu>
</template>

<script setup lang="ts">
import type { RouteList } from "@/router";
import { useGlobalStore } from "@/stores";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/vue";

interface Props {
  routes: Array<RouteList>;
}

const { isActivePage } = useGlobalStore();

const hoverStyles = ["hover:text-black", "hover:bg-gray-100"].join(" ");
const dropdownClasses = [
  "dropdown-button",
  "inline-flex",
  "justify-between",
  "px-4",
  "py-1.5",
  "border-b",
  "text-sm",
  "font-medium",
  "rounded-md",
  "transition-colors",
  "text-white",
  "shadow-sm",
  hoverStyles,
].join(" ");

defineProps<Props>();
</script>
<style scoped>
.dropdown-button[data-headlessui-state="open"] {
  background-color: theme("colors.gray.200");
  color: theme("colors.gray.800");
}
</style>
