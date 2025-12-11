#!/bin/bash

HOST="${localhost}"
WS_URL="wss://${HOST}:8443/game" 
PIPE="/tmp/pong_cmd_pipe" 
READY_FLAG="/tmp/pong_ready_flag" 

if ! command -v jq &> /dev/null; then
    echo "Erreur: 'jq' n'est pas installé. Fais 'apt install jq' ou 'brew install jq'"
    exit 1
fi

BG_PID=""

cleanup() {
    rm -f $PIPE
    rm -f $READY_FLAG
	if [ -n "$BG_PID" ]; then
        kill "$BG_PID" 2>/dev/null
    fi
    tput cnorm 
    echo -e "\n🛑 Déconnexion."
    exit
}
trap cleanup INT TERM EXIT

rm -f $PIPE
rm -f $READY_FLAG
mkfifo $PIPE

process_dashboard() {
    clear
    echo "============================================================"
    echo "   🏓  SERVER-SIDE PONG mini-CLI  🏓"
    echo "============================================================"

    while read -r line; do
        clean_line=$(echo "$line" | sed 's/^[<> ]*//')

        if echo "$clean_line" | jq -e . > /dev/null 2>&1; then
            event_type=$(echo "$clean_line" | jq -r '.event // empty')
            if [ "$event_type" == "ready_phase" ]; then
                touch $READY_FLAG
            fi
            
            if echo "$clean_line" | grep -q "ball"; then
                vars=$(echo "$clean_line" | jq -r '.body.ball.x, .body.ball.y, .body.players.p1.score, .body.players.p2.score')
                readarray -t v <<< "$vars"
                
                tput cup 3 0
                printf "Ball X: %-10s | Ball Y: %-10s\n" "${v[0]}" "${v[1]}"
                printf "Score P1: %-5s    | Score P2: %-5s\n" "${v[2]}" "${v[3]}"
            else
                tput cup 9 0
                echo "JSON EVENT: $(echo "$clean_line" | jq -c .)                              "
            fi
        fi
    done
}

tail -f $PIPE | wscat -n -c "$WS_URL" 2>/dev/null | process_dashboard &
BG_PID=$!
sleep 2

echo '{"event": "start", "body": {"action": "play_online"}}' > $PIPE
while [ ! -f $READY_FLAG ]; do
    sleep 0.1
done

sleep 1
echo '{"event": "ready", "body": {"type": "player"}}' > $PIPE

current_dir="none"

while true; do
    read -rsn1 key
    
    case "$key" in
        w|W)
            if [ "$current_dir" == "down" ]; then
                echo '{"event": "play", "body": {"type": "release", "dir": "down", "id": 1}}' > $PIPE
            fi

            if [ "$current_dir" != "up" ]; then
                echo '{"event": "play", "body": {"type": "press", "dir": "up", "id": 1}}' > $PIPE
                current_dir="up"
            fi
            ;;
            
        s|S)
            if [ "$current_dir" == "up" ]; then
                echo '{"event": "play", "body": {"type": "release", "dir": "up", "id": 1}}' > $PIPE
            fi

            if [ "$current_dir" != "down" ]; then
                echo '{"event": "play", "body": {"type": "press", "dir": "down", "id": 1}}' > $PIPE
                current_dir="down"
            fi
            ;;
            
        q|Q)
            exit 0
            ;;
    esac
done