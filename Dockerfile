# --- Frontend build stage ---
FROM node:20-alpine AS frontend
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# --- Go backend build stage ---
FROM golang:1.23-alpine AS builder
WORKDIR /app
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ ./
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o server ./cmd/server

# --- Runtime stage ---
FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/server ./server
RUN mkdir -p data
EXPOSE 3000
CMD ["./server"]
