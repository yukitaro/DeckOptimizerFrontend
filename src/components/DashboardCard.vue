<template>
  <v-card class="mb-6 elevation-2">
    <v-card-title class="text-h6 font-weight-bold">
      <slot name="title" />
    </v-card-title>
    <v-card-text>
      <slot />
    </v-card-text>
  </v-card>
</template>