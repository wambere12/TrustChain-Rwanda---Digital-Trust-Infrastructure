import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config();

const sqlHost = process.env.SQL_HOST || "/cloudsql/sunlit-hangar-dfx4d:europe-west2:ai-studio-7e9c3e16";
const sqlDbName = process.env.SQL_DB_NAME || "postgres";
const user = process.env.SQL_ADMIN_USER || "postgres";
const password = process.env.SQL_ADMIN_PASSWORD || "postgres";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  schemaFilter: ["public"],
  dbCredentials: {
    host: sqlHost,
    user: user,
    password: password,
    database: sqlDbName,
    ssl: false,
  },
  verbose: true,
});
