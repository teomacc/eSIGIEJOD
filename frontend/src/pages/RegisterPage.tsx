/**
 * PÁGINA DE REGISTO COMPLETA (RegisterPage)
 * 
 * Formulário completo para registar novo membro/obreiro
 * Organizado em 4 seções com navegação por tabs
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import '../styles/RegisterPage.css';

interface FormData {
  // Identificação
  nomeCompleto: string;
  apelido: string;
  sexo: string;
  dataNascimento: string;
  estadoCivil: string;
  nacionalidade: string;
  documentoIdentidade: string;
  
  // Ministerial
  funcaoMinisterial: string;
  ministerio: string;
  dataConversao: string;
  dataBatismo: string;
  igrejaLocal: string;
  
  // Contactos
  telefone: string;
  email: string;
  endereco: string;
  cidade: string;
  provincia: string;
  
  // Acesso ao Sistema
  username: string;
  password: string;
  confirmPassword: string;
  roles: string[];
  
  // Administrativo
  departamento: string;
  nivelAprovacao: number;
  assinaDocumentos: boolean;
  limiteFinanceiro: number;
}

interface FormErrors {
  email?: string;
  nomeCompleto?: string;
  password?: string;
  confirmPassword?: string;
  roles?: string;
  submit?: string;
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { user, isLoading, error: authError, register, hasRole } = useAuth();
  
  /**
   * Navegação por tabs (planeada):
   * Controlaria a secção ativa do formulário entre
   * 'identificacao' | 'ministerial' | 'contactos' | 'sistema'.
   * Removido temporariamente para evitar erro de variável não utilizada.
   */

  const initialFormData: FormData = {
    // Identificação
    nomeCompleto: '',
    apelido: '',
    sexo: '',
    dataNascimento: '',
    estadoCivil: '',
    nacionalidade: 'Moçambicana',
    documentoIdentidade: '',
    
    // Ministerial
    funcaoMinisterial: 'MEMBRO',
    ministerio: '',
    dataConversao: '',
    dataBatismo: '',
    igrejaLocal: '',
    
    // Contactos
    telefone: '',
    email: '',
    endereco: '',
    cidade: '',
    provincia: '',
    
    // Sistema
    username: '',
    password: '',
    confirmPassword: '',
    roles: ['VIEWER'],
    
    // Administrativo
    departamento: '',
    nivelAprovacao: 0,
    assinaDocumentos: false,
    limiteFinanceiro: 0,
  };

  const [formData, setFormData] = useState<FormData>(initialFormData);

  const [errors, setErrors] = useState<FormErrors>({});
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Verificar permissão para acessar esta página
  if (!user || (!hasRole('DIRECTOR') && !hasRole('TREASURER') && !hasRole('ADMIN'))) {
    return (
      <div className="register-container">
        <div className="register-error">
          <h1>Acesso Negado</h1>
          <p>Apenas Administradores, Directores e Tesoureiros podem registar novos usuários.</p>
          <button onClick={() => navigate('/')}>Voltar ao Dashboard</button>
        </div>
      </div>
    );
  }

  /**
   * VALIDAR EMAIL
   * 
   * Validação:
   * - Não estar vazio
   * - Ser email válido (contém @ e .)
   * - Não estar já registado (servidor valida)
   */
  const validateEmail = (email: string): string | undefined => {
    if (!email) return 'Email é obrigatório';
    if (!email.includes('@') || !email.includes('.')) {
      return 'Email inválido';
    }
    return undefined;
  };

  /**
   * VALIDAR NOME
   */
  const validateName = (name: string): string | undefined => {
    if (!name) return 'Nome é obrigatório';
    if (name.length < 3) return 'Nome deve ter pelo menos 3 caracteres';
    return undefined;
  };

  /**
   * VALIDAR PASSWORD
   * 
   * Requerimentos:
   * - Mínimo 8 caracteres
   * - Pelo menos 1 maiúscula
   * - Pelo menos 1 número
   */
  const validatePassword = (password: string): string | undefined => {
    if (!password) return 'Password é obrigatório';
    if (password.length < 8) return 'Password deve ter pelo menos 8 caracteres';
    if (!/[A-Z]/.test(password)) return 'Password deve conter uma maiúscula';
    if (!/\d/.test(password)) return 'Password deve conter um número';
    return undefined;
  };

  /**
   * VALIDAR CONFIRMAÇÃO DE PASSWORD
   */
  const validateConfirmPassword = (
    confirmPassword: string,
    password: string
  ): string | undefined => {
    if (!confirmPassword) return 'Confirmação de password é obrigatória';
    if (confirmPassword !== password) return 'Passwords não correspondem';
    return undefined;
  };

  /**
   * VALIDAR ROLES
   */
  const validateRoles = (roles: string[]): string | undefined => {
    if (roles.length === 0) return 'Selecione pelo menos um role';
    return undefined;
  };

  /**
   * LIDAR COM MUDANÇA DE INPUT
   */
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    if (name === 'roles') {
      // Multi-select de roles
      const selectedRole = value;
      setFormData(prev => {
        const newRoles = prev.roles.includes(selectedRole)
          ? prev.roles.filter(r => r !== selectedRole)
          : [...prev.roles, selectedRole];
        return { ...prev, roles: newRoles };
      });
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    // Limpar erro do campo quando o usuário começa a digitar
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  /**
   * VALIDAR FORMULÁRIO
   */
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    newErrors.email = validateEmail(formData.email);
    newErrors.nomeCompleto = validateName(formData.nomeCompleto);
    newErrors.password = validatePassword(formData.password);
    newErrors.confirmPassword = validateConfirmPassword(
      formData.confirmPassword,
      formData.password
    );
    newErrors.roles = validateRoles(formData.roles);

    // Remover erros undefined
    Object.keys(newErrors).forEach(key => {
      if (newErrors[key as keyof FormErrors] === undefined) {
        delete newErrors[key as keyof FormErrors];
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * LIDAR COM SUBMIT
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage('');

    if (!validateForm()) {
      return;
    }

    try {
      await register({
        email: formData.email,
        password: formData.password,
        name: formData.nomeCompleto,
        churchId: user.churchId,
        roles: formData.roles,
      });

      setSuccessMessage(
        `Usuário ${formData.nomeCompleto} registado com sucesso! Redirecionando...`
      );

      // Limpar formulário
      setFormData(initialFormData);

      // Redirecionar após 2 segundos
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err: any) {
      setErrors({
        submit: err.message || 'Erro ao registar usuário',
      });
    }
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <h1>Registar Novo Usuário</h1>
        <p className="register-subtitle">
          Registar novo usuário para sua igreja
        </p>

        {/* Mensagem de Erro Geral */}
        {(errors.submit || authError) && (
          <div className="register-error-message">
            {errors.submit || authError}
          </div>
        )}

        {/* Mensagem de Sucesso */}
        {successMessage && (
          <div className="register-success-message">{successMessage}</div>
        )}

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="register-form">
          {/* Campo: Email */}
          <div className="register-form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="usuario@iglesia.com"
              className={errors.email ? 'input-error' : ''}
              disabled={isLoading}
            />
            {errors.email && <span className="error-text">{errors.email}</span>}
          </div>

          {/* Campo: Nome */}
          <div className="register-form-group">
            <label htmlFor="nomeCompleto">Nome Completo</label>
            <input
              type="text"
              id="nomeCompleto"
              name="nomeCompleto"
              value={formData.nomeCompleto}
              onChange={handleChange}
              placeholder="João Silva"
              className={errors.nomeCompleto ? 'input-error' : ''}
              disabled={isLoading}
            />
            {errors.nomeCompleto && <span className="error-text">{errors.nomeCompleto}</span>}
          </div>

          {/* Campo: Password */}
          <div className="register-form-group">
            <label htmlFor="password">Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Mínimo 8 caracteres, 1 maiúscula, 1 número"
                className={errors.password ? 'input-error' : ''}
                disabled={isLoading}
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            {errors.password && (
              <span className="error-text">{errors.password}</span>
            )}
            <div className="password-requirements">
              <p>A password deve conter:</p>
              <ul>
                <li className={formData.password.length >= 8 ? 'valid' : ''}>
                  Mínimo 8 caracteres
                </li>
                <li className={/[A-Z]/.test(formData.password) ? 'valid' : ''}>
                  Uma letra maiúscula
                </li>
                <li className={/\d/.test(formData.password) ? 'valid' : ''}>
                  Um número
                </li>
              </ul>
            </div>
          </div>

          {/* Campo: Confirmar Password */}
          <div className="register-form-group">
            <label htmlFor="confirmPassword">Confirmar Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Digite a password novamente"
              className={errors.confirmPassword ? 'input-error' : ''}
              disabled={isLoading}
            />
            {errors.confirmPassword && (
              <span className="error-text">{errors.confirmPassword}</span>
            )}
          </div>

          {/* Campo: Roles */}
          <div className="register-form-group">
            <label>Papéis do Usuário</label>
            <div className="roles-checkboxes">
              {['DIRECTOR', 'TREASURER', 'AUDITOR', 'VIEWER'].map(role => (
                <div key={role} className="checkbox-item">
                  <input
                    type="checkbox"
                    id={role}
                    name="roles"
                    value={role}
                    checked={formData.roles.includes(role)}
                    onChange={handleChange}
                    disabled={isLoading}
                  />
                  <label htmlFor={role}>
                    {role === 'DIRECTOR'
                      ? 'Director Financeiro'
                      : role === 'TREASURER'
                      ? 'Tesoureiro'
                      : role === 'AUDITOR'
                      ? 'Auditor'
                      : 'Visualizador'}
                  </label>
                </div>
              ))}
            </div>
            {errors.roles && <span className="error-text">{errors.roles}</span>}
          </div>

          {/* Botão Submit */}
          <button
            type="submit"
            className="register-button"
            disabled={isLoading}
          >
            {isLoading ? 'Registando...' : 'Registar Usuário'}
          </button>
        </form>

        {/* Link Voltar */}
        <p className="register-back-link">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="back-button"
          >
            Voltar ao Dashboard
          </button>
        </p>
      </div>
    </div>
  );
}
