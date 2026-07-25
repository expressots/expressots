# 03-authorization-rbac

Role and permission based authorization with `@RequireRoles`, `@RequirePermissions`, and JWT authentication.

## Documentation

- [Guards & Authorization](https://doc.expresso-ts.com/docs/features/guards)
- [Authorization setup](https://doc.expresso-ts.com/docs/features/authorization)
- [Authentication guide](https://doc.expresso-ts.com/docs/guides/authentication)

## Quick start

```bash
npm install
cp .env.example .env
npm run dev
```

### Try it

```bash
# Login as admin (seed: admin@expressots.dev / password123)
curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@expressots.dev","password":"password123"}'

# Admin dashboard (requires admin role)
curl -s http://localhost:3000/api/admin/dashboard \
  -H 'Authorization: Bearer <accessToken>'

# Documents (requires documents:read permission)
curl -s http://localhost:3000/api/documents \
  -H 'Authorization: Bearer <accessToken>'
```

## Tests

```bash
npm test
```

Covers 401 (unauthenticated), 403 (wrong role or permission), and 200 (authorized) responses.
