#!/bin/bash

CERT_DIR="./certs"
CERT_FILE="$CERT_DIR/cert.pem"
KEY_FILE="$CERT_DIR/key.pem"

mkdir -p "$CERT_DIR"

if [ ! -f "$CERT_FILE" ] || [ ! -f "$KEY_FILE" ]; then
    echo "🔐 Génération des certificats SSL..."
    openssl req -x509 -newkey rsa:4096 \
        -keyout "$KEY_FILE" \
        -out "$CERT_FILE" \
        -days 365 -nodes \
        -subj "/C=FR/ST=Nice/L=Nice/O=42/OU=Student/CN=localhost"
    
    chmod 600 "$KEY_FILE"
    chmod 644 "$CERT_FILE"
    
    echo "✅ Certificats générés dans $CERT_DIR"
else
    echo "✅ Certificats déjà présents"
fi