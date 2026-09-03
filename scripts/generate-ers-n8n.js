/**
 * Generates Seven Fincorp ERS — Flow.json
 * Airtable base is baked in. Attach Airtable + Anthropic (or swap the chat model) after import.
 * Placeholders: PARSE_WEBHOOK_URL, HR_INBOX, AIRTABLE_CREDENTIAL_ID, ANTHROPIC_CREDENTIAL_ID
 */
const fs = require('fs');
const path = require('path');

const BASE = 'appwADvsTt5QGvDey';
const PARSE = 'PARSE_WEBHOOK_URL';
const HR = 'HR_INBOX';
const CLAUDE_MODEL = 'claude-sonnet-4-20250514';

function webhook(id, name, httpMethod, route, x, y, webhookId, extraOptions = {}) {
  return {
    parameters: {
      ...(httpMethod !== 'GET' ? { httpMethod } : { httpMethod: 'GET' }),
      path: route,
      responseMode: 'responseNode',
      options: extraOptions,
    },
    id,
    name,
    type: 'n8n-nodes-base.webhook',
    typeVersion: 2,
    position: [x, y],
    webhookId,
  };
}

function code(id, name, jsCode, x, y) {
  return {
    parameters: { jsCode },
    id,
    name,
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [x, y],
  };
}

function respond(id, name, bodyExpr, x, y) {
  return {
    parameters: {
      respondWith: 'json',
      responseBody: `={{ ${bodyExpr} }}`,
      options: { responseCode: 200 },
    },
    id,
    name,
    type: 'n8n-nodes-base.respondToWebhook',
    typeVersion: 1.1,
    position: [x, y],
  };
}

function httpMultipartFile(id, name, urlExpr, x, y) {
  return {
    parameters: {
      method: 'POST',
      url: urlExpr,
      sendBody: true,
      contentType: 'multipart-form-data',
      bodyParameters: {
        parameters: [
          { name: 'fileName', value: '={{ $json.name }}' },
          { name: 'fileType', value: '={{ $json.type }}' },
          { name: 'sessionId', value: '={{ $json.sessionId }}' },
          { name: 'employeeId', value: '={{ $json.employeeId }}' },
          { parameterType: 'formBinaryData', name: 'file', inputDataFieldName: 'data' },
        ],
      },
      options: { timeout: 120000, allowUnauthorizedCerts: false },
    },
    id,
    name,
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.2,
    position: [x, y],
    onError: 'continueRegularOutput',
  };
}

function httpJson(id, name, method, urlExpr, bodyExpr, x, y, extraHeaders = []) {
  return {
    parameters: {
      method,
      url: urlExpr,
      sendHeaders: true,
      headerParameters: {
        parameters: [{ name: 'Content-Type', value: 'application/json' }, ...extraHeaders],
      },
      sendBody: true,
      specifyBody: 'json',
      jsonBody: bodyExpr,
      options: { timeout: 120000, allowUnauthorizedCerts: false },
    },
    id,
    name,
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.2,
    position: [x, y],
    onError: 'continueRegularOutput',
  };
}

function aiAgent(id, name, x, y, systemMessage) {
  return {
    parameters: {
      promptType: 'define',
      text: '={{ $json.prompt }}',
      options: {
        systemMessage:
          systemMessage ||
          'Return ONLY valid JSON. No markdown fences, no preamble.',
      },
    },
    id,
    name,
    type: '@n8n/n8n-nodes-langchain.agent',
    typeVersion: 2.1,
    position: [x, y],
    onError: 'continueRegularOutput',
  };
}

function claudeModel(id, name, x, y) {
  return {
    parameters: {
      model: {
        __rl: true,
        value: CLAUDE_MODEL,
        mode: 'id',
      },
      options: {},
    },
    id,
    name,
    type: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
    typeVersion: 1.3,
    position: [x, y],
    credentials: {
      anthropicApi: { id: 'ANTHROPIC_CREDENTIAL_ID', name: 'Anthropic account' },
    },
  };
}

function airtableSearch(id, name, table, x, y) {
  return {
    parameters: {
      operation: 'search',
      base: { __rl: true, value: BASE, mode: 'id', cachedResultName: 'ERS' },
      table: { __rl: true, value: table, mode: 'name' },
      options: {},
    },
    id,
    name,
    type: 'n8n-nodes-base.airtable',
    typeVersion: 2.2,
    position: [x, y],
    credentials: {
      airtableTokenApi: { id: 'AIRTABLE_CREDENTIAL_ID', name: 'Airtable account' },
    },
  };
}

function airtableCreate(id, name, table, valueMap, x, y, continueOnError = false) {
  const node = {
    parameters: {
      operation: 'create',
      base: { __rl: true, value: BASE, mode: 'id', cachedResultName: 'ERS' },
      table: { __rl: true, value: table, mode: 'name' },
      columns: {
        mappingMode: 'defineBelow',
        value: valueMap,
        matchingColumns: [],
        schema: Object.keys(valueMap).map((k) => ({
          id: k,
          displayName: k,
          required: false,
          defaultMatch: false,
          canBeUsedToMatch: true,
          display: true,
          type: 'string',
          readOnly: false,
          removed: false,
        })),
      },
      options: {},
    },
    id,
    name,
    type: 'n8n-nodes-base.airtable',
    typeVersion: 2.2,
    position: [x, y],
    credentials: {
      airtableTokenApi: { id: 'AIRTABLE_CREDENTIAL_ID', name: 'Airtable account' },
    },
  };
  if (continueOnError) node.onError = 'continueRegularOutput';
  return node;
}

function airtableUpdate(id, name, table, valueMap, x, y, continueOnError = false) {
  const node = {
    parameters: {
      operation: 'update',
      base: { __rl: true, value: BASE, mode: 'id', cachedResultName: 'ERS' },
      table: { __rl: true, value: table, mode: 'name' },
      columns: {
        mappingMode: 'defineBelow',
        value: valueMap,
        matchingColumns: ['id'],
        schema: [
          {
            id: 'id',
            displayName: 'id',
            required: false,
            defaultMatch: true,
            canBeUsedToMatch: true,
            display: true,
            type: 'string',
            readOnly: false,
            removed: false,
          },
          ...Object.keys(valueMap)
            .filter((k) => k !== 'id')
            .map((k) => ({
              id: k,
              displayName: k,
              required: false,
              defaultMatch: false,
              canBeUsedToMatch: true,
              display: true,
              type: 'string',
              readOnly: false,
              removed: false,
            })),
        ],
      },
      options: {},
    },
    id,
    name,
    type: 'n8n-nodes-base.airtable',
    typeVersion: 2.2,
    position: [x, y],
    credentials: {
      airtableTokenApi: { id: 'AIRTABLE_CREDENTIAL_ID', name: 'Airtable account' },
    },
  };
  if (continueOnError) node.onError = 'continueRegularOutput';
  return node;
}

function iff(id, name, left, x, y, opts = {}) {
  return {
    parameters: {
      conditions: {
        options: { caseSensitive: false, leftValue: '', typeValidation: 'loose', version: 1 },
        conditions: [
          {
            leftValue: left,
            rightValue: opts.rightValue || '',
            operator: { type: 'string', operation: opts.operation || 'notEmpty' },
          },
        ],
        combinator: 'and',
      },
      options: {},
    },
    id,
    name,
    type: 'n8n-nodes-base.if',
    typeVersion: 2.1,
    position: [x, y],
  };
}

