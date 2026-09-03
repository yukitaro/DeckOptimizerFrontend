<template>
  <v-container>
    <h1 class="text-h5 font-weight-bold mb-4">Admin Console</h1>
    <v-row>
      <v-col cols="12" md="6">
        <v-card to="/issues" class="hoverable">
          <v-card-title>Issue Management Dashboard</v-card-title>
          <v-card-text>View and manage issues, defects, enhancement/feature requests, etc.</v-card-text>
        </v-card>
      </v-col>
    </v-row>
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
    <v-row>
      <v-col cols="12" md="6">
        <v-card to="/adminconsole/enum-management" class="hoverable">
          <v-card-title>Enum Management Dashboard</v-card-title>
          <v-card-text>Manage global and issue-related enums</v-card-text>
        </v-card>
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12" md="6">
        <v-card to="/adminconsole/collection-data" class="hoverable">
          <v-card-title>Collection Data Dashboard</v-card-title>
          <v-card-text>View collection data</v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
