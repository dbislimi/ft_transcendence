#!/bin/bash

CERT_DIR="./certs"
CERT_FILE="$CERT_DIR/cert.pem"
KEY_FILE="$CERT_DIR/key.pem"
ENV_FILE=".env"

HOSTNAME="localhost"
if [ -f "$ENV_FILE" ]; then
    HOSTNAME=$(grep -E "^HOSTNAME=" "$ENV_FILE" | cut -d'=' -f2 | tr -d '"' | tr -d "'" || echo "localhost")
fi
HOSTNAME=${HOSTNAME:-localhost}

mkdir -p "$CERT_DIR"

if [ ! -f "$CERT_FILE" ] || [ ! -f "$KEY_FILE" ]; then
    echo "Generation des certificats SSL pour $HOSTNAME..."
    openssl req -x509 -newkey rsa:4096 \
        -keyout "$KEY_FILE" \
        -out "$CERT_FILE" \
        -days 365 -nodes \
        -subj "/C=FR/ST=Nice/L=Nice/O=42/OU=Student/CN=$HOSTNAME"
    
    chmod 600 "$KEY_FILE"
    chmod 644 "$CERT_FILE"
    
    echo "Certificats generes dans $CERT_DIR"
else
    CERT_CN=$(openssl x509 -noout -subject -in "$CERT_FILE" 2>/dev/null | sed -n 's/.*CN=\([^,]*\).*/\1/p' || echo "")
    
    if [ "$CERT_CN" != "$HOSTNAME" ]; then
        echo "🔐 Regeneration des certificats pour $HOSTNAME..."
        openssl req -x509 -newkey rsa:4096 \
            -keyout "$KEY_FILE" \
            -out "$CERT_FILE" \
            -days 365 -nodes \
            -subj "/C=FR/ST=Nice/L=Nice/O=42/OU=Student/CN=$HOSTNAME"
        
        chmod 600 "$KEY_FILE"
        chmod 644 "$CERT_FILE"
        echo "Certificats regeneres"
    fi
fi