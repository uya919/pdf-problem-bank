# Backend - FastAPI Services

Auxiliary backend services for operations requiring server-side execution.

---

## Module Context

**Role**: Handle operations that cannot be performed client-side:
- Makeedu student sync (scraping)
- NAS file operations
- Grade promotion logic
- Admin user management with service key

**Note**: Most data operations use Supabase directly from frontend. This backend handles edge cases.

---

## Directory Structure

```
backend/app/
├── main.py              # FastAPI app entry (141 lines)
├── config.py            # Configuration
│
├── routers/
│   ├── sync.py          # Makeedu sync endpoints
│   ├── admin_users.py   # User management
│   ├── grade_promotion.py # Grade promotion
│   └── nas.py           # NAS file operations
│
├── services/
│   └── nas_client.py    # NAS API client
│
└── utils/
    ├── environment.py   # Environment detection
    ├── class_parser.py  # Class name parsing
    └── supabase_admin.py # Admin Supabase client
```

---

## Tech Stack

- FastAPI 0.100+
- Python 3.11+
- httpx for async HTTP
- Supabase Python client (admin mode)
- Playwright (Railway worker only)

---

## Implementation Patterns

### Router Template
```python
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/sync", tags=["sync"])

class SyncRequest(BaseModel):
    force: bool = False

class SyncResponse(BaseModel):
    success: bool
    synced_count: int
    message: str

@router.post("/students", response_model=SyncResponse)
async def sync_students(request: SyncRequest):
    """
    Sync students from Makeedu to Supabase.
    """
    try:
        # Implementation
        return SyncResponse(
            success=True,
            synced_count=count,
            message=f"Synced {count} students"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

---

## Endpoints Summary

### Active Endpoints
| Method | Path | Purpose |
|--------|------|---------|
| POST | /api/sync/students | Sync students from Makeedu |
| POST | /api/sync/trigger | Trigger Railway worker |
| GET | /api/admin/users | List admin users |
| POST | /api/admin/users | Create admin user |
| POST | /api/grade-promotion | Execute grade promotion |
| GET | /api/nas/textbooks | List NAS textbooks |

---

## Configuration

### Environment Variables
```bash
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...  # Admin key, never expose

# Makeedu
MAKEEDU_ID=username
MAKEEDU_PW=password

# NAS
NAS_HOST=192.168.x.x
NAS_USER=admin
NAS_PASSWORD=xxx

# Railway
RAILWAY_WORKER_URL=https://xxx.up.railway.app
```

---

## Local Golden Rules

### Do's
- Use Pydantic models for request/response
- Add docstrings to all endpoints
- Use dependency injection for services
- Handle errors with HTTPException
- Log important operations

### Don'ts
- Don't expose service keys in responses
- Don't use sync (blocking) operations
- Don't put business logic in routers
- Don't create endpoints over 50 lines
- Don't bypass Supabase RLS without reason

---

## CORS Configuration

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://hyeyum.vercel.app",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

*Last updated: 2025-01-07*
