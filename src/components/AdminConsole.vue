<template>
  <v-container>
    <h1 class="text-h5 font-weight-bold mb-4">Admin Console</h1>

    <v-row>
      <v-col cols="12" md="6">
        <v-card to="/adminconsole/image-coverage" class="hoverable">
          <v-card-title>Image Coverage Dashboard</v-card-title>
          <v-card-text>View image hydration stats across sets</v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card to="/adminconsole/data-coverage" class="hoverable">
          <v-card-title>Data Coverage Dashboard</v-card-title>
          <v-card-text>View metadata, normalization, and image coverage</v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
