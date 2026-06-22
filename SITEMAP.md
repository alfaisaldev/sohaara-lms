# Sohaara LMS — Sitemap

## Legend

| Mark | Meaning |
|------|---------|
| `PUB` | Public (no auth) |
| `AUTH` | Any authenticated user |
| `SA` | super_admin |
| `AD` | admin |
| `CM` | content_manager |
| `LR` | learner |
| `—` | Not applicable |

---

## Web App (`apps/web`)

### Public Pages

| Route | Page |
|-------|------|
| `/` | Landing Page |
| `/auth/login` | Login |
| `/auth/register` | Register |

### Authenticated Pages

All under `(dashboard)` layout — require `accessToken` in localStorage.

#### Dashboard & Profile

| Route | Page | Notes |
|-------|------|-------|
| `/dashboard` | User Dashboard | |
| `/profile` | Profile | |

#### Courses

| Route | Page | SA | AD | CM | LR | Notes |
|-------|------|----|----|----|----|-------|
| `/courses` | Course List | AUTH | AUTH | AUTH | AUTH | "New Course" btn restricted to SA/AD/CM via `useCan` |
| `/courses/create` | Create Course | AUTH | AUTH | AUTH | — | `useCan('admin','manager','instructor')` |
| `/courses/[courseId]` | Course Detail | AUTH | AUTH | AUTH | AUTH | Staff sees curriculum tabs; learner sees enroll/continue |
| `/courses/[courseId]/edit` | Edit Course | AUTH | AUTH | AUTH | — | `useCan('admin','manager','instructor')` |
| `/courses/[courseId]/player` | Player Index | AUTH | AUTH | AUTH | AUTH | Requires enrollment |
| `/courses/[courseId]/player/[lessonId]` | Lesson Player | AUTH | AUTH | AUTH | AUTH | Requires enrollment |
| `/courses/[courseId]/quiz` | Quiz List | AUTH | AUTH | AUTH | AUTH | "New Quiz" btn restricted to SA/AD/CM |
| `/courses/[courseId]/quiz/create` | Create Quiz | AUTH | AUTH | AUTH | — | |
| `/courses/[courseId]/quiz/[quizId]` | Take Quiz | AUTH | AUTH | AUTH | AUTH | |
| `/courses/[courseId]/assignment` | Assignment List | AUTH | AUTH | AUTH | AUTH | "New Assignment" btn restricted |
| `/courses/[courseId]/assignment/[assignmentId]` | Assignment Detail | AUTH | AUTH | AUTH | AUTH | |
| `/courses/[courseId]/resources` | Course Resources | AUTH | AUTH | AUTH | AUTH | |

#### Learning, Skills, Certificates

| Route | Page | Notes |
|-------|------|-------|
| `/learning-paths` | Learning Paths | |
| `/learning-paths/[pathId]` | Path Detail | |
| `/skills` | Skills | |
| `/certificates` | My Certificates | |
| `/verify/[certificateNumber]` | Verify Certificate | PUBLIC (no auth) |
| `/blog` | Blog List | |
| `/blog/[postId]` | Blog Post | |

#### Community

| Route | Page | Notes |
|-------|------|-------|
| `/community` | Community List | |
| `/community/[postId]` | Community Post | |

#### Misc

| Route | Page | Notes |
|-------|------|-------|
| `/analytics` | User Analytics | |
| `/reports` | User Reports | |
| `/media` | Media | Dead route — redirects to `/dashboard` |

---

## Admin App (`apps/admin`)

### Public

| Route | Page |
|-------|------|
| `/admin/login` | Admin Login |

### Authenticated Pages

All under `admin/layout.tsx` — require `adminToken` in localStorage.

#### Visible to both Admin & Content Manager

| Route | Page | Notes |
|-------|------|-------|
| `/admin/dashboard` | Dashboard | Sidebar item for both |
| `/admin/courses` | Courses CRUD | Sidebar item for both |
| `/admin/courses/create` | Create Course | |
| `/admin/courses/[id]` | Course Builder | Full curriculum editor, lesson modal, DnD |
| `/admin/categories` | Categories CRUD | Sidebar item for both |
| `/admin/learning-paths` | Learning Paths CRUD | Sidebar item for both |
| `/admin/certificates` | Certificates CRUD | Sidebar item for both |
| `/admin/skills` | Skills CRUD | Sidebar item for both |
| `/admin/analytics` | Analytics | Sidebar item for both; CM sees "View Learners" quick action |
| `/admin/reports` | Reports | Sidebar item for both; CM sees "Learners Report" instead of "Users Report" |

