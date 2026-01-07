# API - Client Layer

REST API clients for backend services.

---

## Module Context

**Role**: Centralized API communication layer for backend services that cannot use Supabase directly.

**Current State**: Clean modular structure with domain-specific API clients.

---

## Directory Structure

```
api/
├── client.ts           # Base API config (httpOnly, apiClient helper)
├── adminUsers.ts       # Admin user management
├── boards.ts           # Board/notice management
├── classes.ts          # Class CRUD
├── consultations.ts    # Consultation records
├── gradePromotion.ts   # Grade promotion operations
├── nas.ts              # NAS storage operations
├── notices.ts          # Notice/announcement APIs
├── rotation.ts         # Rotation class APIs
├── teachers.ts         # Teacher management
└── timetable.ts        # Timetable operations
```

---

## Implementation Patterns

### Base Client Setup
```typescript
// client.ts - Base configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:7000';

export async function apiClient<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  return response.json();
}
```

### Domain-Specific Client
```typescript
// gradePromotion.ts
import { apiClient } from './client';

export const gradePromotionApi = {
  async execute(options: PromotionOptions): Promise<PromotionResult> {
    return apiClient('/api/grade-promotion', {
      method: 'POST',
      body: JSON.stringify(options),
    });
  },
};
```

---

## When to Use API vs Supabase Direct

### Use Supabase Client (Preferred)
- Simple CRUD operations
- Queries with joins
- Real-time subscriptions
- Row-level security enforcement

### Use REST API
- Complex business logic
- External service integration (Makeedu sync)
- File operations (NAS)
- Operations requiring server-side secrets
- Grade promotion (complex transaction)

---

## Local Golden Rules

### Do's
- Use TypeScript generics for type safety
- Handle errors consistently
- Export typed API objects
- Keep each file under 150 lines
- Use async/await pattern

### Don'ts
- Don't use axios (use native fetch)
- Don't expose internal API details
- Don't put business logic in API layer
- Don't create circular dependencies
- Don't hardcode URLs

---

*Last updated: 2025-01-07*
