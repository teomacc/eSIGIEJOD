import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';

/**
 * FUNÇÃO BOOTSTRAP - Ponto de entrada da aplicação
 * 
 * Responsabilidade: Iniciar o servidor NestJS
 * 
 * Fluxo:
 * 1. Criar aplicação NestJS com AppModule
 * 2. Configurar pipes de validação global
 * 3. Habilitar CORS para comunicação frontend-backend
 * 4. Iniciar servidor na porta configurada
 */
async function bootstrap() {
  // Criar aplicação NestJS
  // AppModule importa todos os módulos e suas configurações
  const app = await NestFactory.create(AppModule);

  // Obter serviço de configuração
  const configService = app.get(ConfigService);

  // Prefixo global para todas as rotas da API
  app.setGlobalPrefix('api');

  // Pipe de validação global
  // Valida automaticamente DTOs em todas as requisições
  // Exemplo: @IsEmail(), @IsNumber(), @IsUUID() definidos na classe DTO
  app.useGlobalPipes(new ValidationPipe());

  // Configurar CORS (Cross-Origin Resource Sharing)
  // Permite que frontend em http://localhost:3000 comunique com backend
  app.enableCors({
    origin: configService.get('CORS_ORIGIN') || 'http://localhost:3000',
    credentials: true, // Permite cookies/credenciais
  });

  // Obter porta configurada do .env
  const port = configService.get('APP_PORT') || 3001;

  // Iniciar servidor
  await app.listen(port);

  // Log de sucesso
  console.log(`
    ╔════════════════════════════════════════╗
    ║  eSIGIEJOD - Sistema de Gestão Financeira
    ║  Backend rodando em http://localhost:${port}
    ║  Ambiente: ${configService.get('NODE_ENV')}
    ╚════════════════════════════════════════╝
  `);
}

// Executar bootstrap
bootstrap();
