import { ref, computed } from 'vue';
import { getSetData } from '@/api/cardClient';

export interface ProcessedSetData {
  value: string;
  title: string;
  official_set_name: string;
}

// Module-level singleton state (shared across all components)
const setData = ref<ProcessedSetData[]>([]);
const isLoading = ref(false);
const isLoaded = ref(false);

// Cache the in-flight request promise so concurrent callers await the exact same network request
let fetchPromise: Promise<ProcessedSetData[]> | null = null;

export function useSetData() {
  async function loadSetData(): Promise<ProcessedSetData[]> {
    // If already loaded, return existing data immediately
    if (isLoaded.value) {
      return setData.value;
    }

    // If a request is already in progress, await that same request
    if (fetchPromise) {
      return fetchPromise;
    }

    isLoading.value = true;
    
    // Cache the promise executing the fetch
    fetchPromise = getSetData()
      .then((response) => {
        setData.value = response;
        isLoaded.value = true;
        return response;
      })
      .finally(() => {
        isLoading.value = false;
        fetchPromise = null;
      });

    return fetchPromise;
  }

  // Lookup map: value -> official_set_name
  const setNameMap = computed<Record<string, string>>(() =>
    setData.value.reduce((acc, { value, official_set_name }) => {
      acc[value] = official_set_name;
      return acc;
    }, {} as Record<string, string>)
  );

  return {
    setData,
    setNameMap,
    isLoading,
    isLoaded,
    loadSetData,
  };
}