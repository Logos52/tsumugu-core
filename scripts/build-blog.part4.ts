import { dirname, join, resolve } from "node:path";

import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

const ROOT = resolve(HERE, "..");

export const POSTS_DIR = resolve(ROOT, "content/blog/posts");

export const OUT_DIR = resolve(ROOT, "app/public/blog");
