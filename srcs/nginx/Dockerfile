FROM nginx:alpine

RUN apk add --no-cache wget

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create log directory
RUN mkdir -p /var/log/nginx

# Expose HTTPS port
EXPOSE 443

CMD ["sh", "-c", "sed -i \"s|server_name localhost;|server_name ${HOSTNAME:-localhost};|\" /etc/nginx/nginx.conf && sed -i \"s|\\${VITE_PORT}|${VITE_PORT:-5173}|g\" /etc/nginx/nginx.conf && nginx -g 'daemon off;'"]