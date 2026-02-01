import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFundsToExistingChurches202601180001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Buscar todas as igrejas existentes
    const churches = await queryRunner.query('SELECT id FROM church');

    if (churches.length === 0) {
      console.log('Nenhuma igreja encontrada para adicionar fundos.');
      return;
    }

    // Tipos de fundos com suas descrições
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

    // Para cada igreja, criar os 10 fundos
    for (const church of churches) {
      console.log(`Adicionando fundos à igreja ${church.id}`);

      for (const fundType of fundTypes) {
        // Verificar se o fundo já existe
        const existingFund = await queryRunner.query(
          'SELECT id FROM fund WHERE "churchId" = $1 AND type = $2',
          [church.id, fundType.type],
        );

        if (existingFund.length === 0) {
          // Criar o fundo
          await queryRunner.query(
            `INSERT INTO fund ("churchId", type, description, balance, "isActive", "createdAt", "updatedAt") 
             VALUES ($1, $2, $3, 0, true, NOW(), NOW())`,
            [church.id, fundType.type, fundType.description],
          );
        }
      }
    }

    console.log(
      `✅ Fundos adicionados com sucesso a ${churches.length} igrejas`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverter: não fazer nada, pois queremos manter os fundos
    console.log('⚠️ Migration de adicionar fundos não é reversível');
  }
}