#### Visible to both — Learners subset

| Route | Page | Notes |
|-------|------|-------|
| `/admin/users?role=learner` | Learners List | CM auto-filtered to learner role |
| `/admin/users/[id]/progress` | Learner Progress | Accessed by clicking a learner row |

#### Admin only (hidden from Content Manager sidebar)

| Route | Page | Notes |
|-------|------|-------|
| `/admin/users` | Users CRUD | Full CRUD; CM auto-filtered to learners |
| `/admin/organizations` | Organizations CRUD | |
| `/admin/settings` | Settings | 4 groups: General, Learning, Notifications, Security |
| `/admin/media` | Media Library | Upload, delete, filter by type |
| `/admin/audit` | Audit Log | Filterable by action type |

---

## API Endpoints (`apps/api`)

### Public (no auth)

| Method | Route |
|--------|-------|
| GET | `/api/v1/health` |
| POST | `/api/v1/auth/login` |
| POST | `/api/v1/auth/register` |
| POST | `/api/v1/auth/refresh` |
| GET | `/api/v1/certificates/verify/:certificateNumber` |

### Auth — Any authenticated user

| Module | Method | Route |
|--------|--------|-------|
| Auth | POST | `/api/v1/auth/logout` |
| Auth | POST | `/api/v1/auth/change-password` |
| Auth | GET | `/api/v1/auth/me` |
| Roles | GET | `/api/v1/roles` |
| Users | GET | `/api/v1/users` |
| Users | GET | `/api/v1/users/:id` |
| Users | PUT | `/api/v1/users/:id` |
| Users | GET | `/api/v1/users/:id/profile` |
| Users | PUT | `/api/v1/users/:id/profile` |
| Users | GET | `/api/v1/users/:id/roles` |
| Users | POST | `/api/v1/users/:id/roles` |
| Users | DELETE | `/api/v1/users/:id/roles/:roleId` |
| Orgs | GET | `/api/v1/organizations` |
| Orgs | GET | `/api/v1/organizations/:id` |
| Orgs | GET | `/api/v1/organizations/:id/departments` |
| Orgs | POST | `/api/v1/organizations/:id/departments` |
| Courses | GET | `/api/v1/courses` |
| Courses | GET | `/api/v1/courses/:id` |
| Courses | GET | `/api/v1/courses/categories` |
| Enrollments | POST | `/api/v1/courses/:courseId/enroll` |
| Enrollments | GET | `/api/v1/enrollments` |
| Enrollments | GET | `/api/v1/enrollments/:courseId` |
| Enrollments | POST | `/api/v1/lessons/:lessonId/complete` |
| Enrollments | PUT | `/api/v1/lessons/:lessonId/progress` |
| Enrollments | DELETE | `/api/v1/enrollments/:courseId` |
| Enrollments | GET | `/api/v1/bookmarks` |
| Enrollments | POST | `/api/v1/bookmarks` |
| Enrollments | DELETE | `/api/v1/bookmarks/:id` |
| Enrollments | GET | `/api/v1/notes` |
| Enrollments | POST | `/api/v1/notes` |
| Enrollments | PUT | `/api/v1/notes/:id` |
| Enrollments | DELETE | `/api/v1/notes/:id` |
| Quiz | GET | `/api/v1/courses/:courseId/quizzes` |
| Quiz | GET | `/api/v1/quizzes/:id` |
| Quiz | POST | `/api/v1/quizzes/:quizId/attempts` |
| Quiz | GET | `/api/v1/quizzes/:quizId/attempts` |
| Quiz | GET | `/api/v1/attempts/:id` |
| Quiz | POST | `/api/v1/attempts/:id/answers` |
| Quiz | POST | `/api/v1/attempts/:id/submit` |
| Assignment | GET | `/api/v1/courses/:courseId/assignments` |
| Assignment | GET | `/api/v1/assignments/:id` |
| Assignment | POST | `/api/v1/assignments/:id/submit` |
| Assignment | GET | `/api/v1/assignments/:id/my-submission` |
| Certificate | GET | `/api/v1/certificates` |
| Certificate | GET | `/api/v1/certificates/:id` |
| Certificate | GET | `/api/v1/courses/:courseId/certificates` |
| Certificate | GET | `/api/v1/templates` |
| Learning Paths | GET | `/api/v1/learning-paths` |
| Learning Paths | GET | `/api/v1/learning-paths/:id` |
| Skills | GET | `/api/v1/skills/categories` |
| Skills | GET | `/api/v1/skills/user/me` |
| Skills | GET | `/api/v1/skills/user/:userId` |
| Skills | POST | `/api/v1/skills/user/:skillId` |
| Analytics | GET | `/api/v1/analytics/dashboard` |
| Analytics | GET | `/api/v1/analytics/courses/:courseId` |
| Analytics | GET | `/api/v1/analytics/users` |
| Analytics | GET | `/api/v1/analytics/system` |
| Search | GET | `/api/v1/search` |
| Search | GET | `/api/v1/search/courses` |
| Notifications | GET | `/api/v1/notifications` |
| Notifications | GET | `/api/v1/notifications/unread-count` |
| Notifications | POST | `/api/v1/notifications/:id/read` |
| Notifications | POST | `/api/v1/notifications/read-all` |
| Notifications | GET | `/api/v1/notifications/preferences` |
| Notifications | PUT | `/api/v1/notifications/preferences` |
| Notifications | DELETE | `/api/v1/notifications/:id` |
| Media | POST | `/api/v1/media/upload` |
| Media | POST | `/api/v1/media/avatar` |
| Media | GET | `/api/v1/media` |
| Media | POST | `/api/v1/media/folders` |
| Media | GET | `/api/v1/media/folders` |
| Media | DELETE | `/api/v1/media/folders/:id` |
| Media | GET | `/api/v1/media/:id` |
| Media | PUT | `/api/v1/media/:id` |
| Media | DELETE | `/api/v1/media/:id` |
| SCORM | GET | `/api/v1/scorm/:id` |
| SCORM | POST | `/api/v1/scorm/track` |
| AI | POST | `/api/v1/ai/generate-questions` |
| AI | POST | `/api/v1/ai/summarize` |
| AI | POST | `/api/v1/ai/recommend-courses` |
| Community | GET | `/api/v1/community/posts` |
| Community | GET | `/api/v1/community/posts/:id` |
| Community | POST | `/api/v1/community/posts` |
| Community | PUT | `/api/v1/community/posts/:id` |
| Community | DELETE | `/api/v1/community/posts/:id` |
| Community | POST | `/api/v1/community/replies` |
| Community | DELETE | `/api/v1/community/replies/:id` |
| Blog | GET | `/api/v1/blog/posts` |
| Blog | GET | `/api/v1/blog/posts/:id` |
| Blog | GET | `/api/v1/blog/categories` |
| Config | GET | `/api/v1/config/:key` |

