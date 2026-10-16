# NarcoGuard Public Founding Constitution — Design Specification

**Status:** Approved design for implementation planning  
**Draft date:** 2026-09-18  
**Target:** NarcoGuard PWA  
**Canonical constitutional status:** Founding Draft — Not Yet Ratified

## Purpose

NarcoGuard will publish its founding Constitution inside the existing PWA so the people it exists to serve can inspect, challenge, improve, and ultimately decide whether to ratify or amend it.

The first release is deliberately non-binding. It must not alter emergency, wearable, health, authentication, payment, or other safety-sensitive production behavior.

## North Star

> Save life. Connect people. Build independence. Expand possibility.

Technology serves the person. The person never serves the technology.

NarcoGuard should prosper when people become more capable, not when they become more dependent upon NarcoGuard.

## Constitutional foundations

The canonical `CONSTITUTION.md` must consolidate the founding principles developed for NarcoGuard, including:

1. The people are the permanent constitutional principal.
2. Individual dignity, lawful freedom, autonomy, privacy, consent, due process, human review, appeal, and equal human worth are protected even from a majority.
3. A vulnerable person's life may never become bargaining consideration for financial, political, institutional, or technological advantage.
4. Money may support NarcoGuard but may not purchase constitutional sovereignty. One dollar is not one vote; one share is not one human life.
5. External political-party identity is irrelevant to ordinary assistance and constitutional standing. NarcoGuard governance is nonpartisan.
6. No temporary majority or organized faction may convert numerical victory into ownership of the institution.
7. Administration exists to protect people and accomplish the mission. NarcoGuard seeks the minimum bureaucracy necessary for safety, rights, evidence, accountability, privacy, financial integrity, and lawful operation.
8. AI may assist but may not govern, vote, amend the Constitution, grant itself authority, remove human oversight, or certify the legitimacy of its own consequential exercise of power.
9. Evidence informs decisions but scientific facts are not created by popular vote. An independent Evidence Office preserves evidence, uncertainty, contradiction, and provenance.
10. Leadership is temporary stewardship. The proposed elected executive office is the Chief Steward; the public-facing title may be debated by the founding community.
11. Independent constitutional review must exist outside ordinary executive and majority control.
12. Future generations retain the ability to discover that NarcoGuard itself has become wrong and to correct it without losing fundamental rights.
13. NarcoGuard respects the autonomy and ownership of independent people and organizations; participation does not give NarcoGuard control over another person's project or property.

## Governance model to prototype

The founding model separates authority among:

- **Community Assembly:** proposals, ordinary policy, deliberation, and representation.
- **Chief Steward / Executive Stewardship:** executes legitimately adopted policy and operations; does not possess sovereignty.
- **Rights & Ethics Tribunal:** independent constitutional review and appeal.
- **Evidence Office:** independent, non-governing evidence function.

No single election, office, funding source, AI system, profession, party, or faction may control all of these functions.

Ordinary decisions may use majority voting. Fundamental rights and constitutional safeguards require elevated processes and may not be abolished through an ordinary 50% + 1 vote.

## Political independence

NarcoGuard must not organize governance around Republican, Democratic, or other external political-party identity.

Political affiliation must not determine:
- eligibility for ordinary assistance;
- constitutional standing;
- vote weight;
- candidate ranking;
- access to protected services;
- AI personalization or persuasion; or
- human worth.

People remain free to hold and express political beliefs consistent with rules protecting others from threats, harassment, discrimination, manipulation, and mission disruption.

Governance should evaluate proposals by constitutional compatibility, evidence, benefits, harms, feasibility, affected people, resource implications, and outcomes rather than partisan labels.

## Financial and bureaucratic anti-capture

Financial contribution and governance authority remain separate.

Material conflicts and dependencies should be visible through appropriate transparency mechanisms without exposing protected user information.

Consequential decisions should be traceable to the proposal, evidence, conflicts, authority, approvals, objections, and eventual outcomes.

Major administrative processes should periodically justify their continued existence. A process that no longer protects life, rights, safety, evidence, accountability, privacy, financial integrity, or lawful operation should be eligible for simplification or retirement.

