<script setup>
    import { ref } from 'vue';
    const name = ref()
</script>

<template>
    <img v-if="name===islands" src="@/assets/islands.svg"></img>
    <img v-else-if="name===plains" src="@/assets/plains.svg"></img>
    <img v-else-if="name===swamps" src="@/assets/swamps.svg"></img>
    <img v-else-if="name===mountains" src="@/assets/plains.svg"></img>
    <img v-else-if="name===forests" src="@/assets/plains.svg"></img>
</template>