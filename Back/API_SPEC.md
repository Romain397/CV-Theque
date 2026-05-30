API REST - CV-Theque

Base URL (dev): http://127.0.0.1:8000

Endpoints principaux

- POST /login
  - body: {"email":"...","password":"..."}
  - returns: 200 + {user, token} (JWT)

- POST /register
  - body: {"name","email","password","role"}
  - returns: 201 + {user, token} (if auto-approved) or pending flag

- GET /users
  - returns: list of users (no password)

- GET /users/{id}
  - returns: single user

- PUT /users/{id}
  - auth: Bearer token required (admin or owner)
  - body: full update (name,email,password,role,approved...)
  - returns: updated user

- DELETE /users/{id}
  - auth: Bearer token required (admin or owner)
  - returns: {message: 'deleted'}

Auth

- JWT issued at login/register (HS256, secret read from APP_SECRET)
- Include in requests using header: Authorization: Bearer <token>

Examples

Register bootstrap admin:

```bash
curl -i -X POST -H "Content-Type: application/json" -d '{"name":"Admin","email":"admin@example.com","password":"adminpass","role":"admin"}' http://127.0.0.1:8000/register
```

Login:

```bash
curl -i -X POST -H "Content-Type: application/json" -d '{"email":"admin@example.com","password":"adminpass"}' http://127.0.0.1:8000/login
```

List users:

```bash
curl -i http://127.0.0.1:8000/users
```

Update user (admin):

```bash
curl -i -X PUT -H "Content-Type: application/json" -H "Authorization: Bearer <TOKEN>" -d '{"name":"Alice Updated"}' http://127.0.0.1:8000/users/1
```

Notes / next steps

- Add ETag/Cache-Control for GET responses
- Add PATCH for partial updates
- Add OpenAPI spec and automated tests
- Improve RBAC if needed