## Public Founding Constitution MVP

The first implementation slice adds a public Constitution experience alongside the existing PWA.

### Canonical source

Create:

`docs/governance/CONSTITUTION.md`

It is the authoritative repository text for the founding draft.

The PWA must display a verified representation of that canonical version and clearly show:
- version;
- publication date;
- status: **FOUNDING DRAFT — NOT YET RATIFIED**;
- section anchors;
- source/version provenance; and
- an explanation that the draft begins the conversation rather than ending it.

### Public actions

The Constitution experience should make these actions prominent:

- Support
- Object
- Propose Change
- Submit Evidence
- Identify Harm
- Constitutional Challenge

In the first release, these actions must not directly edit the canonical Constitution or exercise production authority.

Each substantive proposal should receive a durable proposal identifier such as `NGP-000127` and preserve its history.

### Proposal record

A proposal should be able to represent:
- proposed text or feature;
- reason;
- affected people;
- supporting evidence;
- contrary evidence;
- strongest objections;
- privacy and security implications;
- financial conflicts;
- professional review where relevant;
- constitutional analysis;
- revisions;
- decision and reason;
- implementation reference;
- later outcome review.

Minority objections must not disappear merely because a proposal passes.

## Founding participation

The initial public process crowdsources creation, criticism, evidence, testing, and constitutional development before it crowdsources binding institutional control.

Participation can include:
- constitutional proposals;
- product/UX ideas;
- code;
- accessibility testing;
- research and contradictory evidence;
- resource verification;
- lived-experience observations;
- privacy/security review;
- professional review;
- corruption scenarios;
- institutional red teaming.

Contribution does not automatically confer production access, employment, equity, intellectual-property ownership, compensation, or additional voting power.

Recognition, money, and governing authority are distinct.

## Break NarcoGuard

Create a structured red-team program inviting people to identify ways NarcoGuard could become corrupted or unsafe.

Scenarios should include:
- wealthy donor or investor capture;
- hostile acquisition;
- government or insurer pressure;
- coordinated faction/party capture;
- 51%, 60%, and 75% voting blocs;
- duplicate identities, bots, and brigading;
- compromised administrators;
- compromised or overpowered AI;
- discriminatory algorithms;
- manufactured scarcity;
- bureaucratic paralysis;
- emergency-power abuse;
- attempts to remove minority rights;
- attempts to suppress opposition or evidence;
- attempts to access protected data through governance.

Credible institutional vulnerabilities become tracked constitutional or engineering issues.

## Constitutional change pipeline

A constitutional proposal follows:

`Idea -> Discussion -> Evidence -> Rights Review -> Professional Review when needed -> Revision -> Deliberation -> Ratification Process -> Implementation -> Outcome Review`

The eventual repository path follows:

`Ratified artifact -> authorized governance approval -> GitHub PR -> constitutional CI -> protected review -> merge -> permanent audit history`

No AI agent may propose a consequential change, approve itself, merge itself, deploy itself, and certify its own legitimacy as one uninterrupted authority chain.

## Progressive rollout

### Release 0 — Documentation
Constitution, Bill of Rights, North Star, governance design, PRD, and agent instructions. No runtime behavior changes.

### Release 1 — Public Founding Constitution
Read-only Constitution plus structured proposals, objections, challenges, evidence, harm reports, and visible history. No binding constitutional voting.

### Release 2 — Governance sandbox
Non-binding voting with test/sandbox authority. Red-team identity, Sybil, bot, faction, privacy, privilege, and election attacks.

### Release 3 — Founding Constitutional Convention
Verified human/stakeholder participation, public deliberation, evidence review, red teaming, revisions, and proposed v1.0 ratification.

### Release 4 — Democratic governance
Only after identity, election security, legal structure, privacy, accessibility, and anti-capture controls receive appropriate review.

### Release 5 — Machine-enforced safeguards
Selected constitutional controls become CI, authorization, data-access, and runtime policy gates. Machines still do not become the sole constitutional interpreter.

## Requirement identifiers