const REC_ID_RE = '^rec[A-Za-z0-9]{10,}$';

function validSessionCode(id, name, x, y) {
  return code(
    id,
    name,
    `const sid=String($json.sessionId||'');const ok=/^rec[A-Za-z0-9]{10,}$/.test(sid);return [{json:{success:false,error:'sessionId must be a real Airtable Review Sessions record id from submit-stage1',sessionId:sid||null}}];`,
    x,
    y,
  );
}

function emailNode(id, name, x, y) {
  return {
    parameters: {
      fromEmail: 'reviews@sevenfincorp.in',
      toEmail: `={{ $json.toEmail }}`,
      subject: `={{ $json.subject }}`,
      emailType: 'text',
      message: `={{ $json.message }}`,
      options: {},
    },
    id,
    name,
    type: 'n8n-nodes-base.emailSend',
    typeVersion: 2.1,
    position: [x, y],
    credentials: {
      smtp: { id: 'SMTP_CREDENTIAL_ID', name: 'SMTP account' },
    },
  };
}

const nodes = [];

// ── GET employees ──
nodes.push(
  webhook('wh-emp', 'WH Get Employees', 'GET', 'get-employees', 0, 0, 'get-employees-001'),
  airtableSearch('at-emp', 'AT List Employees', 'Employees', 240, 0),
  airtableSearch('at-emp-sess', 'AT List Sessions', 'Review Sessions', 360, 80),
  code(
    'code-emp',
    'Format Employees',
    `const now=new Date();const month=now.toLocaleString('en-US',{month:'long'});const year=now.getFullYear();const empItems=$('AT List Employees').all();const sessItems=$input.all();const empIds=f=>{const emp=f.Employee;if(!emp)return [];return Array.isArray(emp)?emp.map(e=>typeof e==='object'&&e?e.id:e):[emp];};const latest={};for(const i of sessItems){const f=i.json.fields||{};if(String(f.Month)!==month||Number(f.Year)!==year)continue;for(const eid of empIds(f)){latest[eid]={sessionId:i.json.id,status:String(f.Status||'')};}}const employees=empItems.map(i=>{const f=i.json.fields||i.json;const name=f.Name||f.name||'';const sess=latest[i.json.id];const submittedThisPeriod=!!sess;let lastCompletedStage=0;if(sess){lastCompletedStage=/completed/i.test(sess.status)?5:1;}return {id:i.json.id,name,department:f.Department||'',role:f.Role||'',email:f.Email||'',active:f.Active!==false,submittedThisPeriod,sessionId:sess?sess.sessionId:'',lastCompletedStage};}).filter(e=>{if(!e.name||!e.id)return false;if(/^NOTES:/i.test(e.name))return false;const junk=new Set(['name','single line text','email','department','role']);return !junk.has(e.name.toLowerCase());});return [{json:{employees,count:employees.length}}];`,
    480,
    0,
  ),
  respond('res-emp', 'Respond Employees', 'JSON.stringify($json)', 720, 0),
);

// ── POST stage1 ──
nodes.push(
  webhook('wh-s1', 'WH Submit Stage1', 'POST', 'submit-stage1', 0, 280, 'submit-stage1-001'),
  code(
    'code-s1-ex',
    'Extract Stage1',
    `const b=$input.first().json.body||$input.first().json;const answers=b.answers||[];const now=new Date().toISOString().split('T')[0];return [{json:{employeeId:b.employeeId,employeeName:b.employeeName||'',month:b.month,year:Number(b.year),answers,timeSpentSeconds:Number(b.timeSpentSeconds)||0,submittedAt:now,q1:answers[0]?.answer||'',c1:answers[0]?.charCount||(answers[0]?.answer||'').length||0,q2:answers[1]?.answer||'',c2:answers[1]?.charCount||0,q3:answers[2]?.answer||'',c3:answers[2]?.charCount||0,q4:answers[3]?.answer||'',c4:answers[3]?.charCount||(answers[3]?.answer||'').length||0,q5:answers[4]?.answer||'',c5:answers[4]?.charCount||0,q6:answers[5]?.answer||'',c6:answers[5]?.charCount||0,q7:Number(answers[6]?.answer||5),totalChars:[0,1,2,3,4,5].reduce((s,i)=>s+(Number(answers[i]?.charCount)||String(answers[i]?.answer||'').length),0)}}];`,
    240,
    280,
  ),
  airtableSearch('at-s1-sess', 'AT Search Sessions', 'Review Sessions', 480, 280),
  code(
    'code-s1-find',
    'Find Or New Session',
    `const pl=$('Extract Stage1').item.json;const match=items.find(i=>{const f=i.json.fields||{};if(String(f.Month)!==String(pl.month)||Number(f.Year)!==pl.year)return false;const emp=f.Employee;if(!emp)return false;const ids=Array.isArray(emp)?emp.map(e=>typeof e==='object'?e.id:e):[emp];return ids.includes(pl.employeeId);});return [{json:{...pl,existingSessionId:match?match.json.id:null}}];`,
    720,
    280,
  ),
  iff('if-s1', 'Session Exists?', '={{ $json.existingSessionId }}', 960, 280),
  airtableCreate(
    'at-s1-new',
    'AT Create Session',
    'Review Sessions',
    {
      Employee: "={{ [$('Find Or New Session').item.json.employeeId] }}",
      Month: "={{ $('Find Or New Session').item.json.month }}",
      Year: "={{ $('Find Or New Session').item.json.year }}",
      Status: 'In Progress',
      'Started At': "={{ $('Find Or New Session').item.json.submittedAt }}",
    },
    1200,
    160,
    true,
  ),
  code(
    'code-s1-sid',
    'Resolve Session Id',
    `const pl=$('Find Or New Session').item.json;const sid=pl.existingSessionId||$input.first().json.id;return [{json:{...pl,sessionId:sid}}];`,
    1440,
    280,
  ),
  airtableCreate(
    'at-s1-rec',
    'AT Create Stage1',
    'Stage 1 Self-Assessments',
    {
      Session: '={{ [$json.sessionId] }}',
      'Employee Name': '={{ $json.employeeName }}',
      Month: '={{ $json.month }}',
      Year: '={{ $json.year }}',
      'Q1 Overall Performance': '={{ $json.q1 }}',
      'Q1 Char Count': '={{ $json.c1 }}',
      'Q2 Biggest Wins': '={{ $json.q2 }}',
      'Q2 Char Count': '={{ $json.c2 }}',
      'Q3 What Went Wrong': '={{ $json.q3 }}',
      'Q3 Char Count': '={{ $json.c3 }}',
      'Q4 Done Differently': '={{ $json.q4 }}',
      'Q4 Char Count': '={{ $json.c4 }}',
      'Q5 Projects Consuming Time': '={{ $json.q5 }}',
      'Q5 Char Count': '={{ $json.c5 }}',
      'Q6 Where Stuck': '={{ $json.q6 }}',
      'Q6 Char Count': '={{ $json.c6 }}',
      'Q7 Self Rating': '={{ $json.q7 }}',
      'Total Char Count': '={{ $json.totalChars }}',
      'Time Spent Seconds': '={{ $json.timeSpentSeconds }}',
      'Raw JSON': '={{ JSON.stringify($json.answers) }}',
    },
    1680,
    280,
    true,
  ),
  airtableUpdate(
    'at-s1-upd',
    'AT Update Session S1',
    'Review Sessions',
    {
      id: "={{ $('Resolve Session Id').item.json.sessionId }}",
      Status: 'In Progress',
      'Stage 1 Time (Seconds)': "={{ $('Resolve Session Id').item.json.timeSpentSeconds }}",
    },
    1920,
    280,
    true,
  ),
  code(
    'code-s1-out',
    'Stage1 Response',
    `const sid=$('Resolve Session Id').item.json.sessionId;const created=$('AT Create Stage1').item.json||{};const stage1Id=created.id||null;const err=created.error?.message||created.message;return [{json:{success:Boolean(sid&&stage1Id),sessionId:sid||null,stage1Id,error:stage1Id?undefined:(err||'Airtable Stage 1 write failed')}}];`,
    2160,
    280,
  ),
  respond('res-s1', 'Respond Stage1', 'JSON.stringify($json)', 2400, 280),
);

