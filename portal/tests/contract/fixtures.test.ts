import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import * as schemas from '../../app/.server/dlt/schemas';

const readFixture = (name: string) => {
  const p = path.join(__dirname, '..', 'fixtures', name);
  return JSON.parse(fs.readFileSync(p, 'utf8'));
};

const withData = (schema: z.ZodTypeAny) => z.object({
  success: z.boolean(),
  message: z.string(),
  data: schema
});

const withListData = (schema: z.ZodTypeAny) => z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.array(schema),
  meta: schemas.paginationMetaSchema
});

describe('API Fixtures Contract', () => {
  it('login-success parses', () => {
    const data = readFixture('login-success.json');
    expect(() => withData(schemas.loginResponseSchema).parse(data)).not.toThrow();
  });

  it('profile parses', () => {
    const data = readFixture('profile.json');
    expect(() => withData(schemas.userProfileSchema).parse(data)).not.toThrow();
  });

  it('merchant parses', () => {
    const data = readFixture('merchant.json');
    expect(() => withData(schemas.merchantSchema).parse(data)).not.toThrow();
  });

  it('machine-clients parses', () => {
    const data = readFixture('machine-clients.json');
    expect(() => withListData(schemas.machineClientSchema).parse(data)).not.toThrow();
  });

  it('integration-keys parses', () => {
    const data = readFixture('integration-keys.json');
    expect(() => withData(schemas.integrationKeysSchema).parse(data)).not.toThrow();
  });

  it('team-members parses', () => {
    const data = readFixture('team-members.json');
    expect(() => withListData(schemas.teamMemberSchema).parse(data)).not.toThrow();
  });

  it('invitations parses', () => {
    const data = readFixture('invitations.json');
    expect(() => withListData(schemas.teamInvitationSchema).parse(data)).not.toThrow();
  });

  it('transaction-list parses', () => {
    const data = readFixture('transaction-list.json');
    expect(() => schemas.transactionListSchema.parse(data)).not.toThrow(); // The schema already has data/meta
  });

  it('transaction-detail parses', () => {
    const data = readFixture('transaction-detail.json');
    expect(() => withData(schemas.transactionSchema).parse(data)).not.toThrow();
  });

  it('history-list parses', () => {
    const data = readFixture('history-list.json');
    // History list has data array and meta with coverage inside.
    const historyListSchema = z.object({
      success: z.boolean(),
      message: z.string(),
      data: z.array(schemas.historyItemSchema),
      meta: z.object({
        current_page: z.number(),
        per_page: z.number(),
        total: z.number(),
        last_page: z.number(),
        coverage: schemas.historyCoverageSchema
      })
    });
    expect(() => historyListSchema.parse(data)).not.toThrow();
  });

  it('metrics parses', () => {
    const data = readFixture('metrics.json');
    expect(() => withData(schemas.metricsSchema).parse(data)).not.toThrow();
  });

  it('charts parses', () => {
    const data = readFixture('charts.json');
    expect(() => withData(schemas.chartsSchema).parse(data)).not.toThrow();
  });

  it('currency-catalogue parses', () => {
    const data = readFixture('currency-catalogue.json');
    expect(() => withData(z.array(schemas.currencyItemSchema)).parse(data)).not.toThrow();
  });
});