- **CONST-001:** vulnerable life cannot be traded for institutional advantage.
- **CONST-002:** protected personal data is not sold as a governance or revenue mechanism.
- **CONST-003:** AI has no constitutional vote.
- **CONST-004:** the Chief Steward cannot unilaterally amend or suspend the Constitution.
- **CONST-005:** an ordinary majority cannot abolish fundamental individual rights.
- **GOV-001:** people can submit structured proposals.
- **GOV-002:** every substantive proposal receives a durable identifier.
- **GOV-003:** proposal and revision history remains reviewable.
- **GOV-004:** constitutional changes use elevated approval rather than ordinary product administration.
- **GOV-POL-001:** external political affiliation has no role in ordinary assistance, constitutional standing, vote weighting, candidate ranking, or political AI personalization.
- **ELEC-001:** eventual binding elections require one verified eligible human to receive no more than one eligible ballot for the same contest.
- **ELEC-002:** eventual secret ballots preserve ballot secrecy.
- **ELEC-003:** AI cannot cast a ballot.
- **ELEC-004:** election disputes have meaningful human review.
- **SAFE-001:** governance failure cannot disable emergency functionality.
- **SAFE-002:** governance systems remain isolated from lifesaving paths unless a separately reviewed feature explicitly requires interaction.
- **SAFE-003:** consequential governance changes are auditable.
- **CAPTURE-001:** money does not increase constitutional vote weight.
- **CAPTURE-002:** a temporary majority cannot automatically control every independent constitutional institution.
- **CAPTURE-003:** governance must preserve legitimate opposition and constitutional challenge.
- **BUREAU-001:** new consequential administrative gates document the risk they control and why a simpler mechanism is insufficient.
- **BUREAU-002:** major administrative processes support periodic sunset/review.

## Repository integration

Existing `AGENTS.md` remains the master engineering instruction file. Do not replace it.

During implementation:
- strengthen `AGENTS.md` with constitutional/governance rules;
- optionally add a thin `CLAUDE.md` pointing agents to `AGENTS.md`, the Constitution, PRD, and approved design;
- add governance documents beneath `docs/governance/`;
- add the product PRD beneath `docs/product/`;
- protect constitutional paths through repository review controls where supported;
- add tests ensuring governance code cannot silently affect emergency functionality.

Recommended documentation structure:

```
AGENTS.md
CLAUDE.md
docs/
  product/
    PRD-COMMUNITY-GOVERNANCE.md
  governance/
    CONSTITUTION.md
    BILL_OF_RIGHTS.md
    NORTH_STAR.md
    ANTI_CORRUPTION.md
    AI_AUTHORITY.md
    DATA_RIGHTS.md
    ELECTIONS.md
    RATIFICATION.md
    AMENDMENT_PROCESS.md
    EVIDENCE_STANDARD.md
    CONSTITUTIONAL_IMPLEMENTATION.md
  superpowers/
    specs/
      2026-09-18-community-governance-design.md
```

## Safety boundary

This governance work is not itself a medical claim, clinical validation, legal entity structure, trust, cooperative, or statutory mission lock.

Repository language cannot by itself create legal ownership, fiduciary obligations, a charitable trust, nonprofit status, cooperative rights, or enforceable successor obligations. Those mechanisms require appropriate legal formation and review.

No governance feature should claim that NarcoGuard can detect, prevent, or treat every overdose.

## Success criteria for the first public release

The release is successful when:
1. a visitor can find and read the complete founding Constitution;
2. its draft/not-ratified status is unmistakable;
3. visitors can understand how to support, object, challenge, submit evidence, or propose a change;
4. no public action silently rewrites the Constitution;
5. political affiliation and financial contribution do not increase constitutional standing;
6. minority objections remain visible;
7. protected health/personal data is not exposed through governance;
8. emergency functionality is unchanged;
9. accessibility, lint, typecheck, build, PWA, privacy, and relevant security checks pass;
10. every released change is reviewable through Git history and the repository's normal PR process.

## Founding question

> If someday you—or someone you deeply loved—were vulnerable and depended upon NarcoGuard, what rules would you wish we had written before NarcoGuard became powerful enough to need them?

The purpose of this first release is to let the community begin answering that question together.