// ── ingest file ──
nodes.push(
  webhook('wh-ing', 'WH Ingest File', 'POST', 'ingest-stage2-file', 0, 560, 'ingest-stage2-file-001', {
    binaryData: true,
  }),
  code(
    'code-ing-ex',
    'Extract File',
    `const item=$input.first();const b=item.json.body||item.json;const bin=item.binary||{};const key=Object.keys(bin)[0]||'';const file=key?bin[key]:null;const json={sessionId:b.sessionId,employeeId:b.employeeId,name:b.name||file?.fileName||'untitled',type:b.type||file?.mimeType||'application/pdf',size:Number(b.size||file?.fileSize||0),url:b.url||'',priority:Number(b.priority)||0,title:b.title||'',hasBinary:!!file,submittedAt:new Date().toISOString()};return [{json,binary:file?{data:file}:{}}];`,
    240,
    560,
  ),
  iff('if-ing-sid', 'Ingest Session Valid?', '={{ $json.sessionId }}', 360, 560, {
    operation: 'regex',
    rightValue: REC_ID_RE,
  }),
  validSessionCode('code-ing-bad', 'Ingest Invalid Session', 480, 680),
  code(
    'code-ing-bin',
    'Attach File Binary',
    `const json=$input.first().json;const src=$('Extract File').first();return [{json,binary:src.binary||{}}];`,
    480,
    560,
  ),
  httpMultipartFile('http-parse', 'Call Parse Webhook', PARSE, 720, 560),
  code(
    'code-ing-parse',
    'Normalize Parse',
    `const raw=$input.first().json;const meta=$('Extract File').item.json;let text='';try{text=raw.text||raw.parsedText||raw.markdown||raw.content||raw.data||(typeof raw==='string'?raw:JSON.stringify(raw));}catch(e){text='';}if(String(text).includes('PARSE_WEBHOOK_URL'))text='';const ok=!!String(text).trim()&&meta.hasBinary;return [{json:{sessionId:meta.sessionId,employeeId:meta.employeeId,name:meta.name,type:meta.type,size:meta.size,url:meta.url,priority:meta.priority||0,title:meta.title||'',parseRaw:String(text).slice(0,100000),parsed:ok,parseStatus:ok?'ok':(meta.hasBinary?'failed':'no-binary')}}];`,
    960,
    560,
  ),
  airtableCreate(
    'at-ing-file',
    'AT Create File',
    'Stage 2 Files',
    {
      'File Name': '={{ $json.name }}',
      Session: '={{ [$json.sessionId] }}',
      'Employee Name': '={{ $json.employeeId }}',
      'File URL': '={{ $json.url }}',
      'File Type': '={{ $json.type }}',
      'File Size KB': '={{ Math.round(($json.size||0)/1024) }}',
      'Parse Status': '={{ $json.parseStatus }}',
      'Parse Raw': '={{ $json.parseRaw }}',
      'Projects Mapped': "={{ ($json.priority ? 'P'+$json.priority : '') + ($json.title ? ' '+$json.title : '') }}",
    },
    1200,
    560,
    true,
  ),
  code(
    'code-ing-out',
    'Ingest Response',
    `const p=$('Normalize Parse').item.json;const created=$('AT Create File').item.json||{};return [{json:{success:true,fileId:created.id||null,parsed:p.parsed,parseStatus:p.parseStatus,hasBinary:!!p.parseRaw||p.parseStatus!=='no-binary'}}];`,
    1440,
    560,
  ),
  respond('res-ing', 'Respond Ingest', 'JSON.stringify($json)', 1680, 560),
);

// ── stage2 summary ──
nodes.push(
  webhook('wh-s2s', 'WH Stage2 Summary', 'POST', 'stage2-summary', 0, 840, 'stage2-summary-001'),
  code(
    'code-s2s-ex',
    'Extract Summary Req',
    `const b=$input.first().json.body||$input.first().json;return [{json:{sessionId:b.sessionId,employeeId:b.employeeId,stage1:b.stage1||{}}}];`,
    240,
    840,
  ),
  airtableSearch('at-s2s-files', 'AT Files For Session', 'Stage 2 Files', 480, 840),
  code(
    'code-s2s-prompt',
    'Build Summary Prompt',
    `const meta=$('Extract Summary Req').item.json;const s1=meta.stage1||{};const files=items.map(i=>i.json.fields||i.json).filter(f=>{const sess=f.Session;if(!sess)return true;const ids=Array.isArray(sess)?sess.map(x=>x.id||x):[sess];return ids.includes(meta.sessionId)||true;});const evidence=files.map((f,i)=>\`FILE \${i+1}: \${f['File Name']||f.Name||'unknown'}\\nParse status: \${f['Parse Status']||'n/a'}\\nTEXT:\\n\${String(f['Parse Raw']||'').slice(0,4000)}\`).join('\\n\\n---\\n\\n');const claims=\`STAGE 1 CLAIMS (treat as unverified; challenge against files):\\nOverall: \${s1.q1||''}\\nWins: \${s1.q2||''}\\nWrong: \${s1.q3||''}\\nBetter: \${s1.q4||''}\\nProjects: \${s1.q5||''}\\nStuck: \${s1.q6||''}\\nSelf-rating: \${s1.q7||''}/10\`;const prompt=\`You are a sceptical performance analyst at Seven Fincorp (fintech, Bengaluru). Use parsed work files as the source of truth. Do NOT politely agree with Stage 1. Hunt gaps.\\n\\n\${claims}\\n\\nPARSED WORK (weekly/work context — use as NEGATIVE BIAS / challenge material):\\n\${evidence||'(no parsed text)'}\\n\\nReturn ONLY JSON:\\n{"projectsIdentified":["..."],"keyOutputs":["..."],"contributionLevel":"High|Medium|Low","summary":"2-3 paragraphs of what was actually produced","notes":"1-2 sentences on quality/gaps","contradictions":["specific Stage 1 claim vs file evidence"]}\`;return [{json:{prompt,sessionId:meta.sessionId}}];`,
    720,
    840,
  ),
  aiAgent(
    'agent-s2s',
    'AI Agent Stage2',
    960,
    840,
    'You are a sceptical performance analyst at Seven Fincorp. Use parsed files as truth. Challenge Stage 1. Return ONLY JSON.',
  ),
  claudeModel('lm-s2s', 'Claude Stage2', 960, 980),
  code(
    'code-s2s-parse',
    'Parse Summary JSON',
    `const resp=$input.first().json;const t=resp.output||resp.text||resp.choices?.[0]?.message?.content||resp.content?.[0]?.text||(typeof resp==='string'?resp:'{}');let r;try{r=JSON.parse(String(t).replace(/\\\`\\\`\\\`json/g,'').replace(/\\\`\\\`\\\`/g,'').trim());}catch(e){r={projectsIdentified:[],keyOutputs:[],contributionLevel:'Medium',summary:String(t),notes:'',contradictions:[]};}if(typeof r.projectsIdentified==='string')r.projectsIdentified=r.projectsIdentified.split(',').map(s=>s.trim()).filter(Boolean);if(typeof r.keyOutputs==='string')r.keyOutputs=r.keyOutputs.split(',').map(s=>s.trim()).filter(Boolean);r.sessionId=$('Build Summary Prompt').item.json.sessionId;return [{json:r}];`,
    1200,
    840,
  ),
  respond('res-s2s', 'Respond Summary', 'JSON.stringify($json)', 1440, 840),
);

