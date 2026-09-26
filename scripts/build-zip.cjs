#!/usr/bin/env node
'use strict';

const { execFileSync } = require('node:child_process');
const { mkdirSync } = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist', 'utmkeeperflow.zip');

mkdirSync(path.dirname(output), { recursive: true });
// Package committed files only; worktree attributes honor .gitattributes
// even before it has been committed.
execFileSync('git', [
  'archive',
  '--format=zip',
  '--worktree-attributes',
  '--prefix=utmkeeperflow/',
  `--output=${output}`,
  'HEAD',
], { cwd: root, stdio: 'inherit' });

const commit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
  cwd: root,
  encoding: 'utf8',
}).trim();
console.log(`Created ${output} from committed HEAD (${commit})`);
