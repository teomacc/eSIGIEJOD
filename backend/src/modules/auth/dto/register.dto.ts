/**
 * DTO - Data Transfer Object para Registo
 * 
 * Valida dados recebidos do cliente para registar novo usuário
 */
export class RegisterDto {
  // Identificação
  email!: string;
  password!: string;
  nomeCompleto!: string;
  apelido?: string;
  sexo?: string;
  dataNascimento?: string;
  estadoCivil?: string;
  nacionalidade?: string;
  documentoIdentidade?: string;
  
  // Ministerial
  funcaoMinisterial?: string;
  ministerio?: string;
  dataConversao?: string;
  dataBatismo?: string;
  igrejaLocal?: string;
  liderDireto?: string;
  ativoNoMinisterio?: boolean;
  
  // Contactos
  telefone?: string;
  endereco?: string;
  cidade?: string;
  provincia?: string;
  
  // Sistema
  churchId!: string;
  roles!: string[];
  departamento?: string;
  username?: string;
}

/**
 * DTO - Resposta de Registo
 */
export class RegisterResponseDto {
  id!: string;
  email!: string;
  name!: string;
  churchId!: string;
  roles!: string[];
  message!: string;
}
