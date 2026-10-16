// Hero Network certification question bank. SERVER ONLY: it contains the answer key, so it must
// never be imported by a client component (the API sends questions without answers).
//
// Content follows the SAMHSA Opioid Overdose Prevention Toolkit, the FDA Narcan nasal spray label,
// the American Heart Association guidance on opioid-associated emergencies, and the ACMT/AACT
// position statement on fentanyl exposure. Reviewed 2026-10-05; re-check sources before editing.
// Changing any question or answer requires bumping HERO_TEST_VERSION.

export const HERO_TEST_VERSION = 1
export const QUESTIONS_PER_ATTEMPT = 12

export interface BankQuestion {
  id: string
  topic: string
  prompt: string
  options: { id: string; text: string }[]
  answer: string
  /** Shown after grading for a missed question, so people learn before retaking. */
  why: string
}

export const HERO_BANK: BankQuestion[] = [
  {
    id: "signs", topic: "Recognizing an overdose",
    prompt: "Which group of signs most strongly suggests an opioid overdose?",
    options: [
      { id: "a", text: "Won't wake up, slow or stopped breathing, tiny (pinpoint) pupils" },
      { id: "b", text: "Agitated, sweating, very large pupils" },
      { id: "c", text: "Talking fast, flushed red face, rapid breathing" },
      { id: "d", text: "Awake and alert but complaining of a headache" },
    ],
    answer: "a",
    why: "Unresponsiveness, slow or stopped breathing and pinpoint pupils are the classic opioid overdose signs. Blue or gray lips and fingertips and gurgling or snoring sounds are also warning signs.",
  },
  {
    id: "first-step", topic: "First actions",
    prompt: "You find someone who won't wake up when you shout their name and rub their breastbone hard. What do you do first?",
    options: [
      { id: "a", text: "Call 911 (or have someone call) and get naloxone" },
      { id: "b", text: "Wait 10 minutes to see if they wake up on their own" },
      { id: "c", text: "Put them in a cold shower" },
      { id: "d", text: "Search their pockets to find out what they took" },
    ],
    answer: "a",
    why: "Call 911 and give naloxone right away. Waiting, cold water and searching for drugs waste time the person may not have.",
  },
  {
    id: "nasal-use", topic: "Giving naloxone",
    prompt: "How do you give naloxone nasal spray (such as Narcan 4 mg)?",
    options: [
      { id: "a", text: "Put the nozzle in one nostril and press the plunger once; it does not need priming" },
      { id: "b", text: "Spray a test puff into the air first, then spray into the mouth" },
      { id: "c", text: "Spray half in each nostril" },
      { id: "d", text: "Have the person sniff it in themselves" },
    ],
    answer: "a",
    why: "Each device holds one dose. Insert the tip fully into one nostril and press the plunger firmly once. Do not test-spray or prime it, and the person does not need to breathe in.",
  },
  {
    id: "second-dose", topic: "Giving naloxone",
    prompt: "You gave one dose of nasal naloxone. After 2–3 minutes the person still isn't breathing normally. What now?",
    options: [
      { id: "a", text: "Give a second dose with a new device in the other nostril, and keep supporting breathing" },
      { id: "b", text: "Do nothing more; one dose is the maximum" },
      { id: "c", text: "Give the second dose only after 30 minutes" },
      { id: "d", text: "Reuse the first device in the same nostril" },
    ],
    answer: "a",
    why: "If there is no response in 2–3 minutes, give another dose with a new device, alternating nostrils. Strong opioids like fentanyl can need more than one dose.",
  },
  {
    id: "unsure", topic: "Giving naloxone",
    prompt: "You are not sure the person took opioids. Should you give naloxone?",
    options: [
      { id: "a", text: "Yes. Naloxone does not harm someone who has no opioids in their body" },
      { id: "b", text: "No. Naloxone is dangerous unless you know they took opioids" },
      { id: "c", text: "Only if a doctor approves it by phone" },
      { id: "d", text: "Only if they are over 18" },
    ],
    answer: "a",
    why: "Naloxone only acts on opioid receptors. If no opioids are present it has no effect, so give it whenever an opioid overdose is possible.",
  },
  {
    id: "duration", topic: "After naloxone",
    prompt: "The person wakes up after naloxone. Why should someone stay with them?",
    options: [
      { id: "a", text: "Naloxone can wear off in 30–90 minutes, before the opioid does, and the overdose can come back" },
      { id: "b", text: "There is no reason; once awake they are safe" },
      { id: "c", text: "To make sure they take their next dose on time" },
      { id: "d", text: "Because naloxone makes people fall asleep for several hours" },
    ],
    answer: "a",
    why: "Naloxone lasts about 30–90 minutes. Many opioids last longer, so breathing can slow again. Stay with them and make sure 911 is on the way.",
  },
  {
    id: "recovery-position", topic: "Supporting breathing",
    prompt: "The person is breathing but not awake, and you must step away briefly. How should you leave them?",
    options: [
      { id: "a", text: "On their side, top knee bent, head tilted back slightly (recovery position)" },
      { id: "b", text: "Flat on their back with a pillow under the head" },
      { id: "c", text: "Sitting upright against a wall" },
      { id: "d", text: "Face down on the floor" },
    ],
    answer: "a",
    why: "The recovery position keeps the airway open and stops them choking if they vomit. Don't leave them on their back.",
  },
  {
    id: "rescue-breaths", topic: "Supporting breathing",
    prompt: "For an adult who is not breathing, how often does SAMHSA's toolkit say to give rescue breaths if you are trained?",
    options: [
      { id: "a", text: "One breath every 5 seconds" },
      { id: "b", text: "One breath every 30 seconds" },
      { id: "c", text: "Ten quick breaths, then stop" },
      { id: "d", text: "One breath per minute" },
    ],
    answer: "a",
    why: "Tilt the head back, lift the chin, pinch the nose and give one breath every 5 seconds, watching the chest rise.",
  },
  {
    id: "cpr", topic: "Supporting breathing",
    prompt: "The person is still not breathing normally and you cannot tell if they have a pulse. What does the American Heart Association recommend?",
    options: [
      { id: "a", text: "Start CPR and continue until EMS arrives, giving naloxone as well" },
      { id: "b", text: "Wait for naloxone to work before touching them" },
      { id: "c", text: "Only give CPR if they are under 40" },
      { id: "d", text: "Shake them until they wake up" },
    ],
    answer: "a",
    why: "If someone is not breathing normally, start CPR right away. Naloxone does not replace CPR, and CPR should not be delayed to give it.",
  },
  {
    id: "fentanyl-touch", topic: "Your safety",
    prompt: "Can brief skin contact with fentanyl, or being in the same room, cause an overdose in a responder?",
    options: [
      { id: "a", text: "No. Brief skin contact or being nearby does not cause overdose; don't delay help" },
      { id: "b", text: "Yes. Touching it for a second can kill you" },
      { id: "c", text: "Yes, if you breathe the air in the room" },
      { id: "d", text: "Only if you are not wearing a hazmat suit" },
    ],
    answer: "a",
    why: "Toxicology societies (ACMT/AACT) found incidental skin contact or proximity does not cause overdose. Wear gloves if you have them and wash with soap and water, but don't hold back help.",
  },
  {
    id: "withdrawal", topic: "After naloxone",
    prompt: "After naloxone the person wakes up sick, sweating and angry. What should you do?",
    options: [
      { id: "a", text: "Stay calm, explain what happened, discourage using more opioids, and stay until help arrives" },
      { id: "b", text: "Leave immediately because they are fine now" },
      { id: "c", text: "Give them opioids to ease the withdrawal" },
      { id: "d", text: "Restrain them on the floor" },
    ],
    answer: "a",
    why: "Naloxone can cause sudden withdrawal. It's unpleasant but not usually life-threatening. Using more opioids to feel better can cause another overdose when naloxone wears off.",
  },
  {
    id: "myths", topic: "Avoiding harm",
    prompt: "Which of these is a safe, recommended action for a suspected opioid overdose?",
    options: [
      { id: "a", text: "Give naloxone and support breathing" },
      { id: "b", text: "Inject salt water or milk" },
      { id: "c", text: "Put them in an ice bath" },
      { id: "d", text: "Let them sleep it off" },
    ],
    answer: "a",
    why: "Ice baths, injecting substances, slapping or letting someone sleep it off do not reverse an overdose and can cause harm or waste time.",
  },
  {
    id: "good-samaritan", topic: "The law",
    prompt: "What is true about overdose Good Samaritan laws in the United States?",
    options: [
      { id: "a", text: "Most states give some legal protection to people who call 911 for an overdose, but what is covered varies by state" },
      { id: "b", text: "Every state gives complete immunity for everything" },
      { id: "c", text: "No state protects people who call 911" },
      { id: "d", text: "Protection only applies if you don't give naloxone" },
    ],
    answer: "a",
    why: "Nearly every state has some overdose Good Samaritan or naloxone protection, but the details differ. Calling 911 is always the right call in an emergency.",
  },
  {
    id: "xylazine", topic: "Drug supply",
    prompt: "The drugs may contain xylazine (\"tranq\"), which naloxone does not reverse. What should you do?",
    options: [
      { id: "a", text: "Still give naloxone, because opioids are usually also present, and support breathing" },
      { id: "b", text: "Skip naloxone because it won't work" },
      { id: "c", text: "Give twice the usual number of doses at once" },
      { id: "d", text: "Wait for them to wake up naturally" },
    ],
    answer: "a",
    why: "Xylazine is usually mixed with fentanyl. Naloxone reverses the opioid part, which affects breathing most. Keep supporting breathing and call 911.",
  },
  {
    id: "role", topic: "Being a Hero",
    prompt: "As a Hero Network volunteer, what is your role in an emergency?",
    options: [
      { id: "a", text: "Make sure 911 is called, help only if it is safe, and hand over to EMS when they arrive" },
      { id: "b", text: "Replace 911 so the person doesn't need EMS" },
      { id: "c", text: "Take the person to the hospital in your car" },
      { id: "d", text: "Decide whether 911 is necessary" },
    ],
    answer: "a",
    why: "Heroes add help while EMS is coming. They never replace 911, and they should not put themselves in danger.",
  },
  {
    id: "scene-safety", topic: "Your safety",
    prompt: "You arrive and the scene looks dangerous (a fight, a weapon, traffic). What do you do?",
    options: [
      { id: "a", text: "Stay back, call 911 and tell them about the danger" },
      { id: "b", text: "Go in quickly anyway" },
      { id: "c", text: "Leave without telling anyone" },
      { id: "d", text: "Try to break up the fight first" },
    ],
    answer: "a",
    why: "Your safety comes first. An injured responder cannot help. Call 911, describe the danger, and wait for police and EMS.",
  },
  {
    id: "check-breathing", topic: "Recognizing an overdose",
    prompt: "How should you check whether someone is breathing?",
    options: [
      { id: "a", text: "Look at the chest, listen and feel for breath for no more than 10 seconds" },
      { id: "b", text: "Watch them for 5 full minutes" },
      { id: "c", text: "Ask them if they are breathing" },
      { id: "d", text: "Check if their eyes are open" },
    ],
    answer: "a",
    why: "Check quickly, for no more than 10 seconds. Gasping or gurgling is not normal breathing.",
  },
  {
    id: "expired", topic: "Giving naloxone",
    prompt: "The only naloxone you have expired last year, and someone is overdosing. What should you do?",
    options: [
      { id: "a", text: "Use it and call 911; it may be weaker but is better than none" },
      { id: "b", text: "Throw it away; expired naloxone is poisonous" },
      { id: "c", text: "Wait until you can buy a new one" },
      { id: "d", text: "Give it by mouth instead" },
    ],
    answer: "a",
    why: "Studies of expired naloxone found most of the drug remains. Use it, call 911, and replace it afterwards.",
  },
  {
    id: "privacy", topic: "Being a Hero",
    prompt: "You responded to a request and now know where someone uses drugs. What do you do with that information?",
    options: [
      { id: "a", text: "Keep it private: no photos, posts or sharing with anyone except EMS" },
      { id: "b", text: "Post it online to warn the neighborhood" },
      { id: "c", text: "Tell their employer" },
      { id: "d", text: "Take photos for your records" },
    ],
    answer: "a",
    why: "People must be able to ask for help without being exposed. Share only what EMS needs to treat them.",
  },
  {
    id: "pregnancy", topic: "Giving naloxone",
    prompt: "A pregnant person is unresponsive and not breathing after using opioids. Should you give naloxone?",
    options: [
      { id: "a", text: "Yes. Call 911 and give naloxone; saving the parent's life comes first" },
      { id: "b", text: "No. Naloxone is never allowed during pregnancy" },
      { id: "c", text: "Only half a dose" },
      { id: "d", text: "Only if the baby is moving" },
    ],
    answer: "a",
    why: "Medical guidance is to give naloxone to a pregnant person in an overdose. An overdose threatens both parent and baby.",
  },
  {
    id: "child", topic: "Giving naloxone",
    prompt: "A child may have swallowed someone's opioid pills and is now very hard to wake. What should you do?",
    options: [
      { id: "a", text: "Call 911 and give naloxone; nasal naloxone can be given to children" },
      { id: "b", text: "Make the child vomit" },
      { id: "c", text: "Give them coffee to wake them up" },
      { id: "d", text: "Put them to bed and check in the morning" },
    ],
    answer: "a",
    why: "Naloxone nasal spray is approved for children too. Call 911 and Poison Control (1-800-222-1222 in the US) can also advise; never make the child vomit.",
  },
  {
    id: "stimulant", topic: "Recognizing an overdose",
    prompt: "Someone who used cocaine is overheating, has chest pain and is confused. Fentanyl is common in the local supply. What do you do?",
    options: [
      { id: "a", text: "Call 911, keep them cool and safe, and give naloxone if they become hard to wake or breathing slows" },
      { id: "b", text: "Give them more stimulants to balance it out" },
      { id: "c", text: "Tell them to walk it off" },
      { id: "d", text: "Nothing, because naloxone never helps with cocaine" },
    ],
    answer: "a",
    why: "Naloxone does not reverse stimulants, but opioids are often mixed in. Call 911 for chest pain or overheating, and give naloxone if opioid signs appear.",
  },
  {
    id: "refuses-care", topic: "After naloxone",
    prompt: "After waking up, the person refuses to go to the hospital. What should you do?",
    options: [
      { id: "a", text: "Respect their choice, explain the overdose can return, encourage them to let EMS check them, and stay with them if you can" },
      { id: "b", text: "Force them into your car" },
      { id: "c", text: "Call their family and employer" },
      { id: "d", text: "Leave immediately" },
    ],
    answer: "a",
    why: "An awake adult can refuse care. Explain the risk, ask them not to use alone, and stay or make sure someone does.",
  },
  {
    id: "storage", topic: "Being ready",
    prompt: "How should you store your naloxone kit?",
    options: [
      { id: "a", text: "At room temperature, out of direct sunlight, somewhere you can reach quickly; check the expiration date" },
      { id: "b", text: "In a hot car glovebox all summer" },
      { id: "c", text: "In the freezer" },
      { id: "d", text: "Locked away where nobody can find it" },
    ],
    answer: "a",
    why: "Keep it at room temperature, protected from light, and easy to grab. Replace it before it expires or after use.",
  },
]

