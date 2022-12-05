<script setup lang="ts">
import { ref, computed } from 'vue'
import { useFetch, useThrottle } from '@vueuse/core'
import PackageItem from './PackageItem.vue'

const query = ref('')
const thorttledQuery = useThrottle(query, 1000)
const url = computed(() => `https://api.cdnjs.com/libraries?search=${thorttledQuery.value}&fields=name,description,version&limit=30`)
const { data } = useFetch(url, { refetch: true }).json().get()

const isOpen = ref(false)
</script>

<template>
  <div>
    <div h="20" flex="~ row" items="center" p="x-4" space="x-4">
      <Textfield v-model="query" h="12" placeholder="Search Packages...">
        <carbon-search />
      </Textfield>
      <Button h="12" border="1 dark-900 rounded" @click="isOpen = true">
        Manually Install
      </Button>
    </div>

    <div v-if="data && data.results" p="x-4 y-2" space="y-4">
      <PackageItem
        v-for="item in data.results"
        v-bind="item"
        :key="item.name"
        source="esm.sh"
      />
    </div>
  </div>
  <ManuallyInstallPackage v-model="isOpen" />
</template>
