# University AI Skills Hub

A catalog of AI skills, prompts and workflows that colleagues actually use. Colleagues add skills or suggest changes through Google Forms, so they don't need a GitHub account. Each entry shows who added it, and each suggestion shows who made it.

Live site: https://nidhi23aug.github.io/ai-skills-hub/

## How it works

1. Someone fills in the "Add a skill" form or the "Suggest a change" form.
2. Their answer lands in a Google Sheet with a `Status` column. A catalog admin sets `Status` to `Published` after checking that the category fits and the link opens.
3. Every hour, a GitHub Action (`.github/workflows/sync.yml`) reads the published rows, merges them with `data/seed.json` and commits `data/skills.json`.
4. GitHub Pages serves the updated page.

Rows marked anything other than `Published` never reach the site. To publish right away, open Actions, choose "Sync catalog from forms" and click "Run workflow".

## Setting up the forms

Create two Google Forms. The question titles must start with the words below, because the sync script matches columns by their opening words.

**Add a skill**

| Question | Type |
|---|---|
| Skill name | Short answer, required |
| Category | Multiple choice: Research, Administrative for Research, General, Teaching and Education, Software and Development |
| What does it do? | Paragraph, one or two sentences, required |
| How do you use it? | Paragraph, required |
| Where can someone get it? | Short answer (link or where to find it), required |
| Platform | Multiple choice: Claude, ChatGPT, Codex, Gemini, Platform-independent, Other |
| Who made it? | Short answer, optional (leave blank if you made it) |
| Your name | Short answer, required |
| Department | Short answer |
| Limitations | Paragraph |
| Does it use university systems or data? | Yes / No |
| I have personally used this skill and would recommend it | Checkbox, required |

**Suggest a change**

| Question | Type |
|---|---|
| Skill name | Short answer, required |
| Your suggestion | Paragraph (an improvement, a broken link, an outdated step), required |
| Your name | Short answer, required |
| Department | Short answer |

Tell people on both forms that their name and department will appear publicly on the site.

Then for each form:

1. In the form's Responses tab, link it to a Google Sheet.
2. In the sheet, add a column to the right named `Status`.
3. Choose File, then Share, then Publish to web. Pick the responses sheet and the CSV format, then copy the link.

In this repo, open Settings, then Secrets and variables, then Actions, then the Variables tab. Add:

- `ADD_FORM_CSV`: the CSV link for the "Add a skill" responses
- `SUGGEST_FORM_CSV`: the CSV link for the "Suggest a change" responses

Last, put the two form links (the ones people fill in) in `config.json` so the site's buttons open them.

## Notes

- A published CSV can be read by anyone who has its link. Don't collect email addresses or anything private on these forms.
- If someone submits a skill whose name matches an existing entry, the newer details replace the old ones and the entry shows "Updated by".
- To edit the starting entries directly, change `data/seed.json`. The next sync rebuilds `data/skills.json`.
- To test the sync locally: `ADD_FORM_CSV=... SUGGEST_FORM_CSV=... python3 scripts/sync.py`. It uses only the Python standard library.
- Being listed here means a colleague found the skill useful. It does not mean the university has reviewed it for security. Skills that touch university systems carry a caution note.
