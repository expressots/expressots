# 07-file-upload

File uploads with the `@FileUpload` decorator and Multer.

## Documentation

- [File upload guide](https://doc.expresso-ts.com/docs/guides/file-upload)
- [Decorators reference](https://doc.expresso-ts.com/docs/features/decorators)

## Quick start

```bash
npm install
cp .env.example .env
npm run dev
```

### Try it

```bash
curl -s -X POST http://localhost:3000/api/upload/avatar \
  -F 'avatar=@./path/to/image.png'
```

Uploaded files are stored in the `uploads/` directory.

## Tests

```bash
npm test
```

Tests verify the health endpoint and that the upload route is registered.
