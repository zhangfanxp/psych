#!/bin/bash

# ===== 配置区 =====
DB_NAME="student_psych_assessment"
DB_USER="root"
DB_PASSWORD="Abs)*m12d31"
R2_BUCKET="psych"
R2_ENDPOINT="https://938fae11c071abfc0956ca3e91ef651c.r2.cloudflarestorage.com/psych"

# ===== 时间戳 =====
DATE=$(date +"%Y-%m-%d_%H-%M-%S")
FILE_NAME="${DB_NAME}_backup_${DATE}.sql"
FILE_PATH="/tmp/${FILE_NAME}"

echo "开始备份数据库..."

# ===== MySQL 备份 =====
mysqldump -u${DB_USER} -p${DB_PASSWORD} ${DB_NAME} > ${FILE_PATH}

if [ $? -ne 0 ]; then
  echo "❌ 数据库备份失败"
  exit 1
fi

echo "✅ 备份完成: ${FILE_PATH}"

# ===== 上传到 R2 =====
aws s3 cp ${FILE_PATH} s3://${R2_BUCKET}/${FILE_NAME} \
  --endpoint-url ${R2_ENDPOINT}

if [ $? -ne 0 ]; then
  echo "❌ 上传失败"
  exit 1
fi

echo "✅ 上传成功到 R2"

# ===== 删除本地文件（可选）=====
rm -f ${FILE_PATH}

echo "🎉 全部完成"
