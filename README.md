# University AI Skills Hub

A catalog of AI skills, prompts and workflows that colleagues actually use. Anyone can add a skill or suggest a change through a Google Form. Nobody needs a GitHub account.

Live site: https://nidhi23aug.github.io/ai-skills-hub/

## How it works

```
Google Form  ->  "AI Skills Hub Catalog" Google Doc  ->  GitHub (data/catalog-doc.txt)  ->  website
```

1. Someone fills in the "Add an AI skill you use" form or the "Suggest a change" form.
2. The Apps Script in `apps-script/Code.gs` adds a bullet to the Google Doc, under the matching category or under a "Suggestions" heading.
3. The script copies the doc to `data/catalog-doc.txt` in this repo. It does this right after each form answer, and every 15 minutes to pick up direct edits to the doc.
4. A GitHub Action runs `scripts/sync.py`, which turns the doc into `data/skills.json`, and GitHub Pages updates the site.

New entries show up on the site a few minutes after someone submits a form.

The Google Doc is the catalog. To fix, move or remove a skill, edit the doc. Use one line per skill:

```
Category name
- Skill name - one short sentence - Added by Name, Department https://link
```

`data/seed.json` holds the curated description and "Made by" credit for the starting skills. For any skill listed there, the curated description takes priority over the doc's text.

## One-time setup

1. Create a fine-grained GitHub token at https://github.com/settings/personal-access-tokens. Limit it to the `nidhi23aug/ai-skills-hub` repository, give it "Contents: Read and write", and leave every other permission off.
2. Open https://script.google.com, start a new project and paste in `apps-script/Code.gs`.
3. In Project Settings, under Script properties, add `GITHUB_TOKEN` and paste the token as its value.
4. Choose `setup` in the function menu, click Run and approve the permissions.

`setup` creates both forms, connects them to the doc and puts the form links on the website. The execution log prints the links to share and the links for editing the forms.

To push a doc edit right away instead of waiting up to 15 minutes, run `pushDoc` in the script editor.

## Notes

- Form answers go straight into the catalog with no approval step. To take something down, delete its line in the doc.
- Anyone can ask for a skill to be removed through the "Suggest a change" form. The skill then shows "Removal requested" until the owner deletes its line (and the request line) in the doc.
- Each skill has a thumbs-up button. Counts are kept by the Apps Script web app (step 4 in `apps-script/Code.gs`), and each browser remembers its own vote. It is a light signal, not a secure poll.
- Contributor names and departments appear publicly on the site. The form descriptions tell people this.
- Being listed means a colleague found the skill useful. It does not mean the university has security-reviewed it. Skills that touch university systems carry a caution note.
