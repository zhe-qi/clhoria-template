#!/bin/bash
set -e

# 生成数据库用户的 MD5 密码哈希
generate_md5_hash() {
    local password="$1"
    local username="$2"
    echo "md5$(echo -n "${password}${username}" | md5sum | cut -d' ' -f1)"
}

# 从环境变量更新 userlist.txt
update_userlist() {
    if [ -n "$DB_USER" ] && [ -n "$DB_PASSWORD" ]; then
        echo "" >> /etc/pgbouncer/userlist.txt
        echo "\"$DB_USER\" \"$DB_PASSWORD\"" >> /etc/pgbouncer/userlist.txt
        echo "Added database user: $DB_USER"
    fi
}

# 更新 pgbouncer.ini 中的数据库配置
update_database_config() {
    if [ -n "$DB_HOST" ] && [ -n "$DB_PORT" ] && [ -n "$DB_NAME" ]; then
        # 替换通配符配置为具体数据库配置
        sed -i "s/\* = host=postgres port=5432 pool_size=25 reserve_pool=5/$DB_NAME = host=$DB_HOST port=$DB_PORT dbname=$DB_NAME pool_size=25 reserve_pool=5/" /etc/pgbouncer/pgbouncer.ini
        echo "Updated database config: $DB_NAME @ $DB_HOST:$DB_PORT"
    fi
}

# 创建必要的目录
mkdir -p /var/run/pgbouncer
mkdir -p /var/log/pgbouncer

# 设置权限
chown -R pgbouncer:pgbouncer /var/run/pgbouncer
chown -R pgbouncer:pgbouncer /var/log/pgbouncer
chown -R pgbouncer:pgbouncer /etc/pgbouncer

# 更新配置
update_userlist
update_database_config

# 验证配置文件
echo "Validating PgBouncer configuration..."
su-exec pgbouncer pgbouncer -v /etc/pgbouncer/pgbouncer.ini

# 启动 PgBouncer
echo "Starting PgBouncer..."
exec su-exec pgbouncer pgbouncer /etc/pgbouncer/pgbouncer.ini