### Auth + Staff role (admin or content_manager)

| Module | Method | Route | Notes |
|--------|--------|-------|-------|
| Users | POST | `/api/v1/users` | Create user |
| Courses | POST | `/api/v1/courses` | |
| Courses | PUT | `/api/v1/courses/:id` | |
| Courses | DELETE | `/api/v1/courses/:id` | |
| Courses | POST | `/api/v1/courses/:id/publish` | |
| Courses | POST | `/api/v1/courses/:id/archive` | |
| Courses | POST | `/api/v1/courses/:id/duplicate` | |
| Courses | POST | `/api/v1/courses/categories` | |
| Courses | PUT | `/api/v1/courses/categories/:id` | |
| Courses | DELETE | `/api/v1/courses/categories/:id` | |
| Curriculum | All POST/PUT/DELETE | `/api/v1/courses/:courseId/modules`, `/api/v1/modules/:id`, `/api/v1/sections/:id`, `/api/v1/lessons/:id`, etc. | Full curriculum CRUD |
| Enrollments | GET | `/api/v1/enrollments/admin/:userId` | |
| Enrollments | GET | `/api/v1/enrollments/admin/:userId/:courseId` | |
| Quiz | POST/PUT/DELETE | `/api/v1/courses/:courseId/quizzes`, `/api/v1/quizzes/:id`, `/api/v1/quizzes/:quizId/questions`, `/api/v1/questions/:id`, etc. | Quiz & question CRUD |
| Quiz | GET | `/api/v1/question-banks` | |
| Assignment | POST/PUT/DELETE | `/api/v1/courses/:courseId/assignments`, `/api/v1/assignments/:id` | |
| Assignment | GET | `/api/v1/assignments/:id/submissions` | |
| Assignment | POST | `/api/v1/submissions/:id/grade` | |
| Assignment | POST | `/api/v1/assignments/:id/rubric` | |
| Certificate | POST | `/api/v1/certificates/issue` | |
| Certificate | POST | `/api/v1/certificates/:id/revoke` | |
| Certificate | POST | `/api/v1/templates` | |
| Certificate | DELETE | `/api/v1/templates/:id` | |
| Learning Paths | POST/PUT/DELETE | `/api/v1/learning-paths`, `/api/v1/learning-paths/:id` | |
| Learning Paths | POST | `/api/v1/learning-paths/:id/publish` | |
| Learning Paths | POST | `/api/v1/learning-paths/:id/enroll` | |
| Skills | POST/PUT/DELETE | `/api/v1/skills/categories`, `/api/v1/skills/:id` | |
| Analytics | GET | `/api/v1/analytics/admin/users/:userId` | |
| Reports | GET | `/api/v1/reports/learners` | |
| Reports | GET | `/api/v1/reports/courses` | |
| Reports | GET | `/api/v1/reports/enrollments` | |
| Reports | GET | `/api/v1/reports/certificates` | |
| SCORM | POST | `/api/v1/scorm/upload/:courseId` | |
| SCORM | GET | `/api/v1/scorm/course/:courseId` | |
| SCORM | DELETE | `/api/v1/scorm/:id` | |
| Community | POST | `/api/v1/community/posts/:id/pin` | |
| Blog | POST/PUT/DELETE | `/api/v1/blog/posts`, `/api/v1/blog/posts/:id` | |
| Blog | POST/PUT/DELETE | `/api/v1/blog/categories`, `/api/v1/blog/categories/:id` | |