// ── submit stage2 ──
nodes.push(
  webhook('wh-s2', 'WH Submit Stage2', 'POST', 'submit-stage2', 0, 1120, 'submit-stage2-001'),
  code(
    'code-s2-ex',
    'Extract Stage2',
    `const b=$input.first().json.body||$input.first().json;return [{json:{sessionId:b.sessionId,employeeId:b.employeeId,summary:b.summary||'',edited:!!b.edited,projectsIdentified:typeof b.projectsIdentified==='string'?b.projectsIdentified:(b.projectsIdentified||[]).join(', '),keyOutputs:typeof b.keyOutputs==='string'?b.keyOutputs:(b.keyOutputs||[]).join(', '),contributionLevel:b.contributionLevel||'Medium',aiObservations:b.aiObservations||'',timeSpentSeconds:Number(b.timeSpentSeconds)||0}}];`,
    240,
    1120,
  ),
  iff('if-s2-sid', 'S2 Session Valid?', '={{ $json.sessionId }}', 360, 1120, {
    operation: 'regex',
    rightValue: REC_ID_RE,
  }),
  validSessionCode('code-s2-bad', 'S2 Invalid Session', 480, 1240),
  airtableCreate(
    'at-s2-ev',
    'AT Create Evidence',
    'Stage 2 Work Evidences',
    {
      Session: '={{ [$json.sessionId] }}',
      'AI Raw Summary': '={{ $json.summary }}',
      'Employee Edited Summary': '={{ $json.edited }}',
      'Final Summary': '={{ $json.summary }}',
      'Projects Identified': '={{ $json.projectsIdentified }}',
      'Key Outputs': '={{ $json.keyOutputs }}',
      'Contribution Level': '={{ $json.contributionLevel }}',
      'AI Observations': '={{ $json.aiObservations }}',
      'Confirmation Accepted': true,
      'Time Spent Seconds': '={{ $json.timeSpentSeconds }}',
    },
    480,
    1120,
  ),
  airtableUpdate(
    'at-s2-upd',
    'AT Update Session S2',
    'Review Sessions',
    {
      id: "={{ $('Extract Stage2').item.json.sessionId }}",
      Status: 'In Progress',
      'Stage 2 Time (Seconds)': "={{ $('Extract Stage2').item.json.timeSpentSeconds }}",
    },
    720,
    1120,
    true,
  ),
  code(
    'code-s2-out',
    'Stage2 Response',
    `return [{json:{success:true,stage2Id:$('AT Create Evidence').item.json.id}}];`,
    960,
    1120,
  ),
  respond('res-s2', 'Respond Stage2', 'JSON.stringify($json)', 1200, 1120),
);

// ── stage3 questions ──
nodes.push(
  webhook('wh-s3q', 'WH Stage3 Questions', 'POST', 'stage3-questions', 0, 1400, 'stage3-questions-001'),
  code(
    'code-s3q-ex',
    'Build Questions Prompt',
    `const b=$input.first().json.body||$input.first().json;const list=Array.isArray(b.projectsIdentifiedList)?b.projectsIdentifiedList:String(b.projectsIdentified||'').split(',');const projects=list.map(s=>String(s).trim()).filter(Boolean);const count=projects.length;const low=count<3;const contradictions=Array.isArray(b.contradictions)?b.contradictions.join('; '):String(b.contradictions||'');const outputs=Array.isArray(b.keyOutputs)?b.keyOutputs.join(', '):String(b.keyOutputs||'');const prompt=\`You are a sharp interviewer at Seven Fincorp. Generate EXACTLY 10 questions tied to THIS employee's Stage 1 and Stage 2. Not generic HR.\\n\\nEach question MUST include a named project, file, rating, contribution level, or contradiction from the payload. Do NOT write "most significant decision this month" or other generic phrasing unless those fields are empty.\\n\\nSTAGE 1:\\n\${b.stage1Summary||''}\\nSelf-rating: \${b.selfRating??''}\\n\\nSTAGE 2 SUMMARY:\\n\${b.stage2Summary||''}\\nContribution: \${b.contributionLevel||''}\\nKey outputs: \${outputs}\\nContradictions: \${contradictions}\\n\\nProjects (\${count}): \${projects.join(', ')}\\nMeaningful-project threshold: \${low?'UNDER 3 — Q9 and Q10 must be the fixed reflection questions below':'3+ projects — Q9/Q10 must name a listed project'}\\n\\nQ1 Reasoning (why on a named project or output)\\nQ2-Q3 Gap Analysis (self-rating vs contribution, or a named contradiction)\\nQ4-Q6 Advice / how else to approach a named win or issue\\nQ7-Q8 Project deep dive using project names\\nQ9-Q10 \${low?'FIXED: (q9) What is the most important thing you learned this month and how will it change how you work? (q10) What does this month reveal about how you work at your best and where you still have room to grow?':'project-level learn / do differently, naming the project'}\\n\\nReturn ONLY a JSON array of 10 objects {id,question,category} ids q1..q10. Categories: Reasoning|Gap Analysis|Decision Making|Advice|Project Deep Dive|Reflection\`;return [{json:{prompt,sessionId:b.sessionId,lowProjectCount:low}}];`,
    240,
    1400,
  ),
  aiAgent(
    'agent-s3q',
    'AI Agent Stage3',
    480,
    1400,
    'You are a sharp interviewer at Seven Fincorp. Each question must name a project, file, rating, contribution, or contradiction from the payload. Return ONLY a JSON array of 10 {id,question,category} objects. No markdown.',
  ),
  claudeModel('lm-s3q', 'Claude Stage3', 480, 1540),
  code(
    'code-s3q-parse',
    'Parse Questions',
    `const raw=$input.first().json;const t=raw.output||raw.text||raw.choices?.[0]?.message?.content||'[]';const fallback=[{id:'q1',question:'Describe the most significant decision you made this month and why you made it.',category:'Reasoning'},{id:'q2',question:'Walk me through a moment where things did not go as planned. What happened?',category:'Gap Analysis'},{id:'q3',question:'Is there something you said you would do that the work files do not support? Explain.',category:'Gap Analysis'},{id:'q4',question:'How would you handle a similar situation differently next time?',category:'Decision Making'},{id:'q5',question:'What advice would you give a colleague facing the same challenge?',category:'Advice'},{id:'q6',question:'If you were advising someone else on this problem, what would you recommend?',category:'Advice'},{id:'q7',question:'Pick your most important project. What was your specific contribution?',category:'Project Deep Dive'},{id:'q8',question:'What went wrong in your most challenging project and what caused it?',category:'Project Deep Dive'},{id:'q9',question:'What is the most important thing you learned this month and how will it change how you work?',category:'Reflection'},{id:'q10',question:'What does this month reveal about how you work at your best and where you still have room to grow?',category:'Reflection'}];let questions;try{questions=JSON.parse(String(t).replace(/\\\`\\\`\\\`json/g,'').replace(/\\\`\\\`\\\`/g,'').trim());if(!Array.isArray(questions)||questions.length<8)throw new Error('bad');}catch(e){questions=fallback;}if($('Build Questions Prompt').item.json.lowProjectCount){questions[8]=fallback[8];questions[9]=fallback[9];}return [{json:{questions:questions.slice(0,10),sessionId:$('Build Questions Prompt').item.json.sessionId}}];`,
    720,
    1400,
  ),
  respond('res-s3q', 'Respond Questions', 'JSON.stringify($json)', 960, 1400),
);

// ── submit stage3 ──
nodes.push(
  webhook('wh-s3', 'WH Submit Stage3', 'POST', 'submit-stage3', 0, 1680, 'submit-stage3-001'),
  code(
    'code-s3-ex',
    'Map Stage3 QA',
    `const b=$input.first().json.body||$input.first().json;const qa=b.qa||[];const totalPaste=qa.reduce((s,q)=>s+(q.pasteAttempts||0),0);const m={sessionId:b.sessionId,employeeId:b.employeeId,contextUsed:b.contextUsed||'',totalPasteAttempts:totalPaste,highPasteFlag:totalPaste>5,timeSpentSeconds:Number(b.timeSpentSeconds)||0,questionsJson:JSON.stringify(qa)};qa.forEach((q,i)=>{const n=i+1;m['Q'+n+' Question']=q.question||'';m['Q'+n+' Category']=q.category||'';m['Q'+n+' Answer']=q.answer||'';m['Q'+n+' Char Count']=q.charCount||(q.answer||'').length;m['Q'+n+' Time Seconds']=q.timeSeconds||0;m['Q'+n+' Paste Attempts']=q.pasteAttempts||0;});return [{json:m}];`,
    240,
    1680,
  ),
  iff('if-s3-sid', 'S3 Session Valid?', '={{ $json.sessionId }}', 360, 1680, {
    operation: 'regex',
    rightValue: REC_ID_RE,
  }),
  validSessionCode('code-s3-bad', 'S3 Invalid Session', 480, 1800),
  airtableCreate(
    'at-s3',
    'AT Create Stage3',
    'Stage 3 Interviews',
    {
      Session: '={{ [$json.sessionId] }}',
      'Questions JSON': '={{ $json.questionsJson }}',
      'Context Used': '={{ $json.contextUsed }}',
      'Q1 Question': '={{ $json["Q1 Question"] }}',
      'Q1 Category': '={{ $json["Q1 Category"] }}',
      'Q1 Answer': '={{ $json["Q1 Answer"] }}',
      'Q1 Char Count': '={{ $json["Q1 Char Count"] }}',
      'Q1 Time Seconds': '={{ $json["Q1 Time Seconds"] }}',
      'Q1 Paste Attempts': '={{ $json["Q1 Paste Attempts"] }}',
      'Q2 Question': '={{ $json["Q2 Question"] }}',
      'Q2 Category': '={{ $json["Q2 Category"] }}',
      'Q2 Answer': '={{ $json["Q2 Answer"] }}',
      'Q2 Char Count': '={{ $json["Q2 Char Count"] }}',
      'Q2 Time Seconds': '={{ $json["Q2 Time Seconds"] }}',
      'Q2 Paste Attempts': '={{ $json["Q2 Paste Attempts"] }}',
      'Q3 Question': '={{ $json["Q3 Question"] }}',
      'Q3 Category': '={{ $json["Q3 Category"] }}',
      'Q3 Answer': '={{ $json["Q3 Answer"] }}',
      'Q3 Char Count': '={{ $json["Q3 Char Count"] }}',
      'Q3 Time Seconds': '={{ $json["Q3 Time Seconds"] }}',
      'Q3 Paste Attempts': '={{ $json["Q3 Paste Attempts"] }}',
      'Q4 Question': '={{ $json["Q4 Question"] }}',
      'Q4 Category': '={{ $json["Q4 Category"] }}',
      'Q4 Answer': '={{ $json["Q4 Answer"] }}',
      'Q4 Char Count': '={{ $json["Q4 Char Count"] }}',
      'Q4 Time Seconds': '={{ $json["Q4 Time Seconds"] }}',
      'Q4 Paste Attempts': '={{ $json["Q4 Paste Attempts"] }}',
      'Q5 Question': '={{ $json["Q5 Question"] }}',
      'Q5 Category': '={{ $json["Q5 Category"] }}',
      'Q5 Answer': '={{ $json["Q5 Answer"] }}',
      'Q5 Char Count': '={{ $json["Q5 Char Count"] }}',
      'Q5 Time Seconds': '={{ $json["Q5 Time Seconds"] }}',
      'Q5 Paste Attempts': '={{ $json["Q5 Paste Attempts"] }}',
      'Q6 Question': '={{ $json["Q6 Question"] }}',
      'Q6 Category': '={{ $json["Q6 Category"] }}',
      'Q6 Answer': '={{ $json["Q6 Answer"] }}',
      'Q6 Char Count': '={{ $json["Q6 Char Count"] }}',
      'Q6 Time Seconds': '={{ $json["Q6 Time Seconds"] }}',
      'Q6 Paste Attempts': '={{ $json["Q6 Paste Attempts"] }}',
      'Q7 Question': '={{ $json["Q7 Question"] }}',
      'Q7 Category': '={{ $json["Q7 Category"] }}',
      'Q7 Answer': '={{ $json["Q7 Answer"] }}',
      'Q7 Char Count': '={{ $json["Q7 Char Count"] }}',
      'Q7 Time Seconds': '={{ $json["Q7 Time Seconds"] }}',
      'Q7 Paste Attempts': '={{ $json["Q7 Paste Attempts"] }}',
      'Q8 Question': '={{ $json["Q8 Question"] }}',
      'Q8 Category': '={{ $json["Q8 Category"] }}',
      'Q8 Answer': '={{ $json["Q8 Answer"] }}',
      'Q8 Char Count': '={{ $json["Q8 Char Count"] }}',
      'Q8 Time Seconds': '={{ $json["Q8 Time Seconds"] }}',
      'Q8 Paste Attempts': '={{ $json["Q8 Paste Attempts"] }}',
      'Q9 Question': '={{ $json["Q9 Question"] }}',
      'Q9 Category': '={{ $json["Q9 Category"] }}',
      'Q9 Answer': '={{ $json["Q9 Answer"] }}',
      'Q9 Char Count': '={{ $json["Q9 Char Count"] }}',
      'Q9 Time Seconds': '={{ $json["Q9 Time Seconds"] }}',
      'Q9 Paste Attempts': '={{ $json["Q9 Paste Attempts"] }}',
      'Q10 Question': '={{ $json["Q10 Question"] }}',
      'Q10 Category': '={{ $json["Q10 Category"] }}',
      'Q10 Answer': '={{ $json["Q10 Answer"] }}',
      'Q10 Char Count': '={{ $json["Q10 Char Count"] }}',
      'Q10 Time Seconds': '={{ $json["Q10 Time Seconds"] }}',
      'Q10 Paste Attempts': '={{ $json["Q10 Paste Attempts"] }}',
      'Total Paste Attempts': '={{ $json.totalPasteAttempts }}',
      'High Paste Flag': '={{ $json.highPasteFlag }}',
      'Time Spent Seconds': '={{ $json.timeSpentSeconds }}',
    },
    480,
    1680,
  ),
  airtableUpdate(
    'at-s3-upd',
    'AT Update Session S3',
    'Review Sessions',
    {
      id: "={{ $('Map Stage3 QA').item.json.sessionId }}",
      Status: 'In Progress',
      'Stage 3 Time (Seconds)': "={{ $('Map Stage3 QA').item.json.timeSpentSeconds }}",
    },
    720,
    1680,
    true,
  ),
  code(
    'code-s3-out',
    'Stage3 Response',
    `const m=$('Map Stage3 QA').item.json;return [{json:{success:true,stage3Id:$('AT Create Stage3').item.json.id,pasteAttempts:m.totalPasteAttempts,flagged:m.highPasteFlag}}];`,
    960,
    1680,
  ),
  respond('res-s3', 'Respond Stage3', 'JSON.stringify($json)', 1200, 1680),
);

// ── stage4 ──
nodes.push(
  webhook('wh-s4', 'WH Submit Stage4', 'POST', 'submit-stage4', 0, 1960, 'submit-stage4-001'),
  code(
    'code-s4-bias',
    'Bias Detection',
    `const b=$input.first().json.body||$input.first().json;const peers=b.peerFeedback||[];const fields=['respondsOnTime','helpsWithOwnTasks','helpsBeyondScope','cooperativeEnvironment','communicationQuality','professionalEtiquette','emailEtiquette','whatsappEtiquette'];const avgs=peers.filter(p=>p.interaction!==false).map(p=>{const v=fields.map(f=>Number(p.ratings?.[f]||5));return v.reduce((a,c)=>a+c,0)/v.length;});const allUniform=avgs.length>1&&(Math.max(...avgs)-Math.min(...avgs))<1.0;const processed=peers.map(peer=>{const r=peer.ratings||{};const noI=peer.interaction===false;const v=fields.map(f=>Number(r[f]||5));const allLow=!noI&&v.every(x=>x<=2);const allHigh=!noI&&v.every(x=>x>=9);const biasFlag=allLow||allHigh||allUniform;let biasType='None';if(allLow)biasType='All Low';else if(allHigh)biasType='All High';else if(allUniform)biasType='Uniform';const avg=noI?0:v.reduce((a,c)=>a+c,0)/v.length;return {sessionId:b.sessionId,reviewerName:b.employeeName||'',revieweeId:peer.colleagueId||peer.colleagueName||peer.revieweeName,month:b.month||'',didNotInteract:noI,respondsOnTime:noI?null:(r.respondsOnTime||5),helpsWithOwnTasks:noI?null:(r.helpsWithOwnTasks||5),helpsBeyondScope:noI?null:(r.helpsBeyondScope||5),cooperativeEnvironment:noI?null:(r.cooperativeEnvironment||5),communicationQuality:noI?null:(r.communicationQuality||5),professionalEtiquette:noI?null:(r.professionalEtiquette||5),emailEtiquette:noI?null:(r.emailEtiquette||5),whatsappEtiquette:noI?null:(r.whatsappEtiquette||5),averageScore:noI?0:Math.round(avg*10)/10,biasFlag,biasType,biasReason:allLow?'All scores <= 2':allHigh?'All scores >= 9':allUniform?'Ratings uniform across all colleagues':'',biasWarningShown:!!peer.biasWarningShown,timeSpentSeconds:Number(b.timeSpentSeconds)||0};});return processed.map(p=>({json:p}));`,
    240,
    1960,
  ),
  iff('if-s4-sid', 'S4 Session Valid?', '={{ $json.sessionId }}', 360, 1960, {
    operation: 'regex',
    rightValue: REC_ID_RE,
  }),
  validSessionCode('code-s4-bad', 'S4 Invalid Session', 480, 2080),
  airtableCreate(
    'at-s4',
    'AT Create Peer Rows',
    'Stage 4 Peer Feedbacks',
    {
      Session: '={{ [$json.sessionId] }}',
      'Reviewer Name': '={{ $json.reviewerName }}',
      'Reviewee ID': '={{ $json.revieweeId }}',
      'Did Not Interact': '={{ $json.didNotInteract }}',
      'Responds On Time': '={{ $json.respondsOnTime }}',
      'Helps With Own Tasks': '={{ $json.helpsWithOwnTasks }}',
      'Helps Beyond Scope': '={{ $json.helpsBeyondScope }}',
      'Cooperative Environment': '={{ $json.cooperativeEnvironment }}',
      'Communication Quality': '={{ $json.communicationQuality }}',
      'Professional Etiquette': '={{ $json.professionalEtiquette }}',
      'Email Etiquette': '={{ $json.emailEtiquette }}',
      'WhatsApp Etiquette': '={{ $json.whatsappEtiquette }}',
      'Average Score': '={{ $json.averageScore }}',
      'Bias Flag': '={{ $json.biasFlag }}',
      'Bias Type': '={{ $json.biasType }}',
      'Bias Reason': '={{ $json.biasReason }}',
      'Bias Warning Shown': '={{ $json.biasWarningShown }}',
      'Time Spent Seconds': '={{ $json.timeSpentSeconds }}',
    },
    480,
    1960,
  ),
  airtableUpdate(
    'at-s4-upd',
    'AT Update Session S4',
    'Review Sessions',
    {
      id: "={{ $('Bias Detection').first().json.sessionId }}",
      Status: 'In Progress',
      'Stage 4 Time (Seconds)': "={{ $('Bias Detection').first().json.timeSpentSeconds }}",
    },
    720,
    1960,
    true,
  ),
  code('code-s4-out', 'Stage4 Response', `return [{json:{success:true}}];`, 960, 1960),
  respond('res-s4', 'Respond Stage4', 'JSON.stringify($json)', 1200, 1960),
);

// ── generate report ──
nodes.push(
  webhook('wh-s5', 'WH Generate Report', 'POST', 'generate-report', 0, 2240, 'generate-report-001'),
  code(
    'code-s5-prompt',
    'Build Report Prompt',
    `const b=$input.first().json.body||$input.first().json;const s1=b.stage1||{};const s2=b.stage2||{};const s3=b.stage3||{};const s4=b.stage4||[];const s1t=\`STAGE 1 (what they THINK)\\nOverall: \${s1.q1||''}\\nWins: \${s1.q2||''}\\nWrong: \${s1.q3||''}\\nBetter: \${s1.q4||''}\\nProjects: \${s1.q5||''}\\nStuck: \${s1.q6||''}\\nSelf-rating: \${s1.q7||'N/A'}/10\`;const s2t=\`STAGE 2 (what they PRODUCED — treat parsed evidence as challenge)\\nSummary: \${s2.finalSummary||''}\\nProjects: \${s2.projectsIdentified||''}\\nOutputs: \${s2.keyOutputs||''}\\nContribution: \${s2.contributionLevel||''}\\nEdited: \${s2.employeeEditedSummary?'Yes':'No'}\\nObservations: \${s2.aiObservations||''}\`;const qa=(s3.qa||[]).map((q,i)=>\`Q\${i+1}[\${q.category}]: \${q.question}\\nA: \${q.answer}\`).join('\\n\\n');const s4t=s4.map(p=>{if(p.interaction===false)return \`\${p.colleagueName}: No interaction\`;const r=p.ratings||{};const vals=Object.values(r).filter(Number.isFinite);const avg=vals.reduce((a,c)=>a+c,0)/Math.max(1,vals.length);return \`\${p.colleagueName}: avg \${avg.toFixed(1)}/10\`;}).join('\\n');const prompt=\`You are the AI performance evaluator for Seven Fincorp. Reconcile four views: (1) what they think (2) what files show (3) whether they understand it (4) how peers experience them. Do not inflate scores. Use Stage 2 evidence as negative bias against Stage 1.\\n\\nEmployee: \${b.employeeName||''} \\nRole: \${b.role||''} Dept: \${b.department||''} Period: \${b.month||''} \${b.year||''}\\n\\n\${s1t}\\n\\n\${s2t}\\n\\nSTAGE 3\\n\${qa}\\n\\nSTAGE 4\\n\${s4t}\\n\\nReturn ONLY JSON:\\n{"overallScore":0-100,"dimensions":[{"name":"Quality of Work","score":0-10},{"name":"Quantity of Output","score":0-10},{"name":"Problem Solving","score":0-10},{"name":"Ownership","score":0-10},{"name":"Decision Making","score":0-10},{"name":"Communication","score":0-10},{"name":"Collaboration","score":0-10},{"name":"Self-Awareness","score":0-10}],"majorAchievements":"","keyGaps":"","developmentPriorities":"","peerFeedbackSummary":"","aiObservations":"","fullReportMarkdown":"# Monthly Employee Performance Report\\n..."}\`;return [{json:{prompt,sessionId:b.sessionId,employeeId:b.employeeId,employeeName:b.employeeName,month:b.month,year:b.year,managerEmail:b.managerEmail||'',employeeEmail:b.employeeEmail||''}}];`,
    240,
    2240,
  ),
  airtableSearch('at-s5-emp', 'AT Get Employee', 'Employees', 480, 2240),
  code(
    'code-s5-pass',
    'Pass Report Prompt',
    `const meta=$('Build Report Prompt').item.json;return [{json:{prompt:meta.prompt,sessionId:meta.sessionId}}];`,
    600,
    2240,
  ),
  aiAgent(
    'agent-s5',
    'AI Agent Report',
    840,
    2240,
    'You are the AI performance evaluator for Seven Fincorp. Do not inflate scores. Return ONLY the JSON object requested.',
  ),
  claudeModel('lm-s5', 'Claude Report', 840, 2380),
  code(
    'code-s5-parse',
    'Parse Report',
    `const raw=$input.first().json;const t=raw.output||raw.text||raw.choices?.[0]?.message?.content||'{}';const meta=$('Build Report Prompt').item.json;let r;try{r=JSON.parse(String(t).replace(/\\\`\\\`\\\`json/g,'').replace(/\\\`\\\`\\\`/g,'').trim());}catch(e){r={overallScore:70,dimensions:[{name:'Quality of Work',score:7},{name:'Quantity of Output',score:7},{name:'Problem Solving',score:7},{name:'Ownership',score:7},{name:'Decision Making',score:7},{name:'Communication',score:7},{name:'Collaboration',score:7},{name:'Self-Awareness',score:7}],majorAchievements:'Parse error.',keyGaps:'',developmentPriorities:'',peerFeedbackSummary:'',aiObservations:String(t),fullReportMarkdown:String(t)};}const dims=Array.isArray(r.dimensions)?r.dimensions:[];const dim=n=>(dims.find(d=>d.name===n)||{}).score||0;const empItems=$('AT Get Employee').all();const emp=empItems.map(i=>i.json).find(j=>(j.id||'')===meta.employeeId)||{};const f=emp.fields||emp;const managerEmail=f['Reporting To Email']||meta.managerEmail||'';const hr='${HR}';return [{json:{...r,sessionId:meta.sessionId,employeeName:meta.employeeName,month:meta.month,year:meta.year,qualityOfWork:dim('Quality of Work'),quantityOfOutput:dim('Quantity of Output'),problemSolving:dim('Problem Solving'),ownership:dim('Ownership'),decisionMaking:dim('Decision Making'),communication:dim('Communication'),collaboration:dim('Collaboration'),selfAwareness:dim('Self-Awareness'),toEmail:[f.Email,managerEmail,hr].filter(Boolean).join(', '),subject:\`Monthly review — \${meta.employeeName} — \${meta.month} \${meta.year}\`,message:r.fullReportMarkdown||r.aiObservations||'',emailedTo:[f.Email,managerEmail,hr].filter(Boolean).join(', ')}}];`,
    1080,
    2240,
  ),
  iff('if-s5-sid', 'S5 Session Valid?', '={{ $json.sessionId }}', 1140, 2240, {
    operation: 'regex',
    rightValue: REC_ID_RE,
  }),
  validSessionCode('code-s5-bad', 'S5 Invalid Session', 1200, 2360),
  airtableCreate(
    'at-s5-rep',
    'AT Create Report',
    'Stage 5 Reports',
    {
      Session: '={{ [$json.sessionId] }}',
      'Employee Name': '={{ $json.employeeName }}',
      Month: '={{ $json.month }}',
      Year: '={{ $json.year }}',
      'Overall Score': '={{ $json.overallScore }}',
      'Quality of Work': '={{ $json.qualityOfWork }}',
      'Quantity of Output': '={{ $json.quantityOfOutput }}',
      'Problem Solving': '={{ $json.problemSolving }}',
      Ownership: '={{ $json.ownership }}',
      'Decision Making': '={{ $json.decisionMaking }}',
      Communication: '={{ $json.communication }}',
      Collaboration: '={{ $json.collaboration }}',
      'Self Awareness': '={{ $json.selfAwareness }}',
      'Major Achievements': '={{ $json.majorAchievements }}',
      'Key Gaps': '={{ $json.keyGaps }}',
      'Development Priorities': '={{ $json.developmentPriorities }}',
      'Peer Feedback Summary': '={{ $json.peerFeedbackSummary }}',
      'Cross Stage Observations': '={{ $json.aiObservations }}',
      'Full Report Markdown': '={{ $json.fullReportMarkdown }}',
      'Model Used': CLAUDE_MODEL,
      'Emailed To': '={{ $json.emailedTo }}',
    },
    1200,
    2240,
  ),
  airtableUpdate(
    'at-s5-upd',
    'AT Complete Session',
    'Review Sessions',
    {
      id: "={{ $('Parse Report').item.json.sessionId }}",
      Status: 'Completed',
      'Final Score': "={{ $('Parse Report').item.json.overallScore }}",
      'Completed At': '={{ $now.toISO() }}',
    },
    1440,
    2240,
    true,
  ),
  emailNode('em-s5', 'Email Manager HR', 1680, 2240),
  code(
    'code-s5-out',
    'Report Response',
    `const r=$('Parse Report').item.json;return [{json:{overallScore:r.overallScore,dimensions:r.dimensions,majorAchievements:r.majorAchievements,keyGaps:r.keyGaps,developmentPriorities:r.developmentPriorities,peerFeedbackSummary:r.peerFeedbackSummary,aiObservations:r.aiObservations,fullReportMarkdown:r.fullReportMarkdown}}];`,
    1920,
    2240,
  ),
  respond('res-s5', 'Respond Report', 'JSON.stringify($json)', 2160, 2240),
);

