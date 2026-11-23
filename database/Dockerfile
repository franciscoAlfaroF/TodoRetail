FROM postgres:15-alpine AS postgres

RUN rm -f /usr/local/bin/gosu

FROM alpine:3.24

RUN apk upgrade --no-cache \
    && apk add --no-cache bash cyrus-sasl icu-libs krb5-libs libcrypto3 libedit libldap libssl3 libxml2 lz4-libs musl-locales musl-utils su-exec tzdata zstd-libs \
    && addgroup -S -g 70 postgres \
    && adduser -S -D -H -u 70 -G postgres postgres \
    && mkdir -p /docker-entrypoint-initdb.d \
    && mkdir -p /var/lib/postgresql /var/run/postgresql \
    && chown -R postgres:postgres /var/lib/postgresql /var/run/postgresql \
    && printf '#!/bin/sh\nexec /sbin/su-exec "$@"\n' > /usr/local/bin/gosu \
    && chmod 0755 /usr/local/bin/gosu

COPY --from=postgres /usr/local /usr/local

ENV LANG=C.UTF-8 \
    PG_MAJOR=15 \
    PG_VERSION=15.20 \
    PGDATA=/var/lib/postgresql/data \
    PATH=/usr/local/bin:/usr/local/sbin:/usr/sbin:/usr/bin:/sbin:/bin

VOLUME /var/lib/postgresql/data
EXPOSE 5432
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["postgres"]
