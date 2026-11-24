# FORTE ATENDE — salvar ou descartar contatos

Status: regra aprovada; implementação de backend, interface e homologação pendentes.

## Origem
Contatos de conversas WhatsApp não vinculadas a clientes do FORTE OP aparecem em fila de conferência. O recebimento e o histórico independem de cadastro.

## Salvar contato
- Exibir nome e telefone; solicitar confirmação do operador.
- Antes de criar, consultar o FORTE OP por telefone normalizado (com DDI) e por dados identificadores disponíveis.
- Se houver cadastro existente, oferecer vinculação em vez de duplicação.
- Se não houver, cadastrar contato no repositório operacional compartilhado, com auditoria de autor e horário, sem inventar CPF/CNPJ.
- Preservar identificador externo e histórico integral da conversa.

## Descartar contato
- Exigir confirmação e registrar autor, data e motivo opcional.
- Marcar como descartado na fila de conferência, sem apagar mensagens nem bloquear o recebimento futuro.
- Permitir reabrir a conferência e salvar depois.
- Nova mensagem pode reabrir o item para análise, sem criar cadastro automaticamente.

## Segurança e testes
- Isolar por empresa e perfil autorizado; backend valida vínculo e permissões.
- Ações idempotentes e resistentes a concorrência; não permitir cadastros duplicados.
- Testar salvar, vincular, descartar, recuperar, reiniciar sessão, troca de usuário e chegada de nova mensagem.
- Nenhum envio de WhatsApp ou e-mail é autorizado por esta funcionalidade.
