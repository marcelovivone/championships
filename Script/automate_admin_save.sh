#!/usr/bin/env bash
set -euo pipefail

API=${API:-http://localhost:3000}

echo "Using API: $API"

matches=(
'{"sportId":36,"leagueId":38,"seasonId":17,"roundId":10,"homeClubId":254,"awayClubId":255,"date":"2026-03-10T15:00:00Z","homeScore":2,"awayScore":1,"status":"Finished"}'
'{"sportId":36,"leagueId":38,"seasonId":17,"roundId":10,"homeClubId":259,"awayClubId":271,"date":"2026-03-10T17:00:00Z","homeScore":1,"awayScore":1,"status":"Finished"}'
)

i=0
for m in "${matches[@]}"; do
  i=$((i+1))
  echo "\n==> Creating match #$i"
  resp=$(curl -s -X POST "$API/v1/matches" -H "Content-Type: application/json" -d "$m")
  echo "matches response: $resp"

  # Extract created match id
    matchId=$(echo "$resp" | python -c "import sys,json; r=json.load(sys.stdin); mid = None; \
  mid = r.get('data',{}).get('id') if isinstance(r,dict) else None; mid = mid or (r.get('id') if isinstance(r,dict) else None); print(mid or '')")

  if [ -z "$matchId" ]; then
    echo "Failed to get match id from response. Aborting."
    exit 1
  fi

  echo "Created match id: $matchId"

  # Build standings payload from original match JSON and created id
  payload=$(echo "$m" | python -c "import sys,json as _j; o=_j.load(sys.stdin); mid=int(sys.argv[1]); p={'sportId':o.get('sportId'),'leagueId':o.get('leagueId'),'seasonId':o.get('seasonId'),'roundId':o.get('roundId'),'matchDate':o.get('date'),'groupId':o.get('groupId'),'homeClubId':o.get('homeClubId'),'awayClubId':o.get('awayClubId'),'homeScore':o.get('homeScore',0),'awayScore':o.get('awayScore',0),'matchId':mid,'matchDivisions':[]}; print(_j.dumps(p))" "$matchId")

  echo "Posting standings for match $matchId"
  st=$(curl -s -X POST "$API/v1/standings" -H "Content-Type: application/json" -d "$payload")
  echo "standings response: $st"
done

echo "\nAutomation completed."
