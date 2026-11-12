/**
 * AI Skills Hub: Google Forms -> Google Doc -> GitHub -> website.
 *
 * One-time setup:
 *   1. Paste this file into a new project at https://script.google.com
 *   2. Project Settings > Script properties > add GITHUB_TOKEN
 *      (a fine-grained GitHub token for nidhi23aug/ai-skills-hub with "Contents: Read and write")
 *   3. Run setup() once and approve the permissions.
 *      It creates both forms, connects them to the doc, puts the form links on the website,
 *      and starts a 15-minute sync so direct edits to the doc also reach the site.
 */

const DOC_ID = '1qxDmLZrZBAEgMdAEvEhQBPTSILKeA01k-tW5cJKe5TI';
const REPO = 'nidhi23aug/ai-skills-hub';
const CATEGORIES = ['Research', 'Administrative for Research', 'General', 'Teaching and Education', 'Software and Development'];

function setup() {
  if (!PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN')) {
    throw new Error('Add GITHUB_TOKEN under Project Settings > Script properties first.');
  }
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));

  const add = FormApp.create('Add an AI skill you use')
    .setDescription('Share a skill, prompt or workflow you have used yourself and found useful. ' +
      'It appears in the AI Skills Hub catalog with your name and department within a few minutes.')
    .setConfirmationMessage('Thanks! Your skill will appear in the catalog within a few minutes.');
  add.addTextItem().setTitle('Skill name').setRequired(true);
  add.addMultipleChoiceItem().setTitle('Category').setChoiceValues(CATEGORIES).showOtherOption(true).setRequired(true);
  add.addTextItem().setTitle('What does it do?').setHelpText('One short sentence.').setRequired(true);
  add.addTextItem().setTitle('Link').setHelpText('Where someone can get it: a GitHub repo, a shared doc or a prompt link.').setRequired(true);
  add.addTextItem().setTitle('Your name').setRequired(true);
  add.addTextItem().setTitle('Department');
  add.addCheckboxItem().setTitle('Confirmation')
    .setChoiceValues(['I have used this myself and would recommend it to a colleague']).setRequired(true);

  const sug = FormApp.create('Suggest a change to an AI skill')
    .setDescription('Suggest an improvement, report a broken link or flag an outdated step. ' +
      'Your suggestion appears under the skill with your name.')
    .setConfirmationMessage('Thanks! Your suggestion will appear in the catalog within a few minutes.');
  sug.addTextItem().setTitle('Skill name').setRequired(true);
  sug.addParagraphTextItem().setTitle('Your suggestion').setRequired(true);
  sug.addTextItem().setTitle('Your name').setRequired(true);
  sug.addTextItem().setTitle('Department');

  ScriptApp.newTrigger('onAddSkill').forForm(add).onFormSubmit().create();
  ScriptApp.newTrigger('onSuggest').forForm(sug).onFormSubmit().create();
  ScriptApp.newTrigger('pushDoc').timeBased().everyMinutes(15).create();

  const config = { addFormUrl: add.getPublishedUrl(), suggestFormUrl: sug.getPublishedUrl() };
  githubPut('config.json', JSON.stringify(config, null, 2) + '\n', 'Connect the Google Forms');
  pushDoc();

  Logger.log('Add a skill form: ' + config.addFormUrl);
  Logger.log('Suggest a change form: ' + config.suggestFormUrl);
  Logger.log('Edit the forms here: ' + add.getEditUrl() + '  and  ' + sug.getEditUrl());
}

function answers(e) {
  const out = {};
  e.response.getItemResponses().forEach(r => {
    const v = r.getResponse();
    out[r.getItem().getTitle()] = Array.isArray(v) ? v.join(', ') : String(v || '').trim();
  });
  return out;
}

function clean(s) {
  return String(s || '').replace(/\s+/g, ' ').trim();
}

