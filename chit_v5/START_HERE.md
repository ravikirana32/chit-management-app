# Start Here

```bash
cp .env.example .env
docker compose up -d
npm install
npm run db:migrate
npm run db:seed
npm run start:dev
```

Open:
- Swagger: http://localhost:3000/docs
- Health: http://localhost:3000/api/v1/health

This ZIP is intended to replace the previous backend scaffold directory as the consolidated baseline.
