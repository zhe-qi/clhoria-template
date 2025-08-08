FROM alpine:latest

# 安装 PgBouncer 和依赖
RUN apk add --no-cache \
    pgbouncer \
    postgresql-client \
    su-exec \
    bash \
    curl \
    && adduser -D -H -s /bin/false pgbouncer

# 创建配置目录
RUN mkdir -p /etc/pgbouncer \
    && mkdir -p /var/run/pgbouncer \
    && mkdir -p /var/log/pgbouncer

# 复制配置文件
COPY pgbouncer.ini /etc/pgbouncer/pgbouncer.ini
COPY userlist.txt /etc/pgbouncer/userlist.txt
COPY entrypoint.sh /usr/local/bin/entrypoint.sh

# 设置权限
RUN chmod +x /usr/local/bin/entrypoint.sh \
    && chown -R pgbouncer:pgbouncer /etc/pgbouncer \
    && chown -R pgbouncer:pgbouncer /var/run/pgbouncer \
    && chown -R pgbouncer:pgbouncer /var/log/pgbouncer

# 暴露端口
EXPOSE 6432

# 健康检查 (在 docker-compose.yml 中覆盖)

# 启动脚本
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
