ARG BUILD_FROM
FROM $BUILD_FROM
ENV S6_KEEP_ENV=1
RUN apk add --no-cache python3 tzdata
COPY app /app
COPY run.sh /run.sh
RUN chmod a+x /run.sh
CMD ["/run.sh"]
