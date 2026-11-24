# Decision Log

The important choices made while building SpaceFlow. For each one: what was decided, what else was considered, what it costs, and why it won.

Each entry follows the same shape:

- **Decision**: what we did.
- **Alternatives**: what we could have done instead.
- **Trade-off**: what we give up.
- **Why**: why it is still the right call for this project.

## Table of Contents

- [Architecture](#architecture)
- [Domain and business rules](#domain-and-business-rules)
- [API](#api)
- [Frontend](#frontend)
- [Testing and quality](#testing-and-quality)
- [Tooling and workflow](#tooling-and-workflow)
- [Known limitations](#known-limitations)

---

## Architecture

### D1. Clean Architecture with four layers

- **Decision**: the backend is split into `domain`, `application`, `infrastructure` and `presentation`. Dependencies only point inward: `domain` imports nothing from the other layers, and nothing from Express.
- **Alternatives**: a classic "routes → controllers → models" Express app; a framework with its own structure (NestJS).
- **Trade-off**: more files and more indirection (interfaces, a composition root) than a small app strictly needs.
- **Why**: the business rules (quotas, overlaps, cancellation) are the heart of the project. Keeping them free of HTTP and storage means they can be unit tested without a server or a database. It also means we can swap Express or the storage layer without touching them. NestJS would have given the structure for free, but it hides the dependency injection. Writing it by hand shows that we understand it.

### D2. Manual dependency injection in one composition root

- **Decision**: `src/container.ts` is the only file that creates concrete classes and wires them together. Services receive their dependencies through their constructor.
- **Alternatives**: a DI container library (InversifyJS, tsyringe); services that create their own dependencies.
- **Trade-off**: the wiring is written by hand, and it grows with every new service.
- **Why**: with four services, a library would add decorators and configuration for no gain. One explicit file makes the whole object graph readable at a glance. Tests call `createContainer({ clock, ids })` to inject a fixed clock and predictable ids.

### D3. Repository interfaces, in-memory implementations

- **Decision**: the domain defines `IBookingRepository`, `IResourceRepository`, and so on. Infrastructure provides `InMemory*` versions backed by a `Map`. The interfaces are Promise-based, even though a `Map` is synchronous.
- **Alternatives**: Prisma with SQLite or PostgreSQL from day one.
- **Trade-off**: data is lost when the server restarts, and there are no real transactions.
- **Why**: persistence was not the point of the exercise, and a database would slow down setup and tests. The interfaces are async on purpose, so a database version can replace the in-memory one by changing only the four repository lines in `container.ts`. The in-memory repositories store and return **copies**, like a real database would. Otherwise a test could pass only because a service mutated an object directly instead of calling `save()`.

### D4. Ports for time and ids (`IClock`, `IIdGenerator`)

- **Decision**: "now" and new ids come from injected interfaces, never from `new Date()` or `crypto.randomUUID()` inside business code. Entities receive `now` as a parameter.
- **Alternatives**: call the system clock directly and mock it with `jest.useFakeTimers()`.
- **Trade-off**: one extra parameter on several methods.
- **Why**: almost every rule depends on time (past slots, booking windows, active bookings, cancellation before the start). An explicit clock makes these tests deterministic and easy to read, without global fake timers.

---

## Domain and business rules

### D5. `TimeSlot` as a Value Object

- **Decision**: a time interval is an immutable `TimeSlot`, created only through `TimeSlot.create()`, which rejects invalid dates and `start >= end`.
- **Alternatives**: two `Date` fields on `Booking`, validated in the service.
- **Trade-off**: one more class.
- **Why**: a `TimeSlot` is always valid, so no other code needs to re-check it. Duration and overlap logic live in one place. Dates are stored as timestamps and copied on the way out, because `Date` is mutable.

### D6. Half-open intervals `[start, end)`

- **Decision**: two slots overlap if `a.start < b.end && b.start < a.end`. A booking ending at 11:00 does not conflict with one starting at 11:00.
- **Alternatives**: closed intervals, where touching slots conflict.
- **Trade-off**: none in practice.
- **Why**: this matches how people think about back-to-back bookings, and it is the standard convention for time ranges.

### D7. Strategy pattern for role quotas

- **Decision**: each role has a booking policy (`StudentBookingStrategy`: 2 h, 2 active bookings, 7 days ahead; `FacultyBookingStrategy`: 8 h, 5 active bookings, 30 days ahead). `BookingPolicyFactory` picks one by role. Both extend `QuotaBookingStrategy`, which holds the shared checks, so each subclass only passes its numbers.
- **Alternatives**: an `if (role === 'STUDENT') ... else ...` chain inside `BookingService`; a plain config object of limits.
- **Trade-off**: more classes than a simple config object for rules that today differ only by numbers.
- **Why**: the service no longer knows which rules apply (Open/Closed principle). A role with a different kind of rule, such as "no weekend bookings", becomes a new strategy class, not a new branch in the service. The factory uses a `Record<Role, …>` instead of a `switch`, so adding a role without a policy is a compile error.

### D8. Admins follow faculty quotas

- **Decision**: the factory maps `ADMIN` to the faculty policy.
- **Alternatives**: no limits for admins; a dedicated admin policy.
- **Trade-off**: an admin cannot book a long slot for an event without a workaround.
- **Why**: the specification sets no admin quota. Reusing the faculty rules is the most conservative reading, and it is a one-line change if the rule evolves.

### D9. Observer pattern for the audit log

- **Decision**: `BookingService` publishes `BOOKING_CONFIRMED` and `BOOKING_CANCELLED` events through `BookingEventPublisher`. `AuditLogObserver` writes them to the audit log.
- **Alternatives**: `BookingService` writes the audit log directly; a message queue.
- **Trade-off**: the flow is less direct to follow when reading the service, and observers run synchronously, one after the other.
- **Why**: the service does not know who listens. Adding an email notification later means subscribing a new observer, not editing booking code. A message queue would be overkill for one listener.

### D10. Order of checks when creating a booking

- **Decision**: resource exists → valid slot, not in the past → resource not in maintenance → role quotas → conflicts with other bookings.
- **Alternatives**: any other order.
- **Trade-off**: none.
- **Why**: the cheapest checks, and the ones about the request itself, come first. The conflict check comes last because it is the only one that depends on other people's data. It is also the one that would need a transaction with a real database (see D24).

### D11. Cancellation only before the slot starts

- **Decision**: a booking can be cancelled by its owner or an admin, only while it is `CONFIRMED` and before its start time. The `Booking` entity enforces it, not the service.
- **Alternatives**: allow cancellation until the end of the slot.
- **Trade-off**: someone who leaves early cannot free the rest of their slot.
- **Why**: the specification only forbids cancelling past bookings. Forbidding cancellation once a slot has started avoids half-used bookings and keeps the rule simple. Putting it in the entity means no code path can bypass it.

### D12. "Active booking" definition

- **Decision**: an active booking is `CONFIRMED` and not yet ended (`now < end`). Only active bookings count against the quota.
- **Alternatives**: count every confirmed booking, past ones included.
- **Trade-off**: none.
- **Why**: counting past bookings would lock a student out forever after two bookings.

---

## API

### D13. Simplified authentication with an `X-User-Id` header

- **Decision**: the client sends the id of a seeded user in a header. There is no password and no token.
- **Alternatives**: JWT, sessions, OAuth.
- **Trade-off**: this is **not secure**: anyone can claim to be anyone. It is fine for a demo, never for production.
- **Why**: the specification defines roles but no login flow, and real authentication was out of scope. The check is isolated in the `authenticate` middleware, so JWT verification can replace it without changing any route or service.

### D14. Domain exceptions mapped to HTTP in one table

- **Decision**: the domain throws exceptions with a code (`SLOT_CONFLICT`, `QUOTA_EXCEEDED`, …). `errorHandler.ts` maps each code to an HTTP status in a single table.
- **Alternatives**: services or routes set HTTP statuses themselves; result objects instead of exceptions.
- **Trade-off**: exceptions are used for expected business outcomes, which some people prefer to model as return values.
- **Why**: the domain stays unaware of HTTP, and the mapping is visible in one place. Express 5 forwards errors thrown in async handlers automatically, so routes stay free of `try/catch`.

### D15. Status code choices: 409, 422, 400

- **Decision**:
  - `409 Conflict`: the slot overlaps an existing booking.
  - `422 Unprocessable Entity`: the request is well formed but breaks a business rule (quota, booking window, maintenance, invalid slot).
  - `400 Bad Request`: malformed input (`VALIDATION_ERROR`), or an action impossible in the current state (`INVALID_BOOKING_STATE`).
  - `401` / `403` / `404`: as usual.
- **Alternatives**: `400` for every client error.
- **Trade-off**: the line between 400 and 422 is debatable.
- **Why**: a precise status lets the client react without parsing messages. 409 is the standard answer to a conflict with existing state. Every error shares one body shape, `{ status, code, message, timestamp }`, so the frontend handles them all the same way.

### D16. zod for request validation

- **Decision**: request bodies and query strings are parsed with zod schemas in the presentation layer before reaching the services.
- **Alternatives**: hand-written checks; class-validator with decorators.
- **Trade-off**: the shape is described twice, once in zod and once in the OpenAPI document.
- **Why**: zod gives both runtime validation and the TypeScript type from one schema, without decorators. Validation of the HTTP shape stays in presentation, and business validation stays in the domain.

### D17. Hand-written OpenAPI document with Swagger UI

- **Decision**: `openapi.ts` describes the API, and Swagger UI serves it at `/api-docs`.
- **Alternatives**: generating the spec from zod schemas or from code comments.
- **Trade-off**: the document can drift from the code if someone forgets to update it.
- **Why**: it is simple, with no extra library, and the API is small. Generating the spec from the zod schemas is the natural next step if the API grows.

### D18. Endpoints added beyond the specification

- **Decision**: added `POST /resources`, `PATCH /resources/:id` and `GET /bookings`.
- **Why**: required by the user stories (admins put resources in maintenance; users see their bookings), even though the endpoint list did not include them.

---

## Frontend

### D19. React 18 + MUI + MUI X DataGrid

- **Decision**: MUI for components, the DataGrid for the catalog (server-side pagination), and a Stepper for the booking form.
- **Alternatives**: Tailwind with headless components (shadcn/ui); a lighter table library.
- **Trade-off**: MUI and the DataGrid are heavy (see D22).
- **Why**: they match the required stack, and they provide accessible, tested components out of the box (keyboard navigation, ARIA roles), which lets the work focus on the product.

### D20. No router library: the URL hash is the current section

- **Decision**: the section (`#catalog`, `#book`, `#mine`, `#admin`) is read from `window.location.hash` with `useSyncExternalStore`.
- **Alternatives**: React Router.
- **Trade-off**: no nested routes or URL parameters.
- **Why**: four flat sections do not need a router. Deep links and the Back button still work.

### D21. Client-side validation is a preview; the server decides

- **Decision**: the booking form checks duration, booking window and past dates live (`booking/rules.ts`), with the same messages as the server. The server checks everything again, including what the browser cannot know (conflicts, active bookings count).
- **Alternatives**: validate only on submit; share one validation package between backend and frontend.
- **Trade-off**: the limits are duplicated in two places and could drift.
- **Why**: instant feedback is much better UX, and the server remains the source of truth: if the numbers drift, the server refuses and the UI shows its message. A shared package would remove the duplication, but it would add build complexity to the monorepo for a handful of numbers.

### D22. Code splitting with `React.lazy` and vendor chunks

- **Decision**: each page is loaded on demand. React, MUI and the DataGrid each get their own long-lived chunk.
- **Alternatives**: one bundle, raising Vite's size warning limit.
- **Trade-off**: a short loading state the first time a page is opened.
- **Why**: the largest file went from about 1 MB to 420 kB. Libraries rarely change, so browsers keep them cached across deployments and only download the small app code again. Group priorities keep shared MUI components out of the DataGrid chunk.

### D23. Axios interceptors for auth and errors

- **Decision**: one Axios instance adds the `X-User-Id` header to every request and turns error responses into a typed `ApiError`.
- **Alternatives**: `fetch` with a hand-written wrapper.
- **Trade-off**: an extra dependency.
- **Why**: authentication and error handling live in one place, so pages never deal with headers or raw HTTP errors.

---

## Testing and quality

### D24. TDD on domain and application, with an 85% coverage gate

- **Decision**: domain and application code was written test-first. CI fails if their coverage drops below 85%; it is currently at 100%. Services are tested with mocked repositories. The HTTP layer is tested end to end with Supertest on the real container.
- **Alternatives**: a global coverage target over the whole codebase.
- **Trade-off**: presentation and infrastructure have no coverage threshold; they are covered by integration tests instead.
- **Why**: the threshold protects the code where bugs are expensive, the business rules, without pushing people to write low-value tests for wiring code.

### D25. Jest with SWC

- **Decision**: Jest compiles TypeScript with `@swc/jest`.
- **Alternatives**: `ts-jest`; Vitest.
- **Trade-off**: SWC strips types without checking them, so type errors are caught by `npm run typecheck`, not by the tests.
- **Why**: much faster test runs. Type checking already runs separately in CI.

### D26. TypeScript 6, not 7

- **Decision**: stay on TypeScript 6.0.
- **Why**: TypeScript 7 (the native Go port) does not ship the JavaScript compiler API that `typescript-eslint` needs for type-aware lint rules.

---

## Tooling and workflow

### D27. npm workspaces monorepo

- **Decision**: `backend` and `frontend` live in one repository, with one install, one CI and one `npm run dev`.
- **Alternatives**: two repositories; Turborepo or Nx.
- **Trade-off**: no build caching across packages.
- **Why**: two packages do not justify a monorepo tool. A small Node script (`scripts/dev.mjs`) starts both servers, so no `concurrently` dependency is needed.

### D28. Quality gates: Husky, lint-staged, GitHub Actions, protected `main`

- **Decision**: a pre-commit hook formats staged files with Prettier. CI runs format check, lint, typecheck, tests with coverage, and build on every pull request. `main` only accepts pull requests with a green CI.
- **Alternatives**: run lint and tests in the pre-commit hook too.
- **Trade-off**: a lint error is only caught in CI, not at commit time.
- **Why**: a fast hook does not slow down commits. CI is the real gate, and branch protection makes it mandatory.

### D29. LF line endings everywhere

- **Decision**: `.gitattributes` forces `eol=lf`.
- **Why**: Windows writes CRLF, but Prettier and the Linux CI expect LF. Without this, every file looks changed.

---

## Known limitations

What is deliberately not done, and what would change for production.

| Limitation                              | Why it is acceptable now                                                                            | What production would need                                                    |
| :-------------------------------------- | :-------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------- |
| Data is lost on restart (in-memory)     | Demo and tests                                                                                      | Prisma + PostgreSQL behind the existing repository interfaces                 |
| No real authentication                  | Out of scope in the specification                                                                   | JWT or session auth inside the `authenticate` middleware                      |
| Conflict check and save are two steps   | Node runs one request's in-memory steps without interleaving, so no double booking can happen today | A transaction, or an exclusion constraint on overlapping ranges in PostgreSQL |
| Availabilities are computed per UTC day | Correct and simple; the UI shows "already booked" slots instead                                     | Opening hours and the user's time zone                                        |
| Rule limits duplicated in the frontend  | The server is still the source of truth                                                             | Expose the limits through the API, or share a package                         |
| Cancellation has no confirmation dialog | The specification asks for a one-click cancel                                                       | A confirmation step or an "undo" toast                                        |
| OpenAPI written by hand                 | Small API                                                                                           | Generate it from the zod schemas                                              |
