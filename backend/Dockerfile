FROM gcc:12 AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y cmake make
COPY . .
RUN mkdir -p build && cd build && cmake .. && make -j4

FROM debian:bullseye-slim
WORKDIR /app
RUN apt-get update && apt-get install -y libstdc++6 ca-certificates curl && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/build/pvz_server /app/pvz_server
RUN mkdir -p /app/data
VOLUME /app/data
EXPOSE 8080
ENV PORT=8080
ENV DATA_DIR=/app/data
HEALTHCHECK --interval=30s --timeout=3s CMD curl -f http://localhost:8080/health || exit 1
CMD ["/app/pvz_server"]
