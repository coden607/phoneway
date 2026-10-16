#!/usr/bin/env bash
set -euo pipefail

OUT="marketing/videos"
FONT="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
REGULAR_FONT="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
WORK="${TMPDIR:-/tmp}/narcoguard-video"

mkdir -p "$OUT" "$WORK"

if [[ ! -f "$FONT" || ! -f "$REGULAR_FONT" ]]; then
  echo "Required DejaVu fonts were not found." >&2
  exit 1
fi

write_card() {
  local prefix="$1" eyebrow="$2" title="$3" body="$4" footer="$5"
  printf '%s' "$eyebrow" > "$WORK/${prefix}-eyebrow.txt"
  printf '%b' "$title" > "$WORK/${prefix}-title.txt"
  printf '%b' "$body" > "$WORK/${prefix}-body.txt"
  printf '%b' "$footer" > "$WORK/${prefix}-footer.txt"
}

render_story() {
  local image="$1" output="$2" accent="$3"
  shift 3

  local filters="scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,zoompan=z='min(zoom+0.00022,1.055)':d=1440:s=1080x1920:fps=30,drawbox=x=0:y=0:w=iw:h=ih:color=0x030712@0.52:t=fill"
  local index=1 start end prefix

  while (( $# >= 4 )); do
    prefix="$(basename "$output" .mp4)-${index}"
    write_card "$prefix" "$1" "$2" "$3" "$4"
    start=$(( (index - 1) * 10 ))
    end=$(( index * 10 ))
    filters+=",drawbox=x=48:y=135:w=984:h=1490:color=0x030712@0.78:t=fill:enable='between(t,${start},${end})'"
    filters+=",drawbox=x=48:y=135:w=12:h=1490:color=${accent}@0.95:t=fill:enable='between(t,${start},${end})'"
    filters+=",drawtext=fontfile=${FONT}:textfile=${WORK}/${prefix}-eyebrow.txt:fontcolor=${accent}:fontsize=30:x=92:y=205:enable='between(t,${start},${end})'"
    filters+=",drawtext=fontfile=${FONT}:textfile=${WORK}/${prefix}-title.txt:fontcolor=white:fontsize=58:line_spacing=18:x=92:y=310:enable='between(t,${start},${end})'"
    filters+=",drawtext=fontfile=${REGULAR_FONT}:textfile=${WORK}/${prefix}-body.txt:fontcolor=0xdbeafe:fontsize=39:line_spacing=20:x=92:y=660:enable='between(t,${start},${end})'"
    filters+=",drawtext=fontfile=${FONT}:textfile=${WORK}/${prefix}-footer.txt:fontcolor=white:fontsize=27:line_spacing=12:x=92:y=1450:enable='between(t,${start},${end})'"
    shift 4
    index=$((index + 1))
  done

  filters+=",drawbox=x=0:y=1770:w=1080:h=150:color=0x030712@0.92:t=fill"
  filters+=",drawtext=fontfile=${FONT}:text='NARCOGUARD NG  |  PUBLIC CONCEPT':fontcolor=white:fontsize=27:x=(w-text_w)/2:y=1800"
  filters+=",drawtext=fontfile=${REGULAR_FONT}:text='NOT A VALIDATED MEDICAL DEVICE  -  CALL 911 IN AN EMERGENCY':fontcolor=0xfde68a:fontsize=22:x=(w-text_w)/2:y=1850"

  local duration=$(( (index - 1) * 10 ))
  ffmpeg -hide_banner -loglevel warning -y -loop 1 -i "$image" -t "$duration" -an \
    -vf "$filters" -c:v libx264 -preset veryfast -crf 21 -pix_fmt yuv420p \
    -movflags +faststart "$OUT/$output"
}

render_story public/images/watch-on-wrist-lifestyle.jpg ng-concept-explained-v2.mp4 0x67e8f9 \
  "THE PROBLEM" "OVERDOSE CAN\nSTOP BREATHING" "A person may be alone or\nunable to call for help.\nEvery response still requires\n911 and proven emergency care." "CDC: naloxone can restore breathing\nwithin 2-3 minutes when given in time." \
  "THE GAP" "HELP MAY NOT\nARRIVE IN TIME" "Today's leading watches offer\nvaluable health and safety tools.\nThey are not designed to detect\nopioid overdose or deliver naloxone." "A focused concept could explore\nhow to shorten the response gap." \
  "THE CONCEPT" "SENSE. CONFIRM.\nALERT. RESPOND." "Candidate sensors look for\nmultiple concerning signals.\nA failure-aware flow seeks help\nand keeps the user informed." "Detection and delivery remain proposed.\nFalse alarms and missed events matter." \
  "THE MISSION" "BUILD EVIDENCE,\nNOT HYPE" "Prototype engineering.\nClinical and human-factors review.\nCommunity input. Regulatory planning.\nTransparent test results." "Help fund responsible development.\nNARCOGUARD.APP"

render_story public/images/ng-exploded-view.jpg ng-feature-tour-v2.mp4 0xa7f3d0 \
  "PROPOSED FEATURE 01" "MULTI-SIGNAL\nSENSING" "Candidate inputs include heart rate,\nmovement, oxygen trends and context.\nNo single wrist signal can safely\nprove an overdose on its own." "Research question: can sensor fusion\nprovide useful, timely confidence?" \
  "PROPOSED FEATURE 02" "ESCALATION\nWITH GUARDRAILS" "User prompts and cancellation.\nEmergency-contact alerts.\nLocation sharing with consent.\nClear connection and failure states." "The system must never imply that\nan alert or responder is guaranteed." \
  "PROPOSED FEATURE 03" "NALOXONE\nDELIVERY RESEARCH" "A future delivery mechanism would\nrequire dose, skin-contact, sterility,\nmisfire, lockout and removal testing\nplus clinical and regulatory review." "This capability does not exist yet.\nThe current watch is a concept." \
  "PROPOSED FEATURE 04" "A CONNECTED\nRESPONSE SYSTEM" "Wearable concept + mobile PWA.\nEmergency contacts + responders.\nRecovery resources + follow-up.\nPrivacy-conscious data handling." "The goal is timely connection to help,\nnot replacement of 911 or medical care."

render_story public/images/ng-blueprint-detailed.jpg ng-watch-comparison-v2.mp4 0xfde68a \
  "ESTABLISHED PRODUCTS" "APPLE WATCH" "Strong general-purpose platform:\nheart rate, ECG, fall detection,\nsleep and model/region-dependent\nblood-oxygen and safety features." "Commercial product with mature ecosystem.\nNot an opioid-overdose treatment device." \
  "ESTABLISHED PRODUCTS" "GALAXY WATCH" "Strong Android-focused platform:\nheart rhythm tools, sleep features,\nfall detection and model/region-dependent\noxygen and blood-pressure features." "Commercial product with broad wellness tools.\nNot a naloxone-delivery device." \
  "ESTABLISHED PRODUCTS" "FITBIT" "Fitness and wellness focus:\nactivity, sleep, heart-rate trends,\nmodel-dependent ECG and overnight SpO2.\nSome features are wellness-only." "Accessible health insights.\nNot validated for overdose response." \
  "PURPOSE-BUILT CONCEPT" "NARCOGUARD NG" "Proposed overdose-focused sensor fusion.\nProposed emergency escalation.\nProposed naloxone-delivery research.\nCommunity-response and recovery tools." "Unique mission; unvalidated capabilities.\nIt must earn every medical claim through evidence."

render_story public/images/broome-county-community.jpg ng-public-value-v2.mp4 0xc4b5fd \
  "THE CURRENT BURDEN" "OVERDOSE RESPONSE\nUSES MANY RESOURCES" "A severe emergency can involve\n911 dispatch, police or fire response,\nambulance transport, emergency care\nand sometimes intensive treatment." "People and families carry the greatest cost.\nPublic systems carry real costs too." \
  "THE OPPORTUNITY" "EARLIER HELP MAY\nREDUCE ESCALATION" "If a future system can recognize risk\nand connect a person with proven help\nsooner, it may reduce the severity\nof some emergencies." "Earlier is not the same as guaranteed.\n911 and medical evaluation still matter." \
  "POTENTIAL PUBLIC VALUE" "USE THE RIGHT\nRESOURCE SOONER" "Possible benefits to evaluate:\nshorter response delays, fewer complications,\nbetter responder information and stronger\nconnection to recovery services." "These are hypotheses for a pilot,\nnot proven cost savings." \
  "THE FUNDING CASE" "MEASURE COSTS\nAND OUTCOMES" "Track false alarms and missed events.\nMeasure response time and care used.\nCompare outcomes and total costs.\nPublish limitations transparently." "A health-economic study must establish\nwhether the concept saves taxpayer money."

printf 'Generated enhanced vertical videos in %s\n' "$OUT"
