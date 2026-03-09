import Ajv from "ajv";
import * as fs from "fs";
import * as path from "path";

const ajv = new Ajv({ allErrors: true });

const SCHEMA_DIR = path.resolve(__dirname);

const schemaCache: Record<string, any> = {};

function loadSchema(type: string): any {
  if (schemaCache[type]) return schemaCache[type];
  const filePath = path.join(SCHEMA_DIR, `${type}.schema.json`);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf-8");
  const schema = JSON.parse(raw);
  schemaCache[type] = schema;
  return schema;
}

export function validateArtifact(type: string, data: unknown): { valid: boolean; errors: string[] } {
  const schema = loadSchema(type);
  if (!schema) {
    return { valid: true, errors: [] };
  }

  const { $schema, ...schemaWithout$schema } = schema;
  const validate = ajv.compile(schemaWithout$schema);
  const valid = validate(data);

  if (valid) {
    return { valid: true, errors: [] };
  }

  const errors = (validate.errors || []).map((e) => {
    const path = e.instancePath || "(root)";
    return `${path}: ${e.message}`;
  });

  return { valid: false, errors };
}

export function listAvailableSchemas(): string[] {
  try {
    return fs
      .readdirSync(SCHEMA_DIR)
      .filter((f) => f.endsWith(".schema.json"))
      .map((f) => f.replace(".schema.json", ""));
  } catch {
    return [];
  }
}
