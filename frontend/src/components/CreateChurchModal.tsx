import React, { useState } from 'react';
import { api } from '@/api/client';
import '@/styles/Modal.css';

interface CreateChurchModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateChurchModal({ onClose, onSuccess }: CreateChurchModalProps) {
  const [formData, setFormData] = useState({
    nome: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome.trim()) {
      setError('Nome da igreja é obrigatório');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await api.churches.create(formData);
      onSuccess();
    } catch (err: any) {
      const message = err.response?.data?.message;
      if (message?.includes('código') && message?.includes('já existe')) {
        setError(message); // Mostrar mensagem detalhada do backend
      } else if (message?.includes('já existe')) {
        setError('❌ Já existe uma igreja com este código. Por favor, use um nome diferente.');
      } else {
        setError(message || 'Erro ao criar igreja');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🏛️ Nova Igreja</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="alert alert-error">
                ❌ {error}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="nome">Nome da Igreja *</label>
              <input
                type="text"
                id="nome"
                name="nome"
                value={formData.nome}
                onChange={handleChange}
                placeholder="Ex: IEJOD Djuba, IEJOD Sede, IEJOD Singathela"
                required
                maxLength={200}
                autoFocus
              />
              <small>Máximo 200 caracteres</small>
            </div>

            <div className="info-box">
              <p>
                ℹ️ <strong>Código gerado automaticamente</strong> no padrão <strong>IEJOD-SUFIXO</strong> 
                (ex: IEJOD Djuba → IEJOD-DJUBA).
              </p>
              <p className="info-box-secondary">
                Após criar a igreja, você poderá atribuir o Pastor Local e o Líder Financeiro Local.
              </p>
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Criando...' : '✅ Criar Igreja'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
