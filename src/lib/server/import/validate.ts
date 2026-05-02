import Ajv2020, { type ValidateFunction } from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import schemaV1 from './schema-v1.json';
import type { ExportData } from '$lib/server/export/json-schema';

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);

export const validateExport: ValidateFunction<ExportData> = ajv.compile<ExportData>(schemaV1);

export function formatAjvErrors(): string[] {
  return (validateExport.errors ?? []).map(
    (e) => `${e.instancePath || '/'} ${e.message ?? 'invalid'}`,
  );
}

export const MAX_IMPORT_BYTES = 10 * 1024 * 1024;
