#!/usr/bin/env node
// gellmann — shared temp-git-repo fixture for tests. Lifted out of
// detect.test.js so hooks.test.js can build the same author/commit shapes
// without duplicating the git plumbing.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

function git(cwd, args, env = {}) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], env: { ...process.env, GIT_CONFIG_GLOBAL: os.devNull, GIT_CONFIG_SYSTEM: os.devNull, ...env } });
}

function repo(commitsBy) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gellmann-detect-'));
  git(dir, ['init', '-q']);
  let n = 0;
  for (const [name, email] of commitsBy) {
    fs.writeFileSync(path.join(dir, `f${n++}.txt`), 'x');
    git(dir, ['add', '.']);
    git(dir, ['-c', `user.name=${name}`, '-c', `user.email=${email}`, 'commit', '-qm', 'c'], {
      GIT_AUTHOR_NAME: name, GIT_AUTHOR_EMAIL: email, GIT_COMMITTER_NAME: name, GIT_COMMITTER_EMAIL: email,
    });
  }
  return dir;
}

module.exports = { git, repo };
