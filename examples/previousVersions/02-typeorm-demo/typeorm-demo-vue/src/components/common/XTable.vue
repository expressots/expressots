<template>
  <div class="x-table overflow-x-auto relative">
    <table class="w-full text-sm text-left text-gray-500 dark:text-gray-400">
      <thead
        class="text-xs text-gray-700 uppercase bg-slate-300 dark:bg-gray-700 dark:text-gray-400"
      >
        <tr>
          <th
            scope="col"
            :class="['py-3 px-6', headerClass]"
            v-for="({ text, headerClass }, index) in headers"
            :key="index"
          >
            {{ text }}
          </th>
        </tr>
      </thead>
      <tbody>
        <template v-if="items.length">
          <tr
            v-for="(item, index) in items"
            :key="index"
            class="bg-slate-100 border-b dark:bg-gray-800 dark:border-gray-700"
          >
            <td
              v-for="({ value, cellClass, transform }, headerIndex) in headers"
              :class="['py-2 px-6', cellClass]"
              :key="headerIndex"
            >
              <slot :name="`item.${value}`" v-bind="{ item }">
                {{
                  (transform ? transform(item) : getValue(item, value)) ?? ""
                }}
              </slot>
            </td>
          </tr>
        </template>
        <template v-else>
          <tr>
            <td
              class="py-2 px-6 bg-gray-200 text-gray-600"
              :colspan="headers.length"
            >
              Nenhum dado encontrado.
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  headers: Array<{
    text?: string;
    value: string;
    headerClass?: string;
    cellClass?: string;
    transform?: (item: any) => any;
  }>;
  items: Array<any>;
}>();

function getValue(item: (typeof props.items)[0], field: string) {
  if (field.includes(".")) {
    const args = field.split(".");
    let value: any = item;

    for (const arg of args) value = value[arg];

    return value;
  }

  return item?.[field];
}
</script>
