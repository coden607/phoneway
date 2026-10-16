import { strict as assert } from "node:assert"
import { test } from "node:test"
import { clearGuardianState, defaultGuardianState, earlyWarning, patternInsights, readGuardianState, saveGuardianState, summarizePattern, type CheckIn } from "../lib/guardian-stability"

function storage() { const values=new Map<string,string>(); return { getItem:(k:string)=>values.get(k)??null, setItem:(k:string,v:string)=>{values.set(k,v)}, removeItem:(k:string)=>{values.delete(k)} } }

test("off by default and malformed history is ignored", () => {
  const store=storage(); assert.equal(readGuardianState(store).enabled,false)
  store.setItem("narcoguard_guardian_stability_v2","{invalid"); assert.deepEqual(readGuardianState(store),defaultGuardianState())
})
test("consent gates storage; pause blocks new entries and erase clears data", () => {
  const store=storage(); const entry:CheckIn={date:"2026-09-27",needs:{food:"needs-help"},sleepHours:6}
  saveGuardianState(store,{...defaultGuardianState(),entries:[entry]}); assert.equal(readGuardianState(store).entries.length,0)
  const enabled={...defaultGuardianState(),enabled:true,entries:[entry],goals:["Find work"],supportPhone:"6075550100"}
  saveGuardianState(store,enabled); assert.equal(readGuardianState(store).entries.length,1)
  saveGuardianState(store,{...enabled,paused:true}); saveGuardianState(store,{...enabled,paused:true,entries:[...enabled.entries,{...entry,date:"2026-09-28"}]})
  assert.equal(readGuardianState(store).entries.length,1); clearGuardianState(store); assert.deepEqual(readGuardianState(store),defaultGuardianState())
})
test("generalized pattern learning excludes unknowns and requires evidence", () => {
  const entries:CheckIn[]=Array.from({length:10},(_,i)=>({date:`2026-09-${String(i+1).padStart(2,"0")}`,needs:{food:"needs-help",connection:i<3?"needs-help":"met",sleep:i<7?"needs-help":"met"}}))
  const patterns=patternInsights(entries)
  assert.ok(patterns.some(p=>p.trigger==="food"&&p.companion==="sleep"&&p.percent===70))
  assert.deepEqual(summarizePattern(entries),{observed:3,answered:10,percent:30})
  assert.equal(patternInsights(entries.slice(0,4)).length,0)
})
test("early warning is transparent, configurable, and not a relapse probability", () => {
  const entry:CheckIn={date:"2026-10-01",needs:{food:"needs-help",safePlace:"needs-help",connection:"needs-help"},sleepHours:4}
  const warning=earlyWarning(entry,3)
  assert.equal(warning.level,"support"); assert.equal(warning.score,4); assert.equal(warning.sleepSignal,true)
  assert.deepEqual(warning.signals,["food","safePlace","connection"])
  assert.equal(earlyWarning({date:"2026-10-01",needs:{}},3).level,"steady")
  assert.equal(earlyWarning(entry,6).level,"check-in")
})


test("appointment planning data is retained only within the safe local schema", () => {
  const store = storage()
  const enabled = { ...defaultGuardianState(), enabled: true, plan: [
    { id: "appointment-1", date: "2026-10-03", title: "Clinic visit", done: false, kind: "appointment" as const, time: "14:30", location: "Community clinic", need: "treatment" as const },
  ] }
  saveGuardianState(store, enabled)
  assert.deepEqual(readGuardianState(store).plan[0], enabled.plan[0])
})
