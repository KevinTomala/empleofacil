const cron = require('node-cron');
const db = require('../db');
const { runAcreditadosImport } = require('../controllers/integraciones.controller');

const ORIGEN = 'ademy';

let localRunInProgress = false;

async function getLastSuccessAt() {
  const [rows] = await db.query(
    'SELECT last_success_at FROM integracion_sync_state WHERE origen = ? LIMIT 1',
    [ORIGEN]
  );
  return rows[0]?.last_success_at || null;
}

async function executeAdemySync(trigger = 'cron') {
  if (localRunInProgress) {
    return;
  }

  localRunInProgress = true;
  try {
    const lastSuccessAt = await getLastSuccessAt();
    const pageSize = Math.min(Math.max(Number(process.env.ADEMY_SYNC_PAGE_SIZE || 100), 1), 500);
    const payload = {
      page_size: pageSize
    };
    if (lastSuccessAt) {
      payload.updated_since = new Date(lastSuccessAt).toISOString();
    }

    const result = await runAcreditadosImport(payload);
    console.log(
      `[ademy-sync] trigger=${trigger} total=${result.total} created=${result.created} updated=${result.updated} skipped=${result.skipped} errors=${result.errors}`
    );
  } catch (error) {
    if (error?.code === 'SYNC_ALREADY_RUNNING') {
      console.log('[ademy-sync] Se omitio una ejecucion porque ya existe una sincronizacion en curso.');
      return;
    }
    console.error(`[ademy-sync] Fallo en sincronizacion automatica: ${error.message}`);
  } finally {
    localRunInProgress = false;
  }
}

function toBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).trim().toLowerCase() === 'true';
}

function startAdemySyncJob() {
  const enabled = toBoolean(process.env.ADEMY_SYNC_ENABLED, false);
  if (!enabled) {
    return;
  }

  const cronExpression = process.env.ADEMY_SYNC_CRON || '*/10 * * * *';
  if (!cron.validate(cronExpression)) {
    console.error(`[ademy-sync] Expresion cron invalida: ${cronExpression}`);
    return;
  }

  const timezone = process.env.ADEMY_SYNC_TZ || 'America/Guayaquil';
  cron.schedule(cronExpression, () => {
    executeAdemySync('cron');
  }, { timezone });

  console.log(`[ademy-sync] Scheduler activo con cron="${cronExpression}" timezone="${timezone}"`);

  const runOnStart = toBoolean(process.env.ADEMY_SYNC_RUN_ON_START, true);
  if (runOnStart) {
    executeAdemySync('startup');
  }
}

module.exports = {
  startAdemySyncJob
};
