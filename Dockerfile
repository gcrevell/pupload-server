FROM node:26.13.1-alpine
WORKDIR /app
ENV PUPLOAD_CONFIG_DIR=/config
COPY package.json ./
COPY server/ server/
RUN mkdir /config && chown node:node /config
ARG PUPLOAD_VERSION
ENV PUPLOAD_VERSION=$PUPLOAD_VERSION
USER node
EXPOSE 7875
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD wget -qO- http://127.0.0.1:7875/api/v1/info || exit 1
CMD ["node", "server/index.ts"]
