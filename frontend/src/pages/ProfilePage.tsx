import React, { useEffect, useState } from 'react';
import { api } from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import '@/styles/ProfilePage.css';

type ProfileForm = {
  nomeCompleto: string;
  email: string;
  username: string;
  telefone: string;
  cidade: string;
};

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState<ProfileForm>({
    nomeCompleto: '',
    email: '',
    username: '',
    telefone: '',
    cidade: '',
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.auth.getProfile();
        const data = response.data || {};
        setForm({
          nomeCompleto: data.nomeCompleto || user?.nomeCompleto || '',
          email: data.email || user?.email || '',
          username: data.username || user?.username || '',
          telefone: data.telefone || user?.telefone || '',
          cidade: data.cidade || user?.cidade || '',
        });
      } catch (err: any) {
        setError(err.response?.data?.message || 'Erro ao carregar perfil');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user?.email, user?.nomeCompleto, user?.username, user?.telefone, user?.cidade]);

  const handleChange = (field: keyof ProfileForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await api.auth.updateProfile({
        nomeCompleto: form.nomeCompleto,
        email: form.email,
        username: form.username,
        telefone: form.telefone,
        cidade: form.cidade,
      });
      updateUser(response.data || {});
      setSuccess('Perfil atualizado com sucesso');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao atualizar perfil');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-page">
      <header className="profile-header">
        <h1>Perfil</h1>
        <p>Atualize as suas informações pessoais</p>
      </header>

      <div className="profile-card">
        {loading ? (
          <p>A carregar...</p>
        ) : (
          <form onSubmit={handleSubmit} className="profile-form">
            <div className="profile-grid">
              <div className="form-group">
                <label>Nome Completo</label>
                <input
                  type="text"
                  value={form.nomeCompleto}
                  onChange={(e) => handleChange('nomeCompleto', e.target.value)}
                  placeholder="Nome completo"
                />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="email@dominio.com"
                />
              </div>

              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => handleChange('username', e.target.value)}
                  placeholder="utilizador"
                />
              </div>

              <div className="form-group">
                <label>Telefone</label>
                <input
                  type="text"
                  value={form.telefone}
                  onChange={(e) => handleChange('telefone', e.target.value)}
                  placeholder="+258 84 000 0000"
                />
              </div>

              <div className="form-group">
                <label>Cidade</label>
                <input
                  type="text"
                  value={form.cidade}
                  onChange={(e) => handleChange('cidade', e.target.value)}
                  placeholder="Cidade"
                />
              </div>
            </div>

            {error && <div className="profile-alert error">{error}</div>}
            {success && <div className="profile-alert success">{success}</div>}

            <div className="profile-actions">
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'A guardar...' : 'Guardar Alterações'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
