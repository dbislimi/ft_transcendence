#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"
HOSTNAME=$(hostname)

if [ -f "$ENV_FILE" ] && grep -q "^HOSTNAME=" "$ENV_FILE"; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|^HOSTNAME=.*|HOSTNAME=$HOSTNAME|" "$ENV_FILE"
    else
        sed -i "s|^HOSTNAME=.*|HOSTNAME=$HOSTNAME|" "$ENV_FILE"
    fi
else
    echo "HOSTNAME=$HOSTNAME" > "$ENV_FILE"
fi

echo "Hostname configure: $HOSTNAME"