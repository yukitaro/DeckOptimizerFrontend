import { useRouter } from 'vue-router'
import type { Card, CardBackendData } from '@/utils/types'


export function useSiteWideRouter() {
    const router = useRouter()

    interface RouteToCardOptions {
        deckId?: number;
        tab?: string;
        returnToLocation?: string;
    }

    function routeToCardMetadata(card: Card, options: RouteToCardOptions) {
        if (!card || !card.card_from_set) return;
        const backend_card_data = card.card_from_set as CardBackendData;

        const { deckId, tab, returnToLocation } = options || {};

        console.log('Routing to CardMetadataDashboard for card:', backend_card_data.id + ' with slug:', backend_card_data.slug, 'set:', backend_card_data.set_name, 'number in set:', backend_card_data.number_in_set, ' with returnToLocation:', returnToLocation);
        router.push({
            name: 'CardMetadataDashboard',
            query: {
                        cardId: backend_card_data.id,
                        cardSlug: backend_card_data.slug,
                        cardSet: backend_card_data.set_name,
                        cardNumberInSet: backend_card_data.number_in_set,
                        ...(deckId && {deckId}),
                        ...(tab && {tab}),
                        ...(returnToLocation && {returnToLocation})
                    }
        });
    }

    return {
        routeToCardMetadata
    }
}