'use strict';

/**
 * version.js — single source of truth for the app version.
 * Imported by ES modules. Classic scripts (versionCheck.js, sw.js cache name,
 * manifest.json) carry their own copy — CI (scripts/check-static.mjs)
 * verifies they all agree. Bump everywhere on release.
 */
export const VERSION = '5.0.0';
