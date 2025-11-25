<script setup>
import { ref } from 'vue'
import { createNewEnum } from '@/api/enumClient'
import { useEnums } from '@/composables/useEnums'

const enums = useEnums()
const newTypeSlug = ref('')
const newTypeLabel = ref('')
const newTypeSort = ref(0)
const newTypeActive = ref(true)

const submitNewIssueType = async () => {
  const resp = await createNewEnum('issue_types', {
    slug: newTypeSlug.value,
    label: newTypeLabel.value,
    sort: newTypeSort.value,
    active: newTypeActive.value,
  })
  // refresh enums store so dropdown updates
  await enums.fetchIssueTypes()
}
</script>

<template>
    <v-form @submit.prevent="submitNewIssueType">
    <v-text-field v-model="newTypeSlug" label="Slug" required />
    <v-text-field v-model="newTypeLabel" label="Label" required />
    <v-text-field v-model="newTypeSort" label="Sort Order" type="number" />
    <v-switch v-model="newTypeActive" label="Active" />

    <v-btn type="submit" color="primary">Add Issue Type</v-btn>
    </v-form>
</template>