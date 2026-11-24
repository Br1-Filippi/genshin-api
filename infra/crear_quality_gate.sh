#!/usr/bin/env bash
# Crea el Quality Gate "QualityTaller2" con las 15 condiciones del taller y lo deja como predeterminado.
#
# ANTES de correrlo: en SonarQube ir a Administration > Configuration > General Settings > Mode
# y elegir "Standard Experience" (las condiciones Bugs, Code Smells, Blocker/Critical/Major Issues
# solo existen en ese modo).
#
# Uso:  SONAR_TOKEN=<token de usuario admin> ./crear_quality_gate.sh
#       (opcional) SONAR_URL=http://localhost:9000

set -u
SONAR_URL="${SONAR_URL:-http://localhost:9000}"
GATE="QualityTaller2"

if [ -z "${SONAR_TOKEN:-}" ]; then
  echo "Falta SONAR_TOKEN (My Account > Security > Generate Token)"; exit 1
fi

api() {  # api <endpoint> <parametros...>
  local endpoint="$1"; shift
  local args=()
  for p in "$@"; do args+=(--data-urlencode "$p"); done
  curl -s -o /tmp/qg_resp.txt -w "%{http_code}" -u "${SONAR_TOKEN}:" -X POST "${SONAR_URL}/api/${endpoint}" "${args[@]}"
}

echo "Creando Quality Gate ${GATE}..."
code=$(api qualitygates/create "name=${GATE}")
echo "  -> HTTP ${code} $(cat /tmp/qg_resp.txt)"

# metric | op | valor   (op: GT = "is greater than / is worse than", LT = "is less than")
# Ratings: 1=A, 2=B, ... -> "worse than A" = GT 1
CONDICIONES="
blocker_violations|GT|5
bugs|GT|0
code_smells|GT|20
coverage|LT|70
new_coverage|LT|75
critical_violations|GT|10
new_duplicated_lines_density|GT|3
sqale_rating|GT|1
new_maintainability_rating|GT|1
major_violations|GT|15
new_blocker_violations|GT|0
reliability_rating|GT|1
new_reliability_rating|GT|1
security_rating|GT|1
new_security_rating|GT|1
"

for linea in $CONDICIONES; do
  IFS='|' read -r metric op valor <<< "$linea"
  code=$(api qualitygates/create_condition "gateName=${GATE}" "metric=${metric}" "op=${op}" "error=${valor}")
  if [ "$code" = "200" ]; then
    echo "  OK  ${metric} ${op} ${valor}"
  else
    echo "  ERR ${metric} ${op} ${valor} -> HTTP ${code} $(cat /tmp/qg_resp.txt)"
  fi
done

echo "Dejando ${GATE} como predeterminado..."
code=$(api qualitygates/set_as_default "name=${GATE}")
echo "  -> HTTP ${code}"

echo "Listo. Revisa en ${SONAR_URL}/quality_gates que aparezcan las 15 condiciones y el tag Default."
