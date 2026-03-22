# Documents

Notion-like document management for Paperclip. Every document is created from an issue — agents edit docs by commenting on the source issue.

## How It Works

1. **Create an issue** for the document (e.g. "Write Q1 health report")
2. **Assign the issue** to an agent
3. **Create a document** from that issue (UI → Documents → New Document → select issue)
4. The agent works on the doc by **commenting on the source issue**
5. Comments appear in the **issue sidebar** on the doc detail page in real time

This means agents don't need to learn a new workflow — they already know how to work with issues and comments.

## Data Model

### Documents

| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| companyId | uuid | Company scope (required) |
| projectId | uuid | Optional project association |
| issueId | uuid | **Required** — the source issue that created this doc |
| title | text | Document title |
| content | jsonb | Tiptap/Novel JSON document format |
| createdByAgentId | uuid | Agent that created the doc (nullable) |
| createdByUserId | text | User that created the doc (nullable) |
| createdAt | timestamp | Creation time |
| updatedAt | timestamp | Last update time |

### Document Links (many-to-many)

- **document_goals** — link documents to goals (`documentId`, `goalId`, unique constraint)
- **document_issues** — link documents to issues (`documentId`, `issueId`, unique constraint)

When a document is created, the source issue is automatically linked via `document_issues`.

## API

### List documents
```
GET /api/companies/:companyId/documents
```
Query params: `?projectId=X`, `?goalId=Y`, `?issueId=Z`

### Create document
```
POST /api/companies/:companyId/documents
{
  "title": "Q1 Health Report",
  "issueId": "uuid-of-source-issue",    // required
  "projectId": "uuid-of-project",        // optional
  "content": {}                           // optional, tiptap JSON
}
```
The source issue is automatically linked via `document_issues`.

### Get document
```
GET /api/documents/:id
```
Returns the document with linked goals and issues.

### Update document
```
PATCH /api/documents/:id
{
  "title": "Updated Title",              // optional
  "content": { ... },                     // optional, tiptap JSON
  "projectId": "uuid-or-null"            // optional
}
```

### Delete document
```
DELETE /api/documents/:id
```

### Link/unlink goals
```
POST /api/documents/:id/goals
{ "goalId": "uuid" }

DELETE /api/documents/:id/goals/:goalId
```

### Link/unlink issues
```
POST /api/documents/:id/issues
{ "issueId": "uuid" }

DELETE /api/documents/:id/issues/:issueId
```

## UI

### Document List (`/documents`)
- Grouped by project
- Shows title, last updated date
- "New Document" button opens an issue picker — select which issue this doc is for

### Document Detail (`/documents/:id`)
- **Left side:** Novel.sh rich text editor with auto-save
  - Editable title
  - Project selector dropdown
  - Goal linker (multi-select tags)
- **Right side:** Issue sidebar
  - Source issue title, identifier, status, priority, assignee
  - Issue description
  - Live comments feed (polls every 15s)
  - Agents respond to the issue → comments appear here in real time

### Linked Documents
On issue detail and goal detail pages, a "Linked Documents" section shows all documents linked to that issue/goal.

## Agent Workflow

Agents interact with documents through the issue system they already know:

1. Board creates issue: "Write the family finance summary for March"
2. Board creates document from that issue
3. Agent is assigned the issue
4. Agent reads the issue, fetches the document via API, edits the content
5. Agent posts a comment on the issue: "Updated the doc with March expenses"
6. Board sees the comment in the doc sidebar, reviews the changes

### Agent API Usage

Agents can also create/edit documents programmatically:

```bash
# Create a document from an issue
POST /api/companies/{companyId}/documents
Authorization: Bearer $PAPERCLIP_API_KEY
{ "title": "March Finance Report", "issueId": "{issueId}" }

# Update document content
PATCH /api/documents/{docId}
Authorization: Bearer $PAPERCLIP_API_KEY
{ "content": { "type": "doc", "content": [...] } }
```

## Editor

Uses [Novel.sh](https://novel.sh/) — a Notion-style WYSIWYG editor built on Tiptap. Supports:
- Headings, paragraphs, lists
- Bold, italic, code
- Slash commands
- Auto-save (debounced PATCH on every change)
