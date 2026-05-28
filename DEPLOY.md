# ZENITH Docker 部署指南

## 环境要求
- Ubuntu 20.04+
- Docker & Docker Compose
- 公网IP（已开放端口 3000）

## 快速部署

### 1. 上传代码到服务器

```bash
# 在你的机器上打包
tar czf zenith.tar.gz zenith/

# 上传到服务器
scp zenith.tar.gz root@你的公网IP:/root/

# 在服务器上解压
ssh root@你的公网IP
tar xzf zenith.tar.gz
cd zenith
```

### 2. 开放端口（如未开放）

```bash
# 开放 3000 端口（应用访问）
sudo ufw allow 3000/tcp
# 或
sudo iptables -A INPUT -p tcp --dport 3000 -j ACCEPT
```

### 3. 运行部署脚本

```bash
chmod +x deploy.sh
./deploy.sh
```

### 4. 访问应用

```
http://你的公网IP:3000
```

**默认账号：1 / 密码：a**

## 管理命令

```bash
# 查看日志
docker compose logs -f

# 停止
docker compose stop

# 重启
docker compose restart

# 完全删除（包括数据库）
docker compose down -v

# 查看状态
docker compose ps
```

## 数据持久化

MySQL 数据通过 Docker Volume 持久化，即使容器删除数据也不会丢失。

如需备份数据库：
```bash
docker compose exec mysql mysqldump -uzenith -pzenith_pass zenith > backup.sql
```

如需恢复：
```bash
docker compose exec -T mysql mysql -uzenith -pzenith_pass zenith < backup.sql
```