export type PublicQuestion = Omit<BankQuestion, "answer" | "why">

function shuffled<T>(items: T[], random: () => number) {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

const secureRandom = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32

/** Maps a bank option id to the id the client sees. Certified attempts use opaque per-attempt ids. */
export type OptionLabeler = (questionId: string, optionId: string) => string
const plainLabels: OptionLabeler = (_questionId, optionId) => optionId

/** A fresh random draw with shuffled options and no answers. */
export function drawQuestions(count = QUESTIONS_PER_ATTEMPT, random: () => number = secureRandom, label: OptionLabeler = plainLabels): PublicQuestion[] {
  return shuffled(HERO_BANK, random).slice(0, count).map(({ id, topic, prompt, options }) => ({
    id, topic, prompt,
    options: shuffled(options, random).map((option) => ({ id: label(id, option.id), text: option.text })),
  }))
}

export interface Grade {
  passed: boolean
  correct: number
  total: number
  missed: { id: string; topic: string; prompt: string; why: string }[]
}

/** 100% is required: every drawn question must be answered correctly. */
export function gradeAttempt(questionIds: string[], answers: Record<string, unknown>, label: OptionLabeler = plainLabels): Grade | null {
  if (questionIds.length !== QUESTIONS_PER_ATTEMPT || new Set(questionIds).size !== questionIds.length) return null
  const questions = questionIds.map((id) => HERO_BANK.find((question) => question.id === id))
  if (questions.some((question) => !question)) return null
  const missed = (questions as BankQuestion[]).filter((question) => answers[question.id] !== label(question.id, question.answer))
  const correct = questionIds.length - missed.length
  return { passed: missed.length === 0, correct, total: questionIds.length, missed: missed.map(({ id, topic, prompt, why }) => ({ id, topic, prompt, why })) }
}
