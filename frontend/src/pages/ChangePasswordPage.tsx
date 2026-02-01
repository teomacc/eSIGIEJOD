import React, { useState } from 'react';
import { api } from '@/api/client';
import '@/styles/ChangePasswordPage.css';

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [passwordStrength, setPasswordStrength] = useState<string>('');

  const validatePasswordStrength = (password: string): string => {
    if (password.length === 0) return '';
    if (password.length < 8) return 'fraca';

    let strength = 0;
    // Check for length
    if (password.length >= 12) strength++;
    // Check for lowercase
    if (/[a-z]/.test(password)) strength++;
    // Check for uppercase
    if (/[A-Z]/.test(password)) strength++;
    // Check for numbers
    if (/[0-9]/.test(password)) strength++;
    // Check for special characters
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    if (strength <= 2) return 'fraca';
    if (strength <= 3) return 'média';
    return 'forte';
  };

  const handleNewPasswordChange = (value: string) => {
    setNewPassword(value);
    setPasswordStrength(validatePasswordStrength(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!currentPassword || !newPassword) {
      setError('Preencha todos os campos obrigatórios');
      return;
    }

    if (newPassword.length < 8) {
      setError('A nova senha deve ter pelo menos 8 caracteres');
      return;
    }

    // Password strength validation
    if (!/[a-z]/.test(newPassword)) {
      setError('A senha deve conter pelo menos uma letra minúscula');
      return;
    }

    if (!/[A-Z]/.test(newPassword)) {
      setError('A senha deve conter pelo menos uma letra maiúscula');
      return;
    }

    if (!/[0-9]/.test(newPassword)) {
      setError('A senha deve conter pelo menos um número');
      return;
    }

    if (!/[^a-zA-Z0-9]/.test(newPassword)) {
      setError('A senha deve conter pelo menos um caractere especial (@, #, $, etc.)');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    setLoading(true);
    try {
      await api.auth.changePassword({ currentPassword, newPassword });
      setSuccess('Senha alterada com sucesso');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordStrength('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao alterar senha');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="change-password-page">
      <header className="change-password-header">
        <h1>Alterar Senha</h1>
        <p>Atualize a sua senha de acesso</p>
      </header>

      <div className="change-password-card">
        <form onSubmit={handleSubmit} className="change-password-form">
          <div className="form-group">
            <label>Senha atual</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Senha atual"
            />
          </div>

          <div className="form-group">
            <label>Nova senha</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => handleNewPasswordChange(e.target.value)}
              placeholder="Nova senha"
            />
            {passwordStrength && (
              <div className={`password-strength strength-${passwordStrength}`}>
                Força da senha: <strong>{passwordStrength}</strong>
              </div>
            )}
            <div className="password-requirements">
              <p className="requirements-title">A senha deve conter:</p>
              <ul>
                <li className={newPassword.length >= 8 ? 'valid' : ''}>Pelo menos 8 caracteres</li>
                <li className={/[a-z]/.test(newPassword) ? 'valid' : ''}>Uma letra minúscula</li>
                <li className={/[A-Z]/.test(newPassword) ? 'valid' : ''}>Uma letra maiúscula</li>
                <li className={/[0-9]/.test(newPassword) ? 'valid' : ''}>Um número</li>
                <li className={/[^a-zA-Z0-9]/.test(newPassword) ? 'valid' : ''}>Um caractere especial (@, #, $, etc.)</li>
              </ul>
            </div>
          </div>

          <div className="form-group">
            <label>Confirmar nova senha</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirmar nova senha"
            />
          </div>

          {error && <div className="change-password-alert error">{error}</div>}
          {success && <div className="change-password-alert success">{success}</div>}

          <div className="change-password-actions">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'A guardar...' : 'Atualizar Senha'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
