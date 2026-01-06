#!/bin/bash
# Script de monitoreo de recursos para Next.js dev server

echo "=== Monitoreo de Recursos - Next.js Dev Server ==="
echo ""

# Verificar si hay procesos de Next.js corriendo
NEXT_PIDS=$(pgrep -f "next dev" | head -5)

if [ -z "$NEXT_PIDS" ]; then
    echo "❌ No se encontraron procesos de Next.js dev corriendo"
    echo "Ejecuta 'npm run dev' primero"
    exit 1
fi

echo "📊 Procesos de Next.js encontrados:"
ps aux | grep -E "next dev|node.*next" | grep -v grep | head -5
echo ""

# Monitorear recursos cada 5 segundos
echo "Monitoreando recursos (Ctrl+C para detener)..."
echo ""

while true; do
    echo "=== $(date '+%H:%M:%S') ==="
    
    # Memoria del sistema
    echo "💾 Memoria del Sistema:"
    free -h | grep -E "Mem|Swap" | awk '{print "  " $1 ": " $3 "/" $2 " (" $5 ")"}'
    
    # CPU
    echo "⚡ CPU:"
    top -bn1 | grep "Cpu(s)" | awk '{print "  Uso: " $2 " | Idle: " $8}'
    
    # Procesos de Next.js
    echo "🔧 Procesos Next.js:"
    for pid in $NEXT_PIDS; do
        if ps -p $pid > /dev/null 2>&1; then
            ps -p $pid -o pid,pcpu,pmem,rss,vsz,comm --no-headers | \
                awk '{printf "  PID: %s | CPU: %s%% | Mem: %s%% | RSS: %.1f MB\n", $1, $2, $3, $4/1024}'
        fi
    done
    
    # Espacio en disco
    echo "💿 Disco:"
    df -h / | tail -1 | awk '{print "  Usado: " $3 "/" $2 " (" $5 ")"}'
    
    echo ""
    sleep 5
done




