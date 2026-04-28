# Funcionalidades do VetAnatomy 3D

## Acesso e Seguranca

- Tela de login como primeira tela do sistema.
- Bloqueio de rotas internas antes do login.
- Sessao com access token e refresh token em cookie seguro.
- Logout com limpeza da sessao local.
- Administrador padrao para demonstracao:
  - Email: `admin@vetanatomy.local`
  - Senha: `adminpass`

## Administracao

- Tela administrativa em `/admin/users`.
- Listagem de usuarios.
- Cadastro de usuarios da equipe.
- Cadastro de administradores.
- Edicao rapida de nome, email e senha temporaria.
- Ativacao e desativacao de usuarios.
- Alternancia de permissao administradora.
- Protecao da API de usuarios para superusuarios.

## Pacientes

- Cadastro de pacientes multiespecie.
- Busca por nome ou numero de prontuario.
- Filtro por grupo de especies.
- Edicao rapida de nome, prontuario e peso.
- Arquivamento de pacientes sem destruir historico clinico.
- Prontuario individual com resumo operacional.
- Exportacao do prontuario por impressao/Salvar como PDF.

## Prontuario Premium

- Timeline clinica por paciente.
- Registro SOAP:
  - Subjetivo
  - Objetivo
  - Avaliacao
  - Plano
- Sinais vitais estruturados:
  - Temperatura
  - Frequencia cardiaca
  - Frequencia respiratoria
  - Escore de dor
- Evolucoes demonstrativas criadas automaticamente no seed.

## Multiespecie

- Grupos clinicos:
  - Pequenos animais
  - Equinos
  - Bovinos
  - Suinos
  - Pequenos ruminantes
  - Aves
  - Exoticos
- Especies seedadas para apresentacao, incluindo cao, gato, equino, bovino, coelho, ave, caprino e reptil.
- Templates anatomicos por grupo, com forma corporal adaptada.

## Ambiente Anatomico 3D

- Motor anatomico interativo em 3D no navegador.
- Clique direto no modelo para selecionar ponto anatomico.
- Atalhos de regiao para cabeca, torax, abdomen e membros.
- Marcador visual para novo ponto selecionado.
- Marcadores de anotacoes existentes.
- Cores por severidade:
  - Leve
  - Moderada
  - Grave
- Rotacao automatica com controle de pausa.
- Vistas clinicas padronizadas: lateral, dorsal, ventral e cranial.
- Alternancia entre camadas: completo, pele, musculos, osseo, orgaos e vasos.
- Foco por regiao anatomica para reduzir ruido visual.
- Orgaos internos esquematicos para comunicacao clinica.
- Camada ossea esquematica com coluna, costelas, cranio e membros.
- Rotulos anatomicos com opcao de mostrar/ocultar.
- Modo Raio-X com transparencia seletiva.
- Exploded view para separar camadas anatomicas.
- Corte 3D em tempo real por eixo X, Y ou Z.
- Simulacao fisiologica visual com batimento cardiaco, respiracao e fluxo vascular.
- Presets de qualidade Eco, Clinico e Ultra para rodar em computadores e celulares diferentes.
- Orbit controls para rotacionar e aproximar.

## Anotacoes Clinicas

- Registro de achado anatomico por ponto 3D.
- Tipo de achado.
- Severidade.
- Notas clinicas.
- Historico anatomico por paciente.

## Exames e Imagem

- Cadastro de estudo diagnostico.
- Cadastro de serie.
- Upload de imagem diagnostica ou DICOM.
- Armazenamento persistente do arquivo no PostgreSQL gratuito.
- Visualizacao de PNG, JPEG e WebP.
- Tentativa de renderizacao DICOM quando o arquivo e realmente DICOM.
- Deteccao de tipo de arquivo por `Content-Type`.
- Registro de achados de imagem.

## Planejamento

- Plano cirurgico ou conduta clinica por paciente.
- Estrutura anatomica relacionada.
- Objetivo.
- Nivel de risco.
- Passos de conduta.

## Dashboard

- Total de pacientes cadastrados.
- Total com biometria/peso.
- Status do modulo anatomico.
- Pendencias clinicas para hoje.
- Fila clinica recente.
- Lista de retornos, vacinas, exames e tarefas vencidas.
- Pre-visualizacao anatomica 3D.

## Lembretes e Standard of Care

- Lembretes por paciente.
- Tipos de pendencia:
  - Retorno clinico
  - Vacina
  - Revisao de exame
  - Conferencia de medicacao
- Prioridade normal ou alta.
- Data de vencimento.
- Conclusao de pendencia pelo prontuario.
- Dashboard operacional com pendencias do dia.
- Seed automatico de lembretes para casos demonstrativos.
- Protocolos sugeridos por grupo de especie no prontuario.
- Acoes rapidas para transformar protocolo em tarefa acompanhavel.

## Dados de Demonstracao

O seed cria automaticamente pacientes de apresentacao:

- `APRES-001` Thor, cao
- `APRES-002` Maya, gato
- `APRES-003` Estrela, equino
- `APRES-004` Bela, bovino
- `APRES-005` Nina, coelho
- `APRES-006` Kiwi, ave
- `APRES-007` Lola, caprino
- `APRES-008` Yoshi, reptil

Cada caso possui cadastro, anotacoes 3D, exame, achado, plano e pendencias clinicas.

## Infraestrutura Gratuita

- Web publicada na Vercel.
- API publicada no Render.
- PostgreSQL gratuito no Render.
- Arquivos de exame salvos no banco para evitar perda no disco efemero do plano gratuito.

## Melhorias Recomendadas para Proximas Versoes

- Agenda com calendario semanal.
- Internacao com leitos e evolucao diaria.
- Auditoria visivel por usuario.
- Permissoes granulares por perfil.
- Reset de senha disparado pelo administrador.
- Relatorio PDF nativo no servidor.
- Upload de DICOM com metadados extraidos automaticamente.
- Comparacao temporal de exames.
- Notificacoes de retorno e vacinas.
- Campos customizaveis por especie.