function onAddSkill(e) {
  const a = answers(e);
  const who = clean(a['Your name']) + (a['Department'] ? ', ' + clean(a['Department']) : '');
  const text = clean(a['Skill name']) + ' - ' + clean(a['What does it do?']) + ' - Added by ' + who;
  withLock(() => {
    addBullet(clean(a['Category']) || 'General', text, clean(a['Link']));
    pushDoc();
  });
}

function onSuggest(e) {
  const a = answers(e);
  const who = clean(a['Your name']) + (a['Department'] ? ', ' + clean(a['Department']) : '');
  const text = clean(a['Skill name']) + ': ' + clean(a['Your suggestion']) + ' - Suggested by ' + who;
  withLock(() => {
    addBullet('Suggestions', text, '');
    pushDoc();
  });
}

function withLock(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try { fn(); } finally { lock.releaseLock(); }
}

/** Add a bullet at the end of a heading's section, creating the heading if it is missing. */
function addBullet(heading, text, link) {
  const body = DocumentApp.openById(DOC_ID).getBody();
  const n = body.getNumChildren();
  let h = -1;
  for (let i = 0; i < n; i++) {
    const el = body.getChild(i);
    if (el.getType() === DocumentApp.ElementType.PARAGRAPH &&
        el.asParagraph().getText().trim().toLowerCase() === heading.toLowerCase()) { h = i; break; }
  }
  const full = link ? text + ' ' + link : text;
  let item;
  if (h === -1) {
    body.appendParagraph(heading);
    item = body.appendListItem(full).setGlyphType(DocumentApp.GlyphType.BULLET);
  } else {
    let last = null, pos = h + 1;
    for (let i = h + 1; i < n; i++) {
      const el = body.getChild(i);
      if (el.getType() !== DocumentApp.ElementType.LIST_ITEM) break;
      if (el.asListItem().getText().trim()) { last = el.asListItem(); pos = i + 1; }
    }
    item = body.insertListItem(pos, full);
    if (last) item.setListId(last); else item.setGlyphType(DocumentApp.GlyphType.BULLET);
  }
  if (link) {
    const start = full.length - link.length;
    item.editAsText().setLinkUrl(start, full.length - 1, link);
  }
}

/** Copy the doc to GitHub as plain text. GitHub then rebuilds the catalog page. */
function pushDoc() {
  const body = DocumentApp.openById(DOC_ID).getBody();
  const lines = [];
  for (let i = 0; i < body.getNumChildren(); i++) {
    const el = body.getChild(i);
    const type = el.getType();
    if (type !== DocumentApp.ElementType.PARAGRAPH && type !== DocumentApp.ElementType.LIST_ITEM) continue;
    let text = el.editAsText().getText().trim();
    // keep links hidden behind words
    const t = el.editAsText();
    t.getTextAttributeIndices().forEach(idx => {
      const url = t.getLinkUrl(idx);
      if (url && text.indexOf(url) === -1) text += ' ' + url;
    });
    lines.push(type === DocumentApp.ElementType.LIST_ITEM ? '- ' + text : text);
  }
  githubPut('data/catalog-doc.txt', lines.join('\n') + '\n', 'Update catalog from Google Doc');
}

function githubPut(path, content, message) {
  const token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
  const url = 'https://api.github.com/repos/' + REPO + '/contents/' + path;
  const headers = { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json' };
  const current = UrlFetchApp.fetch(url + '?ref=main', { headers: headers, muteHttpExceptions: true });
  let sha;
  if (current.getResponseCode() === 200) {
    const data = JSON.parse(current.getContentText());
    const existing = Utilities.newBlob(Utilities.base64Decode(data.content.replace(/\n/g, ''))).getDataAsString('UTF-8');
    if (existing === content) return;  // nothing changed
    sha = data.sha;
  }
  const res = UrlFetchApp.fetch(url, {
    method: 'put', headers: headers, muteHttpExceptions: true, contentType: 'application/json',
    payload: JSON.stringify({ message: message, branch: 'main', sha: sha,
      content: Utilities.base64Encode(content, Utilities.Charset.UTF_8) })
  });
  if (res.getResponseCode() >= 300) throw new Error('GitHub update failed: ' + res.getContentText());
}
