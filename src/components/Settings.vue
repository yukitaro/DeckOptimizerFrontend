<template>
  <v-container>
    <h1>Settings</h1>
    <v-list>
      <v-list-item to="/adminconsole">
        <v-list-item-title>Admin Console</v-list-item-title>
        <v-list-item-subtitle>Dashboard, enrichment audits, CLI triggers</v-list-item-subtitle>
      </v-list-item>
      <v-list-item to="/importcandidates">
        <v-list-item-title>MTG Set Import and Management</v-list-item-title>
        <v-list-item-subtitle>Dashboards and Set Management</v-list-item-subtitle>
      </v-list-item>
      <v-list-item to="/magicsetdata">
        <v-list-item-title>MTG Set Data Visualization</v-list-item-title>
        <v-list-item-subtitle>Viewable, sortable dashboard for MTG Set Data</v-list-item-subtitle>
      </v-list-item>
      <v-list-item to="/cardmetadata">
        <v-list-item-title>MTG Card Metadata Visualization</v-list-item-title>
        <v-list-item-subtitle>Viewable, sortable dashboard for MTG Card Metadata</v-list-item-subtitle>
      </v-list-item>
    </v-list>
  </v-container>
</template>