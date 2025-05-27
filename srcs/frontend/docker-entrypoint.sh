#!/bin/sh
set -e

cd app

# Only scaffold if package.json doesn't exist
if [ ! -f "/app/package.json" ]; then

  npm install tailwindcss @tailwindcss/vite

  npm install
  npm install -D tailwindcss
  npx tailwindcss init -p


  # Configure Tailwind
  sed -i 's/content: \[\]/content: ["index.html", "src\\/\\*\\*\\/*.{js,ts,jsx,tsx}"]/' tailwind.config.js
  echo "@tailwind base;\n@tailwind components;\n@tailwind utilities;" > src/index.css


fi

cd /app
echo "🚀 Starting dev server..."
npm run dev -- --host
