import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * MIGRAÇÃO: Criar Igreja GERAL
 * 
 * Esta igreja especial representa a conta geral da organização,
 * separada das igrejas locais. Não é um somatório, mas uma entidade
 * própria com seus fundos independentes.
 * 
 * Uso:
 * - LIDER_FINANCEIRO_GERAL pode operar no contexto desta igreja
 * - Requisições executadas pelo Líder Geral podem deduzir desta conta
 * - Fundos desta igreja são da organização, não de igreja específica
 */
export class CreateIgrejaGeral202601260001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Verificar se já existe
    const exists = await queryRunner.query(
      `SELECT id FROM churches WHERE nome = 'GERAL' LIMIT 1`,
    );

    if (exists && exists.length > 0) {
      console.log('Igreja GERAL já existe, pulando criação');
      return;
    }

    // Criar igreja GERAL
    const churchId = 'GERAL-' + Date.now();
    await queryRunner.query(
      `INSERT INTO churches (id, nome, localizacao, email, telefone, "createdAt", "updatedAt") 
       VALUES ($1, 'GERAL', 'Sede Nacional', 'geral@sigiejod.org', '', NOW(), NOW())`,
      [churchId],
    );

    console.log(`Igreja GERAL criada com ID: ${churchId}`);

    // Criar fundos padrão para igreja GERAL
    const fundTypes = [
      { type: 'GENERAL', description: 'Fundo Geral' },
      { type: 'CONSTRUCTION', description: 'Fundo de Construção' },
      { type: 'MISSIONS', description: 'Fundo de Missões' },
      { type: 'SOCIAL', description: 'Fundo Social' },
      { type: 'EVENTS', description: 'Fundo de Eventos' },
      { type: 'EMERGENCY', description: 'Fundo de Emergência' },
      { type: 'SPECIAL_PROJECTS', description: 'Fundo de Projectos Especiais' },
      { type: 'YOUTH', description: 'Fundo da Juventude' },
      { type: 'WOMEN', description: 'Fundo das Mulheres' },
      { type: 'MAINTENANCE', description: 'Fundo de Manutenção' },
    ];

    for (const fund of fundTypes) {
      await queryRunner.query(
        `INSERT INTO funds (id, "churchId", type, description, balance, "isActive", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, $3, 0, true, NOW(), NOW())`,
        [churchId, fund.type, fund.description],
      );
    }

    console.log('Fundos criados para igreja GERAL');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Buscar ID da igreja GERAL
    const result = await queryRunner.query(
      `SELECT id FROM churches WHERE nome = 'GERAL' LIMIT 1`,
    );

    if (!result || result.length === 0) {
      return;
    }

    const churchId = result[0].id;

    // Deletar fundos
    await queryRunner.query(`DELETE FROM funds WHERE "churchId" = $1`, [churchId]);

    // Deletar igreja
    await queryRunner.query(`DELETE FROM churches WHERE id = $1`, [churchId]);

    console.log('Igreja GERAL removida');
  }
}
