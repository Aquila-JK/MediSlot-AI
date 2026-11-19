# MediSlot AI — Firestore Security Specification (Phase 0)

## 1. Data Invariants

1. **Identity & Authentication Integrity**:
   - All client read/write operations (except the single connectivity check document `/test/connection`) require `request.auth != null`.
   - All write operations require `request.auth.token.email_verified == true`.
   - Document `uid`, `ownerId`, `ownerUid`, `clinicianUid`, `patientUid`, and `recipientUid` fields on creation MUST strictly equal `request.auth.uid` (no identity spoofing).
   - No client may self-assign `role` or `isAdmin` fields; administrative privileges are verified solely via `/admins/{uid}` existence or the verified bootstrap email (`aquilajk8@gmail.com` with `email_verified == true`).
2. **PII Isolation**:
   - `/users/{userId}` stores only non-PII workspace metadata (`uid`, `displayName`, `photoUrl`, `activePortal`).
   - `/users/{userId}/private/{docId}` isolates PII (`email`, `phone`, `mrn`, `bloodType`, `address`) and is readable/writable exclusively by the owning user (`request.auth.uid == userId`) or a verified admin.
   - `/patients/{patientId}` is readable, listable, and writable exclusively by the owning clinician (`clinicianUid == request.auth.uid`) or a verified admin.
3. **Referential & Master Gate Integrity**:
   - Every `/appointments/{appointmentId}` creation MUST verify via `exists()` that `/doctors/{incoming().doctorId}` exists.
   - Every `/aiSessions/{sessionId}/messages/{messageId}` operation MUST pass the parent Master Gate (`get(.../aiSessions/{sessionId}).data.ownerUid == request.auth.uid`), while `list` verifies `resource.data.ownerUid == request.auth.uid` without `get()`/`exists()`.
4. **Temporal & Immutable Field Integrity**:
   - `createdAt` and `updatedAt` MUST equal `request.time` on creation; `updatedAt` MUST equal `request.time` on update.
   - Ownership/parent identifiers and `createdAt` are immutable after creation.
5. **State Machine & Terminal Locking**:
   - Appointments reaching `completed` or `cancelled` cannot be modified by non-admins.
   - Non-admin updates must strictly declare modified keys via `incoming().diff(existing()).affectedKeys().hasOnly([...])` and pass `isValidAppointment(incoming())`.
6. **Volumetric & Array Boundaries**:
   - Every document ID path variable passes `isValidId(id)` (`size <= 128`, `^[a-zA-Z0-9_\-]+$`).
   - Every string enforces explicit `.size()` bounds and every array enforces `.size() <= MAX` plus element type validation.

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Shadow Field Injection on User Profile (`users/{uid}`)**: Adding `"isAdmin": true` or `"role": "superadmin"` alongside valid fields -> MUST fail (`keys().hasOnly(...)`).
2. **Cross-User PII Read (`users/{otherUid}/private/info`)**: Authenticated user A requesting `get` on user B's private PII doc -> MUST fail.
3. **Email Spoofing (`aquilajk8@gmail.com` with `email_verified: false`)**: Unverified token claiming admin email performing write or admin read -> MUST fail.
4. **Blanket Unscoped List Query (`appointments`, `patients`, `notifications`)**: Calling `list` without matching owner/clinician/patient predicate on `resource.data` -> MUST fail.
5. **Orphaned Appointment Creation**: Creating `/appointments/{id}` referencing a non-existent `doctorId: "non_existent_doc"` -> MUST fail (`exists()` check).
6. **Identity Spoofing on Appointment**: User A creating `/appointments/{id}` with `patientUid: "userB"` and `clinicianUid: "userC"` -> MUST fail.
7. **Terminal State Bypass**: Patient/clinician attempting to change an appointment with `status: "completed"` back to `status: "confirmed"` -> MUST fail.
8. **Value Poisoning on Whitelisted Update Key**: Updating `status` on a pending appointment to an invalid enum string `"hacked"` or a 2KB string -> MUST fail (`isValidAppointment`).
9. **Client Timestamp Forgery**: Creating a doctor or appointment with a forged `createdAt` or `updatedAt` not equal to `request.time` -> MUST fail.
10. **ID Poisoning / Resource Exhaustion**: Writing `/patients/{"a".repeat(300)}` or `/patients/bad$id` -> MUST fail (`isValidId`).
11. **Unbounded Array Attack**: Creating a doctor doc with 50 items in `tags` or `slots` -> MUST fail (`.size() <= 10` / `<= 16`).
12. **Master Gate Bypass on AI Subcollection**: User B attempting to `create` or `get` `/aiSessions/{sessionOwnedByA}/messages/{msgId}` -> MUST fail parent `get()` Master Gate.
