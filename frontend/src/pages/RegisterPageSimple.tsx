/**
 * PÁGINA DE REGISTO SIMPLIFICADA
 * Formulário básico com campos essenciais
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import '../styles/RegisterPage.css';

export default function RegisterPageSimple() {
  const navigate = useNavigate();
  const { user, isLoading, error: authError, register, hasRole } = useAuth();
  
  const [formData, setFormData] = useState({
    nomeCompleto: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    telefone: '',
    funcaoMinisterial: 'MEMBRO',
    roles: ['VIEWER'] as string[],
  });

  const [errors, setErrors] = useState<any>({});
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      if (name === 'roles') {
        setFormData(prev => {
          const newRoles = checked
            ? [...prev.roles, value]
            : prev.roles.filter(r => r !== value);
          return { ...prev, roles: newRoles };
        });
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    if (errors[name]) {
      setErrors((prev: any) => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: any = {};

    if (!formData.nomeCompleto) newErrors.nomeCompleto = 'Nome completo é obrigatório';
    if (!formData.email) newErrors.email = 'Email é obrigatório';
    if (!formData.username) newErrors.username = 'Username é obrigatório';
    if (!formData.password) newErrors.password = 'Password é obrigatório';
    
    if (formData.password && formData.password.length < 8) {
      newErrors.password = 'Password deve ter pelo menos 8 caracteres';
    }
    if (formData.password && !/[A-Z]/.test(formData.password)) {
      newErrors.password = 'Password deve conter uma maiúscula';
    }
    if (formData.password && !/\d/.test(formData.password)) {
      newErrors.password = 'Password deve conter um número';
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords não correspondem';
    }

    if (formData.roles.length === 0) {
      newErrors.roles = 'Selecione pelo menos um role';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage('');

    if (!validateForm()) {
      return;
    }

    try {
      const userData = {
        ...formData,
        churchId: user!.churchId,
        name: formData.nomeCompleto,
      };

      await register(userData);

      setSuccessMessage(`Usuário ${formData.nomeCompleto} registado com sucesso!`);

      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err: any) {
      setErrors({ submit: err.message || 'Erro ao registar usuário' });
    }
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <h1>Registar Novo Usuário</h1>
        <p className="register-subtitle">Preencha os dados básicos do novo membro</p>

        {(errors.submit || authError) && (
          <div className="register-error-message">{errors.submit || authError}</div>
        )}
        {successMessage && (
          <div className="register-success-message">{successMessage}</div>
        )}

        <form onSubmit={handleSubmit} className="register-form">
          <div className="register-form-group">
            <label htmlFor="nomeCompleto">Nome Completo *</label>
            <input
              type="text"
              id="nomeCompleto"
              name="nomeCompleto"
              value={formData.nomeCompleto}
              onChange={handleChange}
              placeholder="João da Silva"
              className={errors.nomeCompleto ? 'input-error' : ''}
            />
            {errors.nomeCompleto && <span className="error-text">{errors.nomeCompleto}</span>}
          </div>

          <div className="register-form-group">
            <label htmlFor="email">Email *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="usuario@igreja.com"
              className={errors.email ? 'input-error' : ''}
            />
            {errors.email && <span className="error-text">{errors.email}</span>}
          </div>

          <div className="register-form-group">
            <label htmlFor="username">Username *</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="joao.silva"
              className={errors.username ? 'input-error' : ''}
            />
            {errors.username && <span className="error-text">{errors.username}</span>}
          </div>

          <div className="register-form-group">
            <label htmlFor="telefone">Telefone</label>
            <input
              type="tel"
              id="telefone"
              name="telefone"
              value={formData.telefone}
              onChange={handleChange}
              placeholder="+258 84 000 0000"
            />
          </div>

          <div className="register-form-group">
            <label htmlFor="funcaoMinisterial">Função Ministerial</label>
            <select
              id="funcaoMinisterial"
              name="funcaoMinisterial"
              value={formData.funcaoMinisterial}
              onChange={handleChange}
            >
              <option value="MEMBRO">Membro</option>
              <option value="OBREIRO">Obreiro</option>
              <option value="DIACONO">Diácono</option>
              <option value="PRESBITERO">Presbítero</option>
              <option value="EVANGELISTA">Evangelista</option>
              <option value="PASTOR">Pastor</option>
            </select>
          </div>

          <div className="register-form-group">
            <label htmlFor="password">Password *</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Mínimo 8 caracteres, 1 maiúscula, 1 número"
                className={errors.password ? 'input-error' : ''}
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            {errors.password && <span className="error-text">{errors.password}</span>}
            <div className="password-requirements">
              <ul>
                <li className={formData.password.length >= 8 ? 'valid' : ''}>8+ caracteres</li>
                <li className={/[A-Z]/.test(formData.password) ? 'valid' : ''}>1 maiúscula</li>
                <li className={/\d/.test(formData.password) ? 'valid' : ''}>1 número</li>
              </ul>
            </div>
          </div>

          <div className="register-form-group">
            <label htmlFor="confirmPassword">Confirmar Password *</label>
            <input
              type={showPassword ? 'text' : 'password'}
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Digite novamente"
              className={errors.confirmPassword ? 'input-error' : ''}
            />
            {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
          </div>

          <div className="register-form-group">
            <label>Papéis no Sistema *</label>
            <div className="roles-checkboxes">
              {['ADMIN', 'DIRECTOR', 'TREASURER', 'AUDITOR', 'OBREIRO', 'VIEWER'].map(role => (
                <div key={role} className="checkbox-item">
                  <input
                    type="checkbox"
                    id={role}
                    name="roles"
                    value={role}
                    checked={formData.roles.includes(role)}
                    onChange={handleChange}
                  />
                  <label htmlFor={role}>
                    {role === 'ADMIN' ? 'Administrador' :
                     role === 'DIRECTOR' ? 'Director Financeiro' :
                     role === 'TREASURER' ? 'Tesoureiro' :
                     role === 'AUDITOR' ? 'Auditor' :
                     role === 'OBREIRO' ? 'Obreiro' :
                     'Visualizador'}
                  </label>
                </div>
              ))}
            </div>
            {errors.roles && <span className="error-text">{errors.roles}</span>}
          </div>

          <button type="submit" className="register-button" disabled={isLoading}>
            {isLoading ? 'Registando...' : 'Registar Usuário'}
          </button>
        </form>

        <p className="register-back-link">
          <button type="button" onClick={() => navigate('/')} className="back-button">
            Voltar ao Dashboard
          </button>
        </p>
      </div>
    </div>
  );
}
