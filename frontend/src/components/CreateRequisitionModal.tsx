import React, { useEffect, useState } from 'react';
import { api } from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import '@/styles/CreateRequisitionModal.css';

interface Fund {
  id: string;
  type: string;
  balance?: number;
  description?: string;
}

interface CreateRequisitionModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CATEGORIES: Array<{ value: string; label: string }> = [
  { value: 'ALIMENTACAO', label: 'Alimentação' },
  { value: 'TRANSPORTE', label: 'Transporte' },
  { value: 'HOSPEDAGEM', label: 'Hospedagem' },
  { value: 'MATERIAL_ESCRITORIO', label: 'Material de Escritório' },
  { value: 'MATERIAL_LITURGICO', label: 'Material Litúrgico' },
  { value: 'EQUIPAMENTOS', label: 'Equipamentos' },
  { value: 'MANUTENCAO', label: 'Manutenção' },
  { value: 'APOIO_SOCIAL', label: 'Apoio Social' },
  { value: 'ORGANIZACAO_EVENTOS', label: 'Organização de Eventos' },
  { value: 'FORMACAO_SEMINARIOS', label: 'Formação/Seminários' },
  { value: 'SAUDE_EMERGENCIA', label: 'Saúde/Emergência' },
  { value: 'PROJECTOS_MISSIONARIOS', label: 'Projetos Missionários' },
  { value: 'COMUNICACAO', label: 'Comunicação' },
  { value: 'ENERGIA_AGUA', label: 'Energia/Água' },
  { value: 'COMBUSTIVEL', label: 'Combustível' },
  { value: 'OUTROS', label: 'Outros' },
];

export default function CreateRequisitionModal({
  onClose,
  onSuccess,
}: CreateRequisitionModalProps) {
  const { hasRole } = useAuth();
  const hideBalance = hasRole('OBREIRO');
  const [funds, setFunds] = useState<Fund[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fundId: '',
    categoria: CATEGORIES[0].value,
    valor: '',
    motivo: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadFunds();
  }, []);

  const loadFunds = async () => {
    try {
      const response = await api.finances.listFunds();
      setFunds(response.data || []);
      if (response.data?.length > 0) {
        setForm((prev) => ({ ...prev, fundId: response.data[0].id }));
      }
    } catch (error) {
      console.error('Erro ao carregar fundos:', error);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!form.fundId) {
      newErrors.fundId = 'Selecione um fundo';
    }

    if (!form.valor || parseFloat(form.valor) <= 0) {
      newErrors.valor = 'Valor deve ser maior que zero';
    }

    if (!form.motivo.trim()) {
      newErrors.motivo = 'Motivo é obrigatório';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await api.requisitions.create({
        fundId: form.fundId,
        categoria: form.categoria,
        valor: parseFloat(form.valor),
        motivo: form.motivo,
      });

      alert('Requisição criada com sucesso!');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Erro ao criar requisição:', error);
      alert(
        error.response?.data?.message ||
          'Erro ao criar requisição. Tente novamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Nova Requisição</h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="requisition-form">
          <div className="form-group">
            <label htmlFor="fundId">
              Fundo <span className="required">*</span>
            </label>
            <select
              id="fundId"
              value={form.fundId}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, fundId: e.target.value }))
              }
              className={errors.fundId ? 'error' : ''}
            >
              <option value="">Selecione um fundo</option>
              {funds.map((fund) => (
                <option key={fund.id} value={fund.id}>
                  {fund.type.replace('FUNDO_', '').replace(/_/g, ' ')}
                  {!hideBalance && typeof fund.balance !== 'undefined'
                    ? ` — Saldo: ${Number(fund.balance).toLocaleString('pt-MZ')} MTn`
                    : ''}
                </option>
              ))}
            </select>
            {errors.fundId && (
              <span className="error-message">{errors.fundId}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="categoria">
              Categoria <span className="required">*</span>
            </label>
            <select
              id="categoria"
              value={form.categoria}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, categoria: e.target.value }))
              }
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="valor">
              Valor (MTn) <span className="required">*</span>
            </label>
            <input
              type="number"
              id="valor"
              min="0"
              step="0.01"
              value={form.valor}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, valor: e.target.value }))
              }
              placeholder="0.00"
              className={errors.valor ? 'error' : ''}
            />
            {errors.valor && (
              <span className="error-message">{errors.valor}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="motivo">
              Motivo/Justificação <span className="required">*</span>
            </label>
            <textarea
              id="motivo"
              rows={4}
              value={form.motivo}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, motivo: e.target.value }))
              }
              placeholder="Descreva o motivo da requisição..."
              className={errors.motivo ? 'error' : ''}
            />
            {errors.motivo && (
              <span className="error-message">{errors.motivo}</span>
            )}
          </div>

          <div className="modal-actions">
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
              {loading ? 'A criar...' : 'Criar Requisição'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