### Auth + Admin only

| Module | Method | Route | Notes |
|--------|--------|-------|-------|
| Users | DELETE | `/api/v1/users/:id` | Soft-delete |
| Orgs | POST | `/api/v1/organizations` | |
| Orgs | PUT | `/api/v1/organizations/:id` | |
| Orgs | DELETE | `/api/v1/organizations/:id` | |
| Orgs | POST | `/api/v1/organizations/:id/departments` | |
| Orgs | POST | `/api/v1/organizations/:id/teams` | |
| Orgs | POST | `/api/v1/organizations/:id/groups` | |
| Audit | GET | `/api/v1/audit-logs` | |
| Audit | GET | `/api/v1/audit-logs/actions` | |

### Admin panel — Keycloak user-management proxy (`super_admin`/`admin`)

Browser-side admin-panel user management goes through these endpoints.
Each one proxies to Keycloak's Admin REST API using a bootstrap
`admin-cli` service-account token (cached 5 min in-process) — the
browser never talks to Keycloak's Admin API directly.

| Method | Route | Notes |
|--------|-------|-------|
| GET | `/api/v1/admin/users` | List + search (`?search=&page=&limit=`) |
| POST | `/api/v1/admin/users` | Create user with `actions=[UPDATE_PASSWORD]`; Keycloak emails the set-password link |
| POST | `/api/v1/admin/users/:id/roles` | Replace realm roles (`{ roles: ['admin','learner'] }`) |
| POST | `/api/v1/admin/users/:id/disable` | `enabled=false` in Keycloak, `status='inactive'` in LMS |
| POST | `/api/v1/admin/users/:id/enable` | Mirror of `/disable` |
| POST | `/api/v1/admin/users/:id/send-reset` | Re-send the set-password email |

---

## Summary — Pages per role

| Role | Web pages | Admin pages |
|------|-----------|-------------|
| super_admin | 26 | 17 |
| admin | 26 | 17 |
| content_manager | 26 (minus restricted buttons) | 12 (sidebar) + 2 learners routes |
| learner | 24 (no create/edit) | 1 (`/admin/login` only) |

**Totals:** 26 web routes + 17 admin routes + ~135 API endpoints = ~178 total.
