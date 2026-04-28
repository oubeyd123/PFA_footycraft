FROM php:8.2-cli-bookworm

RUN apt-get update && apt-get install -y \
    libpq-dev \
    postgresql-client \
    python3 \
    python3-pip \
    python3-venv \
    && docker-php-ext-install pdo pdo_pgsql \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt ./
RUN python3 -m venv /opt/venv && \
    /opt/venv/bin/pip install --no-cache-dir --upgrade pip && \
    /opt/venv/bin/pip install --no-cache-dir -r requirements.txt

ENV PATH="/opt/venv/bin:$PATH"

COPY . .

EXPOSE 5000 8000 8787

CMD ["php", "-S", "0.0.0.0:5000", "/app/backend/php/index.php"]
