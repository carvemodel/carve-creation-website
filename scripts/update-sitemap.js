#!/usr/bin/env node
// Updates <lastmod> in sitemap.xml from each page's real modification date.
//
//   node scripts/update-sitemap.js          rewrite sitemap.xml
//   node scripts/update-sitemap.js --check  report changes only, write nothing
//
// For every <loc> already in sitemap.xml, the lastmod becomes:
//   - today, if the page file has uncommitted changes
//   - otherwise the date of the last git commit that touched the page file,
//     ignoring sitewide commits that touched 15+ pages
// A date is never moved backwards.
// URLs are never added or removed, so only pages already listed (and never the
// legacy Carve Model URLs) appear in the sitemap. Add or remove <url> entries
// by hand. Run this after committing page changes (or before, for uncommitted
// ones) and commit the updated sitemap.xml.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const sitemapPath = path.join(root, 'sitemap.xml');
const checkOnly = process.argv.includes('--check');

function git(args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

function today() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

// Commits touching this many HTML pages or more are treated as sitewide edits
// (nav, footer, cache bumps, tag changes) and do not count as a page's own
// significant content update.
const SITEWIDE_COMMIT_PAGES = 15;
const commitPageCount = new Map();

function pageCount(hash) {
  if (!commitPageCount.has(hash)) {
    const files = git(['show', '--name-only', '--format=', hash]).split('\n');
    commitPageCount.set(hash, files.filter((f) => f.endsWith('.html')).length);
  }
  return commitPageCount.get(hash);
}

// Date of the newest commit that changed this file and was not a sitewide edit.
function lastContentDate(file) {
  const lines = git(['log', '--format=%H %cs', '--', file]).split('\n').filter(Boolean);
  for (const line of lines) {
    const [hash, date] = line.split(' ');
    if (pageCount(hash) < SITEWIDE_COMMIT_PAGES) return date;
  }
  return '';
}

function fileForUrl(loc) {
  const pathname = new URL(loc).pathname;
  return pathname === '/' ? 'index.html' : pathname.replace(/^\//, '');
}

const dirty = new Set(
  git(['status', '--porcelain'])
    .split('\n')
    .filter(Boolean)
    .map((line) => line.slice(3).replace(/^"|"$/g, ''))
);

let xml = fs.readFileSync(sitemapPath, 'utf8');
const changes = [];

xml = xml.replace(
  /<url><loc>([^<]+)<\/loc><lastmod>([^<]+)<\/lastmod><\/url>/g,
  (match, loc, oldMod) => {
    const file = fileForUrl(loc);
    if (!fs.existsSync(path.join(root, file))) {
      console.warn('Skipping (file not found): ' + loc);
      return match;
    }
    let newMod = dirty.has(file) ? today() : lastContentDate(file);
    // Never move a date backwards, and keep the existing date when there is
    // no qualifying commit.
    if (!newMod || newMod < oldMod) newMod = oldMod;
    if (newMod !== oldMod) changes.push(file + ': ' + oldMod + ' -> ' + newMod);
    return '<url><loc>' + loc + '</loc><lastmod>' + newMod + '</lastmod></url>';
  }
);

if (changes.length) console.log(changes.join('\n'));
console.log(changes.length + ' lastmod value(s) ' + (checkOnly ? 'would change.' : 'updated.'));
if (!checkOnly && changes.length) fs.writeFileSync(sitemapPath, xml);
