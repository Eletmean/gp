# #!/bin/sh
# # Скрипт ожидания доступности хоста и порта

# set -e

# host="$1"
# port="$2"
# shift 2
# cmd="$@"

# until nc -z "$host" "$port"; do
#   echo "⏳ Ожидание $host:$port..."
#   sleep 2
# done

# echo "✅ $host:$port доступен - запускаем: $cmd"
# exec $cmd
