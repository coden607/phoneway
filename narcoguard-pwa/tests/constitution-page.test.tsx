import { test } from "node:test"
import assert from "node:assert/strict"
import { renderToStaticMarkup } from "react-dom/server"
import React from "react"
import ConstitutionPage from "../app/constitution/page"

test("the founding draft offers structured, nonbinding public submissions", () => {
  const html = renderToStaticMarkup(<ConstitutionPage />)
  for (const action of ["Support", "Object", "Propose Change", "Submit Evidence", "Identify Harm", "Constitutional Challenge"]) {
    assert.ok(html.includes(action), `${action} must be discoverable`)
  }
  assert.match(html, /template=constitution\.yml/)
  assert.match(html, /FOUNDING DRAFT — NOT YET RATIFIED/)
  assert.match(html, /submissions are advisory/i)
})

test("the founding draft protects a non-waivable person-led rights floor", () => {
  const html = renderToStaticMarkup(<ConstitutionPage />)
  for (const protection of [
    /no ordinary majority may remove or narrow the rights floor/i,
    /ordinary assistance.*must never depend on participation/i,
    /refuse or revoke location and contact sharing/i,
    /independent human appeal/i,
    /written reasons/i,
    /retaliation/i,
  ]) {
    assert.match(html, protection)
  }
})

test("the draft divides authority and makes conflicts reviewable", () => {
  const html = renderToStaticMarkup(<ConstitutionPage />)
  for (const protection of [
    /no person may hold more than one constitutional office/i,
    /staggered terms/i,
    /removal only for documented cause/i,
    /recuse from affected decisions/i,
    /independent replacement/i,
    /minority objections/i,
  ]) {
    assert.match(html, protection)
  }
})

test("emergency powers and constitutional amendments cannot bypass rights", () => {
  const html = renderToStaticMarkup(<ConstitutionPage />)
  for (const protection of [
    /no office, majority, funder, or ai may create its own emergency authority/i,
    /expire automatically at a pre-set time/i,
    /independent reviewer.*within 72 hours/i,
    /emergency action may never suspend the rights floor/i,
    /affected-person approval/i,
    /independent rights review/i,
    /cooling-off period/i,
  ]) {
    assert.match(html, protection)
  }
  assert.match(html, /proposed commitments.*not currently enforceable/i)
})
