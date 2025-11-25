import { computed } from 'vue'
import { useAuth } from '@/composables/useAuth'
import type { CollectionManagement } from '@/utils/types'

export function useCollectionAccess(collection: CollectionManagement) {
  const { user } = useAuth()

  const isOwner = computed(() => user.value?.id === collection.owner_id)

  const delegate = computed(() =>
    collection.delegates?.find(d => d.user_id === user.value?.id)
  )

  const canView = computed(() =>
    isOwner.value || delegate.value?.can_view === true
  )

  const canEdit = computed(() =>
    isOwner.value || delegate.value?.can_edit === true
  )

  const canShare = computed(() =>
    isOwner.value || delegate.value?.can_share === true
  )

  return { isOwner, canView, canEdit, canShare }
}
