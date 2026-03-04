#!/bin/bash

CERT_DIR="./certs"
CERT_FILE="$CERT_DIR/cert.pem"
KEY_FILE="$CERT_DIR/key.pem"
CONFIG_FILE="$CERT_DIR/openssl.cnf"
ENV_FILE=".env"
ENV_EXAMPLE=".env.example"

# Get local IP address
LOCAL_IP=$(hostname -I | awk '{print $1}')
HOSTNAME=${LOCAL_IP:-localhost}

# Initialize .env from .env.example if it doesn't exist
if [ ! -f "$ENV_FILE" ]; then
    if [ -f "$ENV_EXAMPLE" ]; then
        cp "$ENV_EXAMPLE" "$ENV_FILE"
        echo "Fichier .env cree depuis .env.example"
        
        # Generate JWT_SECRET automatically
        if command -v openssl &> /dev/null; then
            JWT_SECRET=$(openssl rand -base64 32)
            if [[ "$OSTYPE" == "darwin"* ]]; then
                sed -i '' "s|JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|g" "$ENV_FILE"
            else
                sed -i "s|JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|g" "$ENV_FILE"
            fi
            echo "JWT_SECRET genere automatiquement"
        else
            echo "ATTENTION: Veuillez configurer JWT_SECRET dans $ENV_FILE"
        fi
    else
        echo "ATTENTION: $ENV_EXAMPLE introuvable, creation d'un .env minimal"
        touch "$ENV_FILE"
    fi
fi

# Update .env file with local IP (preserve other variables)
if [ -n "$LOCAL_IP" ]; then
    if [ -f "$ENV_FILE" ]; then
        # Preserve all variables except HOSTNAME, then add updated HOSTNAME
        grep -v "^HOSTNAME=" "$ENV_FILE" > "$ENV_FILE.tmp" 2>/dev/null || true
        echo "HOSTNAME=$LOCAL_IP" >> "$ENV_FILE.tmp"
        mv "$ENV_FILE.tmp" "$ENV_FILE"
        echo "HOSTNAME mis a jour avec IP locale: $LOCAL_IP"
    fi
fi

# Warn about missing critical variables
if [ -f "$ENV_FILE" ]; then
    if ! grep -q "^JWT_SECRET=" "$ENV_FILE" || grep -q "^JWT_SECRET=your-secret-key-here-change-me" "$ENV_FILE"; then
        echo "ATTENTION: JWT_SECRET non configure dans $ENV_FILE"
        echo "Generez-en un avec: openssl rand -base64 32"
    fi
    
    if ! grep -q "^GOOGLE_CLIENT_ID=" "$ENV_FILE" || grep -q "^GOOGLE_CLIENT_ID=your-google-client-id" "$ENV_FILE"; then
        echo "Info: GOOGLE_CLIENT_ID non configure (requis pour OAuth Google)"
    fi
fi

mkdir -p "$CERT_DIR"

# Function to generate certificates with SAN
generate_cert() {
    MACHINE_HOSTNAME=$(hostname)
    echo "Generation des certificats SSL pour $HOSTNAME (Machine: $MACHINE_HOSTNAME)..."
    
    # Create OpenSSL config with SAN
    cat > "$CONFIG_FILE" << EOF
[req]
default_bits = 4096
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = v3_req

[dn]
C=FR
ST=Nice
L=Nice
O=42
OU=Student
CN=$HOSTNAME

[v3_req]
subjectAltName = @alt_names

[alt_names]
DNS.1 = $MACHINE_HOSTNAME
DNS.2 = localhost
DNS.3 = *.42nice.fr
IP.1 = 127.0.0.1
IP.2 = $HOSTNAME
EOF

    openssl req -x509 -newkey rsa:4096 \
        -keyout "$KEY_FILE" \
        -out "$CERT_FILE" \
        -days 365 -nodes \
        -config "$CONFIG_FILE" \
        -extensions v3_req
    
    chmod 600 "$KEY_FILE"
    chmod 644 "$CERT_FILE"
    
    echo "Certificats generes dans $CERT_DIR"
}

if [ ! -f "$CERT_FILE" ] || [ ! -f "$KEY_FILE" ]; then
    generate_cert
else
    # Check if certificate has the correct CN and SAN
    CERT_CN=$(openssl x509 -noout -subject -in "$CERT_FILE" 2>/dev/null | sed -n 's/.*CN=\([^,]*\).*/\1/p' || echo "")
    CERT_SAN=$(openssl x509 -noout -text -in "$CERT_FILE" 2>/dev/null | grep -A1 "Subject Alternative Name" | tail -n1 || echo "")
    
    if [ "$CERT_CN" != "$HOSTNAME" ] || ! echo "$CERT_SAN" | grep -q "$HOSTNAME"; then
        echo "Regeneration des certificats pour $HOSTNAME avec SAN..."
        generate_cert
        echo "Certificats regeneres"
    else
        echo "Les certificats existent deja pour $HOSTNAME"
    fi
fi
