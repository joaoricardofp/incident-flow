import { config } from "dotenv";

config({ path: ".env.test" });

const testDatabaseUrl = process.env.DATABASE_URL_TEST;

if (testDatabaseUrl) {
  process.env.DATABASE_URL = testDatabaseUrl;
} else {
  process.env.DATABASE_URL =
    "postgresql://incident-flow-test-missing:5432/incident-flow-test";
}
