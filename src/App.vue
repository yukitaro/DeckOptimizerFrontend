<template>
  <nav>
    <RouterLink to="/">Search</RouterLink>
    <RouterLink to="/decks">Decks</RouterLink>
  </nav>
  <v-app>
    <v-main>
      <RouterView />
    </v-main>
    <AppFooter />
  </v-app>
</template>

<script setup>
  //
</script>
