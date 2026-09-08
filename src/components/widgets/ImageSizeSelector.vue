<script setup lang="ts">
// Vue 3.4+ double-bound model (defaults to 'md')
const currentSize = defineModel<string>({ default: 'md' });
</script>

<template>
    <v-btn-toggle        
        v-model="currentSize"
        mandatory
        density="compact"
        class="ml-3"
    >
        <v-btn value="sm">SM</v-btn>
        <v-btn value="md">MD</v-btn>
        <v-btn value="lg">LG</v-btn>
    </v-btn-toggle>
</template>