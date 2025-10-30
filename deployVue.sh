#!/bin/bash

echo "Building Vue app..."
npm run build

echo "Syncing dist/ to Unraid..."
rsync -av --delete -e "ssh -i ~/.ssh/id_ed25519FS" dist/ root@192.168.4.161:/mnt/user/appdata/deckoptimizer/frontend/deck-optimizer-frontend/dist/

echo "✅ Deployment complete."