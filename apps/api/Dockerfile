# Base image already has Python 3.12 and uv. Slim so we don't ship extra Debian stuff.
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

WORKDIR /app

# Compile bytecode now so startup isn't paying for it later.
# Copy into .venv instead of hardlinking — hardlinks get weird in Docker layers.
# We're not installing tomo as a package (package = false), so PYTHONPATH has to
# point here or `from tomo...` breaks. PATH so we can call uvicorn from the venv.
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PYTHONPATH=/app \
    PATH="/app/.venv/bin:$PATH"

# Lockfiles first. If we only touch Python code, this layer stays cached.
COPY pyproject.toml uv.lock ./

# Prod deps only, exact lock. --frozen so we fail if someone forgot to uv lock.
# --no-dev: no pytest in the image. --no-cache: don't leave uv's download cache in the layer.
RUN uv sync --frozen --no-dev --no-cache

# App code. tests / .venv / .env stay out via .dockerignore.
COPY tomo ./tomo

# Local default. Railway ignores this and gives us PORT instead.
EXPOSE 8000

# exec so uvicorn is PID 1 and actually gets SIGTERM. Railway sets PORT; locally we use 8000.
CMD ["sh", "-c", "exec uvicorn tomo.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
