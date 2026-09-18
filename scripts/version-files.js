#!/usr/bin/env node
// Single source of truth for where gellmann declares its version, shared by
// scripts/check-versions.js (the guard) and scripts/bump-version.js (the
// stamper). Duplicating this list would let the two drift apart, which is the
// exact failure the guard exists to catch.
//
// Version scheme — two forms, one base:
//   release  X.Y.Z                      what a v-tag ships
//   dev      X.Y.Z-YYYYMMDDTHHMMSSZ     every install-worthy change
//
// The dev suffix exists because Claude Code keys its plugin install cache on
// the version STRING: with the version unchanged, `claude plugin update`
// reports "already at the latest version" and keeps serving stale files. Any
// change to the string forces a fresh copy (verified 2026-09-14: the CLI
// compares strings for inequality, not semver precedence, so it even accepts
// a move from 0.2.0 to 0.2.0-<stamp>).
//
// ISO 8601 *basic* format on purpose: no colons. Colons are legal in a semver
// prerelease and the CLI accepts them, but it sanitizes them to hyphens in the
// on-disk cache path, so two versions differing only in ':' vs '-' collide on
// one directory — and colons are illegal in Windows filenames, which matters
// because gellmann ships a PowerShell statusline.

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

// X.Y.Z, optionally followed by a prerelease. Release tags require the bare form.
const RELEASE_SEMVER = /^\d+\.\d+\.\d+$/;
const DEV_STAMP = /^\d{8}T\d{6}Z$/;
const ANY_VERSION = /^(\d+\.\d+\.\d+)(?:-([0-9A-Za-z.-]+))?$/;

// Every file that declares the project version, and who reads it. Add new host
// manifests here so a future ecosystem can't drift unnoticed.
const JSON_FILES = [
  '.claude-plugin/plugin.json',  // Claude Code plugin — what users install
  '.codex-plugin/plugin.json',   // Codex plugin
  '.devin-plugin/plugin.json',   // Devin CLI plugin
  '.github/plugin/plugin.json',  // Copilot plugin
  '.qoder-plugin/plugin.json',   // Qoder plugin
  'gemini-extension.json',       // Gemini CLI extension
  'package.json',                // pi-package / repo root
  'gellmann-mcp/package.json',   // MCP server (private, internal-only)
];

// Same version, different shapes. Kept separate because reading and writing
// them is not a plain `JSON.parse().version`.
const YAML_FILES = ['plugin.yaml'];                      // Hermes Agent manifest
const LOCK_FILES = ['gellmann-mcp/package-lock.json'];   // mirrors its package.json

const ALL_FILES = [...JSON_FILES, ...YAML_FILES, ...LOCK_FILES];

function readRaw(relPath) {
  // Strip a UTF-8 BOM some Windows editors prepend (breaks JSON.parse).
  return fs.readFileSync(path.join(root, relPath), 'utf8').replace(/^﻿/, '');
}

function writeRaw(relPath, text) {
  fs.writeFileSync(path.join(root, relPath), text);
}

// Read the declared version from any of the three file shapes.
function readVersion(relPath) {
  const raw = readRaw(relPath);
  try {
    if (YAML_FILES.includes(relPath)) {
      const m = raw.match(/^version:\s*(\S+)\s*$/m);
      return m ? m[1] : undefined;
    }
    return JSON.parse(raw).version;
  } catch (e) {
    throw new Error(`${relPath}: ${e.message}`);
  }
}

// Rewrite the version in place, preserving formatting. These files are
// hand-maintained and reviewed as diffs, so a JSON.stringify round-trip that
// reflows every line is worse than a targeted replacement.
function writeVersion(relPath, version) {
  const raw = readRaw(relPath);

  if (YAML_FILES.includes(relPath)) {
    const next = raw.replace(/^version:\s*\S+\s*$/m, `version: ${version}`);
    if (next === raw) throw new Error(`${relPath}: no top-level "version:" line to rewrite`);
    return writeRaw(relPath, next);
  }

  if (LOCK_FILES.includes(relPath)) {
    // npm lockfiles carry the version twice: top level and packages[""].
    // Leaving the second stale makes `npm ci` disagree with package.json.
    const lock = JSON.parse(raw);
    const before = JSON.stringify(lock);
    lock.version = version;
    if (lock.packages && lock.packages['']) lock.packages[''].version = version;
    if (JSON.stringify(lock) === before) throw new Error(`${relPath}: version unchanged`);
    return writeRaw(relPath, JSON.stringify(lock, null, 2) + '\n');
  }

  // Replace only the first top-level "version": "..." so a dependency's own
  // version field can never be caught by accident.
  const next = raw.replace(/("version"\s*:\s*)"[^"]*"/, `$1"${version}"`);
  if (next === raw) throw new Error(`${relPath}: no "version" field to rewrite`);
  return writeRaw(relPath, next);
}

function parseVersion(version) {
  const m = ANY_VERSION.exec(String(version || ''));
  return m ? { base: m[1], prerelease: m[2] || null } : null;
}

// UTC, ISO 8601 basic, second precision: 20260914T104455Z
function devStamp(now = new Date()) {
  return now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

module.exports = {
  root, ALL_FILES, JSON_FILES, YAML_FILES, LOCK_FILES,
  RELEASE_SEMVER, DEV_STAMP, ANY_VERSION,
  readVersion, writeVersion, parseVersion, devStamp,
};
