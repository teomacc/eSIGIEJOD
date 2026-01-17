import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExpensesMovementsConfig202601170001 implements MigrationInterface {
  name = 'AddExpensesMovementsConfig202601170001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS configuracoes_financeiras (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "churchId" uuid NULL,
        "limiteMaxPorRequisicao" decimal(15,2) NOT NULL DEFAULT 50000,
        "limiteDiario" decimal(15,2) NOT NULL DEFAULT 500000,
        "limiteMensal" decimal(15,2) NOT NULL DEFAULT 5000000,
        "exigeAprovadorNivel2" boolean NOT NULL DEFAULT true,
        "exigeNotificacaoPastorObreiro" boolean NOT NULL DEFAULT true,
        "criadoPor" uuid NULL,
        "alteradoPor" uuid NULL,
        "criadoEm" TIMESTAMP NOT NULL DEFAULT now(),
        "alteradoEm" TIMESTAMP NOT NULL DEFAULT now(),
        observacoes text NULL
      );
      CREATE INDEX IF NOT EXISTS idx_config_financeira_church ON configuracoes_financeiras("churchId");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS despesas (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "requisicaoId" uuid NOT NULL,
        "churchId" uuid NOT NULL,
        "fundId" uuid NOT NULL,
        valor decimal(15,2) NOT NULL,
        "dataPagamento" date NOT NULL,
        "executadoPor" uuid NOT NULL,
        "comprovativoUrl" text NULL,
        observacoes text NULL,
        "criadoEm" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT fk_despesa_requisicao FOREIGN KEY ("requisicaoId") REFERENCES requisitions(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_despesas_church_datapagamento ON despesas("churchId", "dataPagamento");
      CREATE INDEX IF NOT EXISTS idx_despesas_requisicao ON despesas("requisicaoId");
      CREATE INDEX IF NOT EXISTS idx_despesas_fund ON despesas("fundId");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS movimentos_financeiros (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "churchId" uuid NOT NULL,
        "fundId" uuid NOT NULL,
        tipo varchar NOT NULL,
        valor decimal(15,2) NOT NULL,
        "referenciaId" uuid NOT NULL,
        "referenciaTipo" varchar NOT NULL,
        "dataMovimento" date NOT NULL,
        "criadoPor" uuid NOT NULL,
        descricao text NULL,
        "criadoEm" TIMESTAMP NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_movimentos_church_data ON movimentos_financeiros("churchId", "dataMovimento");
      CREATE INDEX IF NOT EXISTS idx_movimentos_fund_data ON movimentos_financeiros("fundId", "dataMovimento");
      CREATE INDEX IF NOT EXISTS idx_movimentos_tipo ON movimentos_financeiros(tipo);
      CREATE INDEX IF NOT EXISTS idx_movimentos_ref ON movimentos_financeiros("referenciaId");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS requisicoes_historico (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "requisicaoId" uuid NOT NULL,
        "churchId" uuid NOT NULL,
        "estadoAnterior" varchar NULL,
        "estadoNovo" varchar NOT NULL,
        "alteradoPor" uuid NOT NULL,
        "tipoAlterador" varchar NOT NULL,
        motivo text NULL,
        metadados jsonb NULL,
        "criadoEm" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT fk_hist_requisicao FOREIGN KEY ("requisicaoId") REFERENCES requisitions(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_requisicoes_historico_req ON requisicoes_historico("requisicaoId");
      CREATE INDEX IF NOT EXISTS idx_requisicoes_historico_church_created ON requisicoes_historico("churchId", "criadoEm");
    `);

    await queryRunner.query(`
      ALTER TABLE requisitions ADD COLUMN IF NOT EXISTS code varchar;
      ALTER TABLE requisitions ADD COLUMN IF NOT EXISTS attachments text;
      ALTER TABLE requisitions ADD COLUMN IF NOT EXISTS "creatorType" varchar DEFAULT 'OBREIRO';
      ALTER TABLE requisitions ADD COLUMN IF NOT EXISTS "approvedByLevel2" uuid;
      ALTER TABLE requisitions ADD COLUMN IF NOT EXISTS "notificadoPastorEm" TIMESTAMP;
      ALTER TABLE requisitions ADD COLUMN IF NOT EXISTS "motivoRejeicao" text;
      ALTER TABLE requisitions ADD COLUMN IF NOT EXISTS "approvedAmount" decimal(10,2);
      ALTER TABLE requisitions ADD COLUMN IF NOT EXISTS "requestedAt" TIMESTAMP DEFAULT now();
      ALTER TABLE requisitions ADD COLUMN IF NOT EXISTS "executedAt" TIMESTAMP;
      CREATE INDEX IF NOT EXISTS idx_requisitions_code ON requisitions(code);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_requisitions_code;
      ALTER TABLE requisitions DROP COLUMN IF EXISTS "executedAt";
      ALTER TABLE requisitions DROP COLUMN IF EXISTS "requestedAt";
      ALTER TABLE requisitions DROP COLUMN IF EXISTS "approvedAmount";
      ALTER TABLE requisitions DROP COLUMN IF EXISTS "motivoRejeicao";
      ALTER TABLE requisitions DROP COLUMN IF EXISTS "notificadoPastorEm";
      ALTER TABLE requisitions DROP COLUMN IF EXISTS "approvedByLevel2";
      ALTER TABLE requisitions DROP COLUMN IF EXISTS "creatorType";
      ALTER TABLE requisitions DROP COLUMN IF EXISTS attachments;
      ALTER TABLE requisitions DROP COLUMN IF EXISTS code;
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_requisicoes_historico_church_created;
      DROP INDEX IF EXISTS idx_requisicoes_historico_req;
      DROP TABLE IF EXISTS requisicoes_historico;
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_movimentos_ref;
      DROP INDEX IF EXISTS idx_movimentos_tipo;
      DROP INDEX IF EXISTS idx_movimentos_fund_data;
      DROP INDEX IF EXISTS idx_movimentos_church_data;
      DROP TABLE IF EXISTS movimentos_financeiros;
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_despesas_fund;
      DROP INDEX IF EXISTS idx_despesas_requisicao;
      DROP INDEX IF EXISTS idx_despesas_church_datapagamento;
      DROP TABLE IF EXISTS despesas;
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_config_financeira_church;
      DROP TABLE IF EXISTS configuracoes_financeiras;
    `);
  }
}
