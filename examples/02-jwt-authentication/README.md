# 02-jwt-authentication

JWT authentication with `AuthProvider`, `Principal`, login/register, and `@RequireAuthentication`.

## Documentation

- [Authentication guide](https://doc.expresso-ts.com/docs/guides/authentication)
- [Guards](https://doc.expresso-ts.com/docs/features/guards)

## Quick start

```bash
npm install
cp .env.example .env
npm run dev
```

### Try it

```bash
# Login (seed user: demo@expressots.dev / password123)
curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@expressots.dev","password":"password123"}'

# Use the accessToken from the response
curl -s http://localhost:3000/api/users/me \
  -H 'Authorization: Bearer <accessToken>'
```

## Tests

```bash
npm test
```
