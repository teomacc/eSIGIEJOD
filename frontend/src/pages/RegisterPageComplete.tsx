/**
 * PÁGINA DE REGISTO COMPLETA
 * 
 * Formulário completo para registar novo membro/obreiro
 * Organizado em 4 tabs: Identificação, Ministerial, Contactos, Sistema
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
  liderDireto: string;
  ativoNoMinisterio: boolean;
  
  // Contactos
  telefone: string;
  email: string;
  endereco: string;
  cidade: string;
  provincia: string;
  
  // Sistema
  username: string;
  password: string;
  confirmPassword: string;
  roles: string[];
  departamento: string;
}

export default function RegisterPageComplete() {
  const navigate = useNavigate();
  const { user, isLoading, error: authError, register, hasRole } = useAuth();
  
  const [currentTab, setCurrentTab] = useState<'identificacao' | 'ministerial' | 'contactos' | 'sistema'>('identificacao');
  
  const [formData, setFormData] = useState<FormData>({
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
    liderDireto: '',
    ativoNoMinisterio: true,
    
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
    departamento: '',
  });

  const [errors, setErrors] = useState<any>({});
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Verificar permissão
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
      const target = e.target as HTMLInputElement;
      if (name === 'roles') {
        setFormData(prev => ({
          ...prev,
          roles: target.checked 
            ? [...prev.roles, value]
            : prev.roles.filter(r => r !== value)
        }));
      } else if (name === 'ativoNoMinisterio') {
        setFormData(prev => ({ ...prev, ativoNoMinisterio: target.checked }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: any = {};

    // Validações básicas
    if (!formData.nomeCompleto) newErrors.nomeCompleto = 'Nome completo é obrigatório';
    if (!formData.email) newErrors.email = 'Email é obrigatório';
    if (!formData.password) newErrors.password = 'Password é obrigatória';
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords não correspondem';
    }
    if (formData.password.length < 8) {
      newErrors.password = 'Password deve ter pelo menos 8 caracteres';
    }
    if (formData.roles.length === 0) {
      newErrors.roles = 'Selecione pelo menos um papel';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      await register({
        // Identificação
        nomeCompleto: formData.nomeCompleto,
        apelido: formData.apelido,
        sexo: formData.sexo,
        dataNascimento: formData.dataNascimento,
        estadoCivil: formData.estadoCivil,
        nacionalidade: formData.nacionalidade,
        documentoIdentidade: formData.documentoIdentidade,
        
        // Ministerial
        funcaoMinisterial: formData.funcaoMinisterial,
        ministerio: formData.ministerio,
        dataConversao: formData.dataConversao,
        dataBatismo: formData.dataBatismo,
        igrejaLocal: formData.igrejaLocal,
        liderDireto: formData.liderDireto || user.id,
        ativoNoMinisterio: formData.ativoNoMinisterio,
        
        // Contactos
        email: formData.email,
        telefone: formData.telefone,
        endereco: formData.endereco,
        cidade: formData.cidade,
        provincia: formData.provincia,
        
        // Sistema
        username: formData.username || formData.email.split('@')[0],
        password: formData.password,
        churchId: user.churchId,
        roles: formData.roles,
        departamento: formData.departamento,
      });

      setSuccessMessage(`Usuário ${formData.nomeCompleto} registado com sucesso!`);
      setTimeout(() => navigate('/'), 2000);
    } catch (err: any) {
      setErrors({ submit: err.message || 'Erro ao registar usuário' });
    }
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <h1>Registar Novo Membro/Obreiro</h1>

        {/* Tabs */}
        <div className="register-tabs">
          <button
            type="button"
            className={currentTab === 'identificacao' ? 'active' : ''}
            onClick={() => setCurrentTab('identificacao')}
          >
            1. Identificação
          </button>
          <button
            type="button"
            className={currentTab === 'ministerial' ? 'active' : ''}
            onClick={() => setCurrentTab('ministerial')}
          >
            2. Ministerial
          </button>
          <button
            type="button"
            className={currentTab === 'contactos' ? 'active' : ''}
            onClick={() => setCurrentTab('contactos')}
          >
            3. Contactos
          </button>
          <button
            type="button"
            className={currentTab === 'sistema' ? 'active' : ''}
            onClick={() => setCurrentTab('sistema')}
          >
            4. Sistema
          </button>
        </div>

        {/* Mensagens */}
        {errors.submit && <div className="register-error-message">{errors.submit}</div>}
        {successMessage && <div className="register-success-message">{successMessage}</div>}

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="register-form">
          
          {/* TAB 1: IDENTIFICAÇÃO */}
          {currentTab === 'identificacao' && (
            <div className="register-tab-content">
              <div className="register-form-row">
                <div className="register-form-group">
                  <label htmlFor="nomeCompleto">Nome Completo *</label>
                  <input
                    type="text"
                    id="nomeCompleto"
                    name="nomeCompleto"
                    value={formData.nomeCompleto}
                    onChange={handleChange}
                    placeholder="João António Silva"
                    className={errors.nomeCompleto ? 'input-error' : ''}
                  />
                  {errors.nomeCompleto && <span className="error-text">{errors.nomeCompleto}</span>}
                </div>

                <div className="register-form-group">
                  <label htmlFor="apelido">Apelido</label>
                  <input
                    type="text"
                    id="apelido"
                    name="apelido"
                    value={formData.apelido}
                    onChange={handleChange}
                    placeholder="Silva"
                  />
                </div>
              </div>

              <div className="register-form-row">
                <div className="register-form-group">
                  <label htmlFor="sexo">Sexo</label>
                  <select
                    id="sexo"
                    name="sexo"
                    value={formData.sexo}
                    onChange={handleChange}
                  >
                    <option value="">Selecione...</option>
                    <option value="MASCULINO">Masculino</option>
                    <option value="FEMININO">Feminino</option>
                  </select>
                </div>

                <div className="register-form-group">
                  <label htmlFor="dataNascimento">Data de Nascimento</label>
                  <input
                    type="date"
                    id="dataNascimento"
                    name="dataNascimento"
                    value={formData.dataNascimento}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="register-form-row">
                <div className="register-form-group">
                  <label htmlFor="estadoCivil">Estado Civil</label>
                  <select
                    id="estadoCivil"
                    name="estadoCivil"
                    value={formData.estadoCivil}
                    onChange={handleChange}
                  >
                    <option value="">Selecione...</option>
                    <option value="SOLTEIRO">Solteiro(a)</option>
                    <option value="CASADO">Casado(a)</option>
                    <option value="VIUVO">Viúvo(a)</option>
                    <option value="DIVORCIADO">Divorciado(a)</option>
                  </select>
                </div>

                <div className="register-form-group">
                  <label htmlFor="nacionalidade">Nacionalidade</label>
                  <input
                    type="text"
                    id="nacionalidade"
                    name="nacionalidade"
                    value={formData.nacionalidade}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="register-form-group">
                <label htmlFor="documentoIdentidade">Documento de Identidade (BI/DIRE)</label>
                <input
                  type="text"
                  id="documentoIdentidade"
                  name="documentoIdentidade"
                  value={formData.documentoIdentidade}
                  onChange={handleChange}
                  placeholder="110100123456A"
                />
              </div>
            </div>
          )}

          {/* TAB 2: MINISTERIAL */}
          {currentTab === 'ministerial' && (
            <div className="register-tab-content">
              <div className="register-form-row">
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
                  <label htmlFor="ministerio">Ministério</label>
                  <input
                    type="text"
                    id="ministerio"
                    name="ministerio"
                    value={formData.ministerio}
                    onChange={handleChange}
                    placeholder="Ex: Louvor, Jovens, Intercessão"
                  />
                </div>
              </div>

              <div className="register-form-row">
                <div className="register-form-group">
                  <label htmlFor="dataConversao">Data de Conversão</label>
                  <input
                    type="date"
                    id="dataConversao"
                    name="dataConversao"
                    value={formData.dataConversao}
                    onChange={handleChange}
                  />
                </div>

                <div className="register-form-group">
                  <label htmlFor="dataBatismo">Data de Batismo</label>
                  <input
                    type="date"
                    id="dataBatismo"
                    name="dataBatismo"
                    value={formData.dataBatismo}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="register-form-group">
                <label htmlFor="igrejaLocal">Igreja Local</label>
                <input
                  type="text"
                  id="igrejaLocal"
                  name="igrejaLocal"
                  value={formData.igrejaLocal}
                  onChange={handleChange}
                  placeholder="Ex: Igreja Central de Maputo"
                />
              </div>

              <div className="register-form-group">
                <label htmlFor="departamento">Departamento</label>
                <select
                  id="departamento"
                  name="departamento"
                  value={formData.departamento}
                  onChange={handleChange}
                >
                  <option value="">Selecione...</option>
                  <option value="Evangelismo">Evangelismo</option>
                  <option value="Missões">Missões</option>
                  <option value="Ensino">Ensino</option>
                  <option value="Louvor e Adoração">Louvor e Adoração</option>
                  <option value="Intercessão">Intercessão</option>
                  <option value="Ministério de Jovens">Ministério de Jovens</option>
                  <option value="Ministério Infantil">Ministério Infantil</option>
                  <option value="Ministério de Mulheres">Ministério de Mulheres</option>
                  <option value="Ministério de Homens">Ministério de Homens</option>
                  <option value="Ministério de Casais">Ministério de Casais</option>
                  <option value="Mídia e Comunicação">Mídia e Comunicação</option>
                  <option value="Recepção e Hospitalidade">Recepção e Hospitalidade</option>
                  <option value="Administração">Administração</option>
                  <option value="Finanças">Finanças</option>
                  <option value="Diaconia">Diaconia</option>
                  <option value="Aconselhamento">Aconselhamento</option>
                </select>
              </div>

              <div className="register-form-group">
                <label>
                  <input
                    type="checkbox"
                    name="ativoNoMinisterio"
                    checked={formData.ativoNoMinisterio}
                    onChange={handleChange}
                  />
                  {' '}Activo no Ministério (se inactivo, não poderá fazer requisições)
                </label>
              </div>
            </div>
          )}

          {/* TAB 3: CONTACTOS */}
          {currentTab === 'contactos' && (
            <div className="register-tab-content">
              <div className="register-form-group">
                <label htmlFor="email">Email *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="joao.silva@email.com"
                  className={errors.email ? 'input-error' : ''}
                  required
                />
                {errors.email && <span className="error-text">{errors.email}</span>}
              </div>

              <div className="register-form-group">
                <label htmlFor="telefone">Telefone</label>
                <input
                  type="tel"
                  id="telefone"
                  name="telefone"
                  value={formData.telefone}
                  onChange={handleChange}
                  placeholder="+258 84 123 4567"
                />
              </div>

              <div className="register-form-group">
                <label htmlFor="endereco">Endereço</label>
                <input
                  type="text"
                  id="endereco"
                  name="endereco"
                  value={formData.endereco}
                  onChange={handleChange}
                  placeholder="Av. Julius Nyerere, nº 123"
                />
              </div>

              <div className="register-form-row">
                <div className="register-form-group">
                  <label htmlFor="cidade">Cidade</label>
                  <input
                    type="text"
                    id="cidade"
                    name="cidade"
                    value={formData.cidade}
                    onChange={handleChange}
                    placeholder="Maputo"
                  />
                </div>

                <div className="register-form-group">
                  <label htmlFor="provincia">Província</label>
                  <select
                    id="provincia"
                    name="provincia"
                    value={formData.provincia}
                    onChange={handleChange}
                  >
                    <option value="">Selecione...</option>
                    <option value="Maputo Cidade">Maputo Cidade</option>
                    <option value="Maputo Província">Maputo Província</option>
                    <option value="Gaza">Gaza</option>
                    <option value="Inhambane">Inhambane</option>
                    <option value="Sofala">Sofala</option>
                    <option value="Manica">Manica</option>
                    <option value="Tete">Tete</option>
                    <option value="Zambézia">Zambézia</option>
                    <option value="Nampula">Nampula</option>
                    <option value="Cabo Delgado">Cabo Delgado</option>
                    <option value="Niassa">Niassa</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SISTEMA */}
          {currentTab === 'sistema' && (
            <div className="register-tab-content">
              <div className="register-form-group">
                <label htmlFor="username">Username (opcional - será gerado do email)</label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="joao.silva"
                />
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
              </div>

              <div className="register-form-group">
                <label htmlFor="confirmPassword">Confirmar Password *</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Digite a password novamente"
                  className={errors.confirmPassword ? 'input-error' : ''}
                />
                {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
              </div>

              <div className="register-form-group">
                <label>Papéis do Usuário *</label>
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
                      />
                      <label htmlFor={role}>
                        {role === 'DIRECTOR' ? 'Director Financeiro' :
                         role === 'TREASURER' ? 'Tesoureiro' :
                         role === 'AUDITOR' ? 'Auditor' :
                         'Visualizador'}
                      </label>
                    </div>
                  ))}
                </div>
                {errors.roles && <span className="error-text">{errors.roles}</span>}
              </div>
            </div>
          )}

          {/* Botões de Navegação */}
          <div className="register-form-navigation">
            {currentTab !== 'identificacao' && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  const tabs: Array<'identificacao' | 'ministerial' | 'contactos' | 'sistema'> = 
                    ['identificacao', 'ministerial', 'contactos', 'sistema'];
                  const currentIndex = tabs.indexOf(currentTab);
                  setCurrentTab(tabs[currentIndex - 1]);
                }}
              >
                ← Anterior
              </button>
            )}

            {currentTab !== 'sistema' ? (
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  const tabs: Array<'identificacao' | 'ministerial' | 'contactos' | 'sistema'> = 
                    ['identificacao', 'ministerial', 'contactos', 'sistema'];
                  const currentIndex = tabs.indexOf(currentTab);
                  setCurrentTab(tabs[currentIndex + 1]);
                }}
              >
                Próximo →
              </button>
            ) : (
              <button
                type="submit"
                className="register-button"
                disabled={isLoading}
              >
                {isLoading ? 'Registando...' : 'Registar Usuário'}
              </button>
            )}
          </div>
        </form>

        <p className="register-back-link">
          <button type="button" onClick={() => navigate('/')} className="back-button">
            ← Voltar ao Dashboard
          </button>
        </p>
      </div>
    </div>
  );
}
