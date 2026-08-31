# ERS Airtable field map + webhook contracts

Airtable base is `appwADvsTt5QGvDey`. After import, attach Airtable + Anthropic credentials, then set `PARSE_WEBHOOK_URL` and `HR_INBOX`. To use OpenAI / OpenRouter instead of Claude, swap the chat-model subnode on each AI Agent.

All write paths send JSON and **must** respond with JSON (never an empty 200).
`sessionId` after Stage 1 is the **Review Sessions** Airtable record id.

---

## Tables

### Employees

| Field | Type | Notes |
|---|---|---|
| Name | Single line text | Primary |
| Email | Email | |
| Department | Single select or text | |
| Role | Single line text | |
| Reporting To | Link → Employees | Manager for Stage 5 email |
| Active | Checkbox | `get-employees` filters true |
| HR Notify Email | Email | Optional per-row override |

### Review Sessions

| Field | Type |
|---|---|
| Session ID | Autonumber or formula |
| Employee | Link → Employees |
| Month | Single line text |
| Year | Number |
| Status | Single select | Workflow writes **In Progress** (stages 1–4) then **Completed** (report). Add those two options in Airtable before import. Do not rely on n8n to create new select choices — the API token cannot. |
| Started At | Date |
| Completed At | Date |
| Stage 1 Time (Seconds) | Number |
| Stage 2 Time (Seconds) | Number |
| Stage 3 Time (Seconds) | Number |
| Stage 4 Time (Seconds) | Number |
| Final Score | Number |

### Stage 1 Self-Assessments

| Field | Type | Source |
|---|---|---|
| Session | Link → Review Sessions | `sessionId` |
| Employee Name | Link → Employees or text | `employeeId` / `employeeName` |
| Month | Text | `month` |
| Year | Number | `year` |
| Q1 Overall Performance | Long text | `answers[0].answer` |
| Q1 Char Count | Number | `answers[0].charCount` |
| Q2 Biggest Wins | Long text | `answers[1]` |
| Q2 Char Count | Number | |
| Q3 What Went Wrong | Long text | `answers[2]` |
| Q3 Char Count | Number | |
| Q4 Done Differently | Long text | `answers[3]` |
| Q4 Char Count | Number | |
| Q5 Projects Consuming Time | Long text | `answers[4]` |
| Q5 Char Count | Number | |
| Q6 Where Stuck | Long text | `answers[5]` |
| Q6 Char Count | Number | |
| Q7 Self Rating | Number | `answers[6].answer` |
| Total Char Count | Number | sum Q1–Q6 |
| Time Spent Seconds | Number | `timeSpentSeconds` |
| Raw JSON | Long text | stringify(answers) |

### Stage 2 Files

| Field | Type | Source |
|---|---|---|
| File Name | Text | `name` |
| Session | Link | `sessionId` |
| Employee Name | Link or text | `employeeId` |
| File URL | URL | `url` |
| File Type | Text | `type` |
| File Size KB | Number | `size / 1024` |
| Parse Status | Text | `ok` / `failed` / `skipped` |
| Parse Raw | Long text | parse webhook body |
| Projects Mapped | Text | optional AI later |
| Output Category | Text | |
| AI File Summary | Long text | |

### Stage 2 Work Evidences

| Field | Type | Source |
|---|---|---|
| Session | Link | `sessionId` |
| Files | Link → Stage 2 Files | file record ids |
| File Count | Number | |
| AI Raw Summary | Long text | first AI draft |
| Employee Edited Summary | Checkbox | `edited` |
| Final Summary | Long text | confirmed text |
| Projects Identified | Long text | CSV |
| Key Outputs | Long text | CSV |
| Contribution Level | Select High/Medium/Low | |
| AI Observations | Long text | notes + contradictions |
| Confirmation Accepted | Checkbox | true |
| Time Spent Seconds | Number | |

### Stage 3 Interviews

| Field | Type |
|---|---|
| Session | Link |
| Questions JSON | Long text |
| Context Used | Long text |
| Qn Question / Category / Answer / Char Count / Time Seconds / Paste Attempts | for n = 1–10 |
| Total Paste Attempts | Number |
| High Paste Flag | Checkbox |
| Time Spent Seconds | Number |

### Stage 4 Peer Feedbacks

One row per reviewee.

| Field | Type | Body |
|---|---|---|
| Session | Link | `sessionId` |
| Reviewer Name | Text | `employeeName` |
| Reviewee ID | Text | `colleagueName` (reviewee name, not record id) |
| Did Not Interact | Checkbox | `interaction === false` |
| Responds On Time | Number | `ratings.respondsOnTime` |
| Helps With Own Tasks | Number | `helpsWithOwnTasks` |
| Helps Beyond Scope | Number | |
| Cooperative Environment | Number | |
| Communication Quality | Number | |
| Professional Etiquette | Number | |
| Email Etiquette | Number | `emailEtiquette` |
| WhatsApp Etiquette | Number | `whatsappEtiquette` |
| Average Score | Number | |
| Bias Flag | Checkbox | |
| Bias Type | Text | None / All Low / All High / Uniform |
| Bias Reason | Text | |
| Bias Warning Shown | Checkbox | |
| Time Spent Seconds | Number | |

