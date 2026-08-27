import { Controller, Get, Module } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';
import { lookup } from 'node:dns/promises';
import { createConnection } from 'node:net';

@Controller('health')
class HealthController {
  constructor(private readonly sequelize: Sequelize) {}

  @Get()
  async check() {
    try {
      await this.sequelize.authenticate();
      return { status: 'ok', database: 'ok', timestamp: new Date().toISOString() };
    } catch (error: any) {
      console.error('[HEALTH][DATABASE] connection failed', {
        name: error?.name ?? 'UnknownError',
        code: error?.parent?.code ?? error?.original?.code ?? error?.code ?? null,
        message: String(error?.parent?.message ?? error?.original?.message ?? error?.message ?? 'Unknown database error')
          .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, '[REDACTED_DATABASE_URL]')
          .replace(/password=[^\s&]+/gi, 'password=[REDACTED]'),
      });
      return { status: 'error', database: 'error', timestamp: new Date().toISOString() };
    }
  }

  @Get('db-diagnostic')
  async databaseDiagnostic() {
    const rawUrl = process.env.DATABASE_URL?.trim();

    if (!rawUrl) {
      return {
        status: 'error',
        stage: 'configuration',
        databaseUrl: 'missing',
        message: 'DATABASE_URL is not configured',
        timestamp: new Date().toISOString(),
      };
    }

    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      return {
        status: 'error',
        stage: 'configuration',
        databaseUrl: 'present_but_invalid',
        message: 'DATABASE_URL could not be parsed as a URL',
        timestamp: new Date().toISOString(),
      };
    }

    const host = parsed.hostname;
    const port = Number(parsed.port || '5432');
    const database = parsed.pathname.replace(/^\//, '') || null;
    const isInternal = host.startsWith('dpg-') && !host.includes('.');

    const result: Record<string, unknown> = {
      status: 'checking',
      databaseUrl: 'present',
      target: {
        host,
        port,
        database,
        connectionType: isInternal ? 'render_internal' : 'external_or_other',
        sslParameterPresent: Boolean(parsed.searchParams.get('sslmode')),
      },
      timestamp: new Date().toISOString(),
    };

    try {
      const dnsResult = await lookup(host);
      result.dns = { status: 'ok', address: dnsResult.address, family: dnsResult.family };
    } catch (error: any) {
      result.status = 'error';
      result.stage = 'dns';
      result.dns = {
        status: 'failed',
        code: error?.code ?? null,
        message: error?.message ?? 'DNS lookup failed',
      };
      console.error('[DB-DIAGNOSTIC][DNS] failed', result.dns);
      return result;
    }

    const tcp = await new Promise<Record<string, unknown>>((resolve) => {
      const startedAt = Date.now();
      const socket = createConnection({ host, port });
      let settled = false;

      const finish = (value: Record<string, unknown>) => {
        if (settled) return;
        settled = true;
        socket.destroy();
        resolve({ ...value, elapsedMs: Date.now() - startedAt });
      };

      socket.setTimeout(10000);
      socket.once('connect', () => finish({ status: 'ok' }));
      socket.once('timeout', () =>
        finish({ status: 'failed', code: 'ETIMEDOUT', message: 'TCP connection timed out' }),
      );
      socket.once('error', (error: any) =>
        finish({
          status: 'failed',
          code: error?.code ?? null,
          message: error?.message ?? 'TCP connection failed',
        }),
      );
    });

    result.tcp = tcp;

    if (tcp.status !== 'ok') {
      result.status = 'error';
      result.stage = 'tcp';
      console.error('[DB-DIAGNOSTIC][TCP] failed', { host, port, ...tcp });
      return result;
    }

    result.status = 'ok';
    result.stage = 'tcp';
    result.message =
      'DNS and TCP connection succeeded. PostgreSQL authentication was not tested by this diagnostic endpoint.';
    console.log('[DB-DIAGNOSTIC] DNS and TCP connection succeeded', {
      host,
      port,
      database,
      connectionType: isInternal ? 'render_internal' : 'external_or_other',
    });
    return result;
  }
}

@Module({ controllers: [HealthController] })
export class HealthModule {}