function link(from, to) {
  return { from, to };
}

const edges = [
  ['WH Get Employees', 'AT List Employees'],
  ['AT List Employees', 'AT List Sessions'],
  ['AT List Sessions', 'Format Employees'],
  ['Format Employees', 'Respond Employees'],

  ['WH Submit Stage1', 'Extract Stage1'],
  ['Extract Stage1', 'AT Search Sessions'],
  ['AT Search Sessions', 'Find Or New Session'],
  ['Find Or New Session', 'Session Exists?'],
  ['AT Create Session', 'Resolve Session Id'],
  ['Resolve Session Id', 'AT Create Stage1'],
  ['AT Create Stage1', 'AT Update Session S1'],
  ['AT Update Session S1', 'Stage1 Response'],
  ['Stage1 Response', 'Respond Stage1'],

  ['WH Ingest File', 'Extract File'],
  ['Attach File Binary', 'Call Parse Webhook'],
  ['Call Parse Webhook', 'Normalize Parse'],
  ['Normalize Parse', 'AT Create File'],
  ['AT Create File', 'Ingest Response'],
  ['Ingest Response', 'Respond Ingest'],

  ['WH Stage2 Summary', 'Extract Summary Req'],
  ['Extract Summary Req', 'AT Files For Session'],
  ['AT Files For Session', 'Build Summary Prompt'],
  ['Build Summary Prompt', 'AI Agent Stage2'],
  ['AI Agent Stage2', 'Parse Summary JSON'],
  ['Parse Summary JSON', 'Respond Summary'],

  ['WH Submit Stage2', 'Extract Stage2'],
  ['AT Create Evidence', 'AT Update Session S2'],
  ['AT Update Session S2', 'Stage2 Response'],
  ['Stage2 Response', 'Respond Stage2'],

  ['WH Stage3 Questions', 'Build Questions Prompt'],
  ['Build Questions Prompt', 'AI Agent Stage3'],
  ['AI Agent Stage3', 'Parse Questions'],
  ['Parse Questions', 'Respond Questions'],

  ['WH Submit Stage3', 'Map Stage3 QA'],
  ['AT Create Stage3', 'AT Update Session S3'],
  ['AT Update Session S3', 'Stage3 Response'],
  ['Stage3 Response', 'Respond Stage3'],

  ['WH Submit Stage4', 'Bias Detection'],
  ['AT Create Peer Rows', 'AT Update Session S4'],
  ['AT Update Session S4', 'Stage4 Response'],
  ['Stage4 Response', 'Respond Stage4'],

  ['WH Generate Report', 'Build Report Prompt'],
  ['Build Report Prompt', 'AT Get Employee'],
  ['AT Get Employee', 'Pass Report Prompt'],
  ['Pass Report Prompt', 'AI Agent Report'],
  ['AI Agent Report', 'Parse Report'],
  ['AT Create Report', 'AT Complete Session'],
  ['AT Complete Session', 'Email Manager HR'],
  ['Email Manager HR', 'Report Response'],
  ['Report Response', 'Respond Report'],
];

const connections = {};
for (const [from, to] of edges) {
  if (!connections[from]) connections[from] = { main: [[{ node: to, type: 'main', index: 0 }]] };
  else connections[from].main[0].push({ node: to, type: 'main', index: 0 });
}

// IF node: true → Resolve Session Id, false → Create Session
connections['Session Exists?'] = {
  main: [
    [{ node: 'Resolve Session Id', type: 'main', index: 0 }],
    [{ node: 'AT Create Session', type: 'main', index: 0 }],
  ],
};

connections['Extract File'] = {
  main: [[{ node: 'Ingest Session Valid?', type: 'main', index: 0 }]],
};
connections['Ingest Session Valid?'] = {
  main: [
    [{ node: 'Attach File Binary', type: 'main', index: 0 }],
    [{ node: 'Ingest Invalid Session', type: 'main', index: 0 }],
  ],
};
connections['Ingest Invalid Session'] = {
  main: [[{ node: 'Respond Ingest', type: 'main', index: 0 }]],
};

connections['Extract Stage2'] = {
  main: [[{ node: 'S2 Session Valid?', type: 'main', index: 0 }]],
};
connections['S2 Session Valid?'] = {
  main: [
    [{ node: 'AT Create Evidence', type: 'main', index: 0 }],
    [{ node: 'S2 Invalid Session', type: 'main', index: 0 }],
  ],
};
connections['S2 Invalid Session'] = {
  main: [[{ node: 'Respond Stage2', type: 'main', index: 0 }]],
};

connections['Map Stage3 QA'] = {
  main: [[{ node: 'S3 Session Valid?', type: 'main', index: 0 }]],
};
connections['S3 Session Valid?'] = {
  main: [
    [{ node: 'AT Create Stage3', type: 'main', index: 0 }],
    [{ node: 'S3 Invalid Session', type: 'main', index: 0 }],
  ],
};
connections['S3 Invalid Session'] = {
  main: [[{ node: 'Respond Stage3', type: 'main', index: 0 }]],
};

connections['Bias Detection'] = {
  main: [[{ node: 'S4 Session Valid?', type: 'main', index: 0 }]],
};
connections['S4 Session Valid?'] = {
  main: [
    [{ node: 'AT Create Peer Rows', type: 'main', index: 0 }],
    [{ node: 'S4 Invalid Session', type: 'main', index: 0 }],
  ],
};
connections['S4 Invalid Session'] = {
  main: [[{ node: 'Respond Stage4', type: 'main', index: 0 }]],
};

connections['Parse Report'] = {
  main: [[{ node: 'S5 Session Valid?', type: 'main', index: 0 }]],
};
connections['S5 Session Valid?'] = {
  main: [
    [{ node: 'AT Create Report', type: 'main', index: 0 }],
    [{ node: 'S5 Invalid Session', type: 'main', index: 0 }],
  ],
};
connections['S5 Invalid Session'] = {
  main: [[{ node: 'Respond Report', type: 'main', index: 0 }]],
};

connections['Claude Stage2'] = {
  ai_languageModel: [[{ node: 'AI Agent Stage2', type: 'ai_languageModel', index: 0 }]],
};
connections['Claude Stage3'] = {
  ai_languageModel: [[{ node: 'AI Agent Stage3', type: 'ai_languageModel', index: 0 }]],
};
connections['Claude Report'] = {
  ai_languageModel: [[{ node: 'AI Agent Report', type: 'ai_languageModel', index: 0 }]],
};

const workflow = {
  name: 'Seven Fincorp ERS — Flow',
  nodes,
  connections,
  pinData: {},
  active: false,
  settings: { executionOrder: 'v1', binaryMode: 'separate' },
  versionId: 'ers-flow-v3',
  meta: { templateCredsSetupCompleted: false },
  tags: [{ name: 'ERS' }],
};

const out = path.join(__dirname, '..', 'Seven Fincorp ERS — Flow.json');
fs.writeFileSync(out, JSON.stringify(workflow, null, 2));
console.log('Wrote', out, 'nodes', nodes.length);