### Stage 5 Reports

| Field | Type |
|---|---|
| Session | Link |
| Employee Name | Text |
| Month / Year | |
| Overall Score | Number 0–100 |
| Quality of Work … Self Awareness | Number 0–10 (8 dimensions) |
| Major Achievements, Key Gaps, Development Priorities, Peer Feedback Summary, Cross Stage Observations | Long text |
| Full Report Markdown | Long text |
| Model Used | Text |
| Emailed To | Text |

---

## Webhook contracts

Base: `https://YOUR-N8N/webhook/<path>` (frontend uses `/api/n8n/<path>`).

### GET `get-employees`

Response:

```json
{ "employees": [{ "id": "rec…", "name": "", "department": "", "role": "", "email": "" }], "count": 0 }
```

### POST `submit-stage1`

```json
{
  "employeeId": "rec…",
  "employeeName": "Anya",
  "month": "August",
  "year": 2026,
  "answers": [{ "answer": "…", "charCount": 120 }],
  "timeSpentSeconds": 90
}
```

`answers[0–5]` text, `answers[6].answer` = self rating 1–10.

Response: `{ "success": true, "sessionId": "rec…", "stage1Id": "rec…" }`

### POST `ingest-stage2-file`

```json
{
  "sessionId": "rec…",
  "employeeId": "rec…",
  "name": "report.pdf",
  "type": "application/pdf",
  "size": 120000,
  "url": ""
}
```

n8n POSTs to `PARSE_WEBHOOK_URL` with `{ fileName, fileUrl, fileType, sessionId, employeeId }`.

Response: `{ "success": true, "fileId": "rec…", "parsed": true }`

### POST `stage2-summary`

```json
{ "sessionId": "rec…", "employeeId": "rec…", "stage1": { "q1": "", "q2": "", "q3": "", "q4": "", "q5": "", "q6": "", "q7": 7 } }
```

Uses **parsed file text already stored for the session** (challenge / negative bias vs Stage 1).

Response:

```json
{
  "projectsIdentified": ["…"],
  "keyOutputs": ["…"],
  "contributionLevel": "High",
  "summary": "…",
  "notes": "…",
  "contradictions": ["Stage 1 claimed X; files show Y"]
}
```

### POST `submit-stage2`

```json
{
  "sessionId": "rec…",
  "employeeId": "rec…",
  "summary": "",
  "edited": false,
  "projectsIdentified": "a, b",
  "keyOutputs": "c, d",
  "contributionLevel": "Medium",
  "aiObservations": "",
  "confirmationAccepted": true,
  "timeSpentSeconds": 120
}
```

Response: `{ "success": true, "stage2Id": "rec…" }`

### POST `stage3-questions`

```json
{
  "sessionId": "rec…",
  "employeeId": "rec…",
  "stage1Summary": "",
  "stage2Summary": "",
  "projectsIdentified": "a, b"
}
```

Response: `{ "questions": [{ "id": "q1", "question": "", "category": "Reasoning" }] }` (exactly 10)

### POST `submit-stage3`

```json
{
  "sessionId": "rec…",
  "employeeId": "rec…",
  "qa": [{ "question": "", "category": "", "answer": "", "charCount": 0, "timeSeconds": 0, "pasteAttempts": 0 }],
  "contextUsed": "",
  "timeSpentSeconds": 0
}
```

Response: `{ "success": true, "stage3Id": "rec…", "pasteAttempts": 0, "flagged": false }`

### POST `submit-stage4`

```json
{
  "sessionId": "rec…",
  "employeeId": "rec…",
  "employeeName": "",
  "month": "August",
  "timeSpentSeconds": 0,
  "peerFeedback": [{
    "colleagueId": "Priyanka",
    "colleagueName": "Priyanka",
    "revieweeName": "Priyanka",
    "interaction": true,
    "biasWarningShown": false,
    "ratings": {
      "respondsOnTime": 5,
      "helpsWithOwnTasks": 5,
      "helpsBeyondScope": 5,
      "cooperativeEnvironment": 5,
      "communicationQuality": 5,
      "professionalEtiquette": 5,
      "emailEtiquette": 5,
      "whatsappEtiquette": 5
    }
  }]
}
```

Response: `{ "success": true }`

### POST `generate-report`

Sends `sessionId`, employee meta, `stage1` q1–q7, `stage2`, `stage3.qa`, `stage4[]`.

Response:

```json
{
  "overallScore": 78,
  "dimensions": [{ "name": "Quality of Work", "score": 8 }],
  "majorAchievements": "",
  "keyGaps": "",
  "developmentPriorities": "",
  "peerFeedbackSummary": "",
  "aiObservations": "",
  "fullReportMarkdown": ""
}
```

Then n8n emails Reporting To + `HR_INBOX`.
