# Makeedu Student Sync

Automated synchronization of student data from Makeedu LMS to Supabase.

---

## Overview

**Purpose**: Keep student roster in sync with external LMS (Makeedu).
**Trigger**: Manual button in admin UI or scheduled Railway worker.
**Flow**: Makeedu (scrape) -> Railway Worker -> Supabase

---

## Architecture

```
[Admin UI] --trigger--> [Railway Worker]
                              |
                              v
                        [Makeedu LMS]
                         (Playwright)
                              |
                              v
                        [Parse Students]
                              |
                              v
                        [Supabase Upsert]
                              |
                              v
                        [Return Results]
```

---

## Sync Process

### 1. Trigger Sync

Admin clicks "Sync Students" button in admin dashboard.

```typescript
// Frontend
const { mutate: triggerSync } = useMakeeduSync();
triggerSync();
```

### 2. Railway Worker

Worker receives request and launches browser.

```python
# worker.py
@app.post("/sync")
async def sync_students():
    browser = await playwright.chromium.launch()
    page = await browser.new_page()
    # Login to Makeedu
    # Navigate to student list
    # Scrape student data
    # Return parsed data
```

### 3. Data Parsing

Extract student information from Makeedu pages.

**Fields Extracted**:
- Name
- Phone number
- Parent phone
- Grade (normalized: "중등 1학년" -> "중1")
- School name
- Enrollment date
- Status (active/inactive)

### 4. Supabase Upsert

Match students by name + parent phone (composite key).

```python
# Upsert logic
for student in parsed_students:
    existing = supabase.table('students')
        .select('id')
        .eq('name', student.name)
        .eq('parent_phone', student.parent_phone)
        .single()

    if existing:
        supabase.table('students')
            .update(student)
            .eq('id', existing.id)
    else:
        supabase.table('students')
            .insert(student)
```

---

## Configuration

### Environment Variables (Railway)

```bash
MAKEEDU_ID=academy_username
MAKEEDU_PW=academy_password
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
```

### Railway Service

- Service: `makeedu-worker-production`
- Dockerfile: Uses playwright base image
- Schedule: Manual trigger or cron

---

## Key Files

| File | Location | Purpose |
|------|----------|---------|
| worker.py | railway-worker/ | FastAPI endpoints |
| scrape_makeedu.py | railway-worker/ | Scraping logic |
| sync.py | backend/routers/ | Trigger endpoint |
| sync_manager.py | backend/services/ | Sync orchestration |
| useMakeeduSync.ts | frontend/hooks/ | Frontend hook |

---

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| Login failed | Invalid credentials | Check MAKEEDU_ID/PW |
| Timeout | Slow page load | Increase timeout |
| Parse error | HTML structure changed | Update selectors |
| Duplicate key | Composite key conflict | Check matching logic |

---

## Grade Normalization

```python
def normalize_grade(raw: str) -> str:
    """
    Normalize grade string to standard format.

    Examples:
        "중등 1학년" -> "중1"
        "고등학교 2학년" -> "고2"
        "초등 3" -> "초3"
    """
    # Implementation in sync_manager.py
```

---

## Monitoring

- Railway logs: Check for scraping errors
- Supabase logs: Check for DB errors
- Admin UI: Show sync status and last sync time

---

*Last updated: 2025-01-07*
