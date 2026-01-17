import React, { useEffect, useState } from 'react';
import { api } from '@/api/client';
import { formatFundType } from '@/utils/formatters';
import '@/styles/ApproveRequisitionModal.css';

interface Fund {
  id: string;
  type: string;
  balance: number;
  description?: string;
}

interface ApproveRequisitionModalProps {
  requisitionId: string;
  requestedAmount: number;
  originalFundId?: string;
  isLevel2?: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ApproveRequisitionModal({
  requisitionId,
  requestedAmount,
  originalFundId,
  isLevel2 = false,
  onClose,
  onSuccess,
}: ApproveRequisitionModalProps) {
  const [approvedAmount, setApprovedAmount] = useState<string>(requestedAmount.toString());
  const [fundId, setFundId] = useState<string>(originalFundId || '');
  const [observacoes, setObservacoes] = useState<string>('');
  const [funds, setFunds] = useState<Fund[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingFunds, setLoadingFunds] = useState(true);

  useEffect(() => {
    const loadFunds = async () => {
      try {
        const response = await api.finances.listFunds();
        const fundsList = response.data || [];
        setFunds(fundsList);
        if (fundsList.length > 0 && !originalFundId) {
          setFundId(fundsList[0].id);
        }
      } catch (error) {
        console.error('Erro ao carregar fundos:', error);
      } finally {
        setLoadingFunds(false);
      }
    };
    loadFunds();
  }, [originalFundId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fundId) {
      alert('Por favor, selecione um fundo');
      return;
    }

    const amount = Number(approvedAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Valor aprovado inválido');
      return;
    }

    if (amount > requestedAmount) {
      const confirm = window.confirm(
        `Valor aprovado (${amount}) é maior que o solicitado (${requestedAmount}). Deseja continuar?`
      );
      if (!confirm) return;
    }

    setLoading(true);
    try {
      const payload = {
        approvedAmount: amount,
        fundId,
        observacoes: observacoes.trim() || undefined,
      };

      if (isLevel2) {
        await api.requisitions.approveLevel2(requisitionId, payload.approvedAmount);
      } else {
        await api.requisitions.approve(requisitionId, payload.approvedAmount);
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Erro ao aprovar:', error);
      alert(error?.response?.data?.message || 'Erro ao aprovar requisição');
    } finally {
      setLoading(false);
    }
  };

  const selectedFund = funds.find((f) => f.id === fundId);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isLevel2 ? 'Aprovação Nível 2' : 'Aprovar Requisição'}</h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-section">
            <div className="form-group">
              <label htmlFor="requestedAmount">Valor Solicitado</label>
              <input
                id="requestedAmount"
                type="text"
                value={requestedAmount.toLocaleString('pt-MZ', {
                  style: 'currency',
                  currency: 'MZN',
                })}
                disabled
                className="input-disabled"
              />
            </div>

            <div className="form-group">
              <label htmlFor="approvedAmount">
                Valor Aprovado <span className="required">*</span>
              </label>
              <input
                id="approvedAmount"
                type="number"
                step="0.01"
                min="0"
                value={approvedAmount}
                onChange={(e) => setApprovedAmount(e.target.value)}
                required
                placeholder="Valor a aprovar"
              />
              <small className="form-hint">
                Deixe igual ao solicitado ou ajuste conforme necessário
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="fundId">
                Fundo de Origem <span className="required">*</span>
              </label>
              {loadingFunds ? (
                <div className="loading-small">Carregando fundos...</div>
              ) : (
                <select
                  id="fundId"
                  value={fundId}
                  onChange={(e) => setFundId(e.target.value)}
                  required
                >
                  <option value="">Selecione o fundo</option>
                  {funds.map((fund) => (
                    <option key={fund.id} value={fund.id}>
                      {formatFundType(fund.type)} - Saldo: {Number(fund.balance).toLocaleString('pt-MZ')} MT
                    </option>
                  ))}
                </select>
              )}
              {selectedFund && (
                <small className="form-hint balance-info">
                  Saldo disponível: {Number(selectedFund.balance).toLocaleString('pt-MZ')} MT
                  {Number(approvedAmount) > selectedFund.balance && (
                    <span className="text-warning"> - Insuficiente!</span>
                  )}
                </small>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="observacoes">Observações</label>
              <textarea
                id="observacoes"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Adicione observações sobre esta aprovação (opcional)"
                rows={3}
              />
              <small className="form-hint">
                Ex: "Aprovado parcialmente devido a saldo limitado" ou "Fundo alterado conforme disponibilidade"
              </small>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={loading || loadingFunds}>
              {loading ? 'Aprovando...' : isLevel2 ? 'Aprovar Nível 2' : 'Aprovar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
