// Side-effect-only module: loads .env into process.env. Import this file
// FIRST, before any other local module, in index.js. ES module imports run
// in the order they're written (top to bottom) before the rest of the
// file's code — so as long as this is the first import line, every other
// module that reads process.env.* at its own top level (like Prisma reading
// DATABASE_URL when the client is constructed) will see real values.
import dotenv from 'dotenv'
dotenv.config()
