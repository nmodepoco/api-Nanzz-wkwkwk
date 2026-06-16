FROM node:22-slim

RUN apt-get update && apt-get install -y \
    ffmpeg \
    fonts-noto-color-emoji \
    python3 \
    make \
    g++ \
    libnspr4 \
    libnss3 \
    libdbus-1-3 \
    libatk-1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json .
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "start"]