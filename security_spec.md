# Security Specification & Red Team Audit

## 1. Data Invariants
1. **Verified Authentication Gate**: All reads and writes to `users/{userId}` and `reports/{reportId}` require `request.auth != null` and `request.auth.token.email_verified == true`.
2. **PII Isolation**: `users/{userId}` contains `email` and is readable/writable ONLY by the owner (`request.auth.uid == userId`) or a verified admin (`admins/{uid}` / bootstrapped verified admin email). Listing `users` is denied to non-admins.
3. **Immutable Ownership & Timestamps**: `uid` on `users`, `ownerId` on `reports`, and `createdAt` on both collections are immutable after creation. `createdAt == request.time` on create; `updatedAt == request.time` on create and update.
4. **Anti-Shadow-Field & Size Bounds**: Every `create` uses `keys().hasAll(...) && keys().hasOnly(...)`; every `update` uses `affectedKeys().hasOnly(...)` combined with `isValidUserProfile` / `isValidStatisticalReport`. Every string enforces `.size()`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. Unauthenticated read/write to `users/{uid}` -> `PERMISSION_DENIED`
2. Authenticated user with `email_verified == false` attempting to create `users/{uid}` -> `PERMISSION_DENIED`
3. Authenticated user attempting to read another user's `users/{otherUid}` -> `PERMISSION_DENIED`
4. Authenticated user attempting `list` on `/users` -> `PERMISSION_DENIED`
5. Shadow field injection (`isAdmin: true` or `role: "admin"`) on `users/{uid}` create -> `PERMISSION_DENIED`
6. Invalid `poste` enum (`"superadmin"`) on `users/{uid}` -> `PERMISSION_DENIED`
7. Forged `createdAt` or `updatedAt` timestamp (not `request.time`) -> `PERMISSION_DENIED`
8. Oversized `displayName` (> 120 chars) or `email` (> 160 chars) -> `PERMISSION_DENIED`
9. Invalid document ID (`../../etc/passwd` or > 128 chars) on `reports/{reportId}` -> `PERMISSION_DENIED`
10. Creating `reports/{reportId}` with `ownerId != request.auth.uid` (identity spoofing) -> `PERMISSION_DENIED`
11. Updating `reports/{reportId}` to change `ownerId` or `reportKind` or `createdAt` -> `PERMISSION_DENIED`
12. `list` query on `/reports` without scoping `ownerId == request.auth.uid` -> `PERMISSION_DENIED`
