# HOPE ERP — Student Setup Guide

## Prerequisites

Install the following before starting:

- Git
- Node.js (use a version compatible with the project)
- npm (included with Node.js)
- Access to the team's authorized PostgreSQL development database

Docker is not required.

## 1. Clone the repository

Clone the Techvengers repository using the URL provided by the team:

```bash
git clone https://github.com/jaymmedija22/Techvengers.git
cd Techvengers
```

## 2. Install backend dependencies

```bash
cd server
npm install
```

## 3. Configure environment variables

Create a local `.env` file inside the `server` folder.

Add the required variables:

```dotenv
DATABASE_URL=your_authorized_postgresql_connection_string
PORT=3000
```

Replace the placeholder with the connection string supplied through the team's approved secure method.

Never commit `.env` files, database passwords, or other secrets to Git.

## 4. Run database migrations

From the `server` directory, run:

```bash
npm run migrate
```

The migration runner applies available SQL migration files in filename order and records successfully applied migrations in `schema_migrations`.

If the migrations folder is empty, no application tables will be created yet.

## 5. Start the backend

```bash
npm start
```

The backend uses port 3000 by default unless another port is configured.

## 6. Troubleshooting

- **Missing package.json:** Make sure the terminal is inside the `server` directory before running npm commands.
- **Database connection error:** Check your local `.env`, database access, and connection settings.
- **Migration error:** Read the terminal output and contact the DB Admin before manually changing the database.
- **Missing tables:** Confirm that the required SQL migration files have been provided and applied.

## Security

- Do not commit `.env` files.
- Do not place real passwords in `.env.example` or this README.
- Use only database credentials authorized for development.
- Never run migrations against production without explicit authorization.