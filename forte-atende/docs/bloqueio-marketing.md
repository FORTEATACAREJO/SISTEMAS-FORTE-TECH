# FORTE ATENDE — bloqueio de marketing e spam

Status: regra solicitada; backend e interface ainda não implementados nem homologados.

## Ações do operador
- Salvar contato, descartar contato ou bloquear número.
- Bloquear exige confirmação e motivo (marketing, spam, golpe, outro), registrando usuário, data e empresa.
- Bloqueio é reversível por usuário autorizado; manter trilha de auditoria.
- Números bloqueados não aparecem na caixa principal nem geram alertas comerciais, mas mensagens recebidas permanecem preservadas na caixa de bloqueados.
- Não apagar histórico, não descadastrar clientes existentes, não bloquear automaticamente por classificação de IA.
- Não confundir filtro interno com bloqueio no WhatsApp/Meta. Nenhuma alteração no provedor sem API suportada e autorização específica.

## Backend e testes necessários
- Lista de bloqueios persistente, segregada por empresa, com número E.164 normalizado, razão, criador, timestamps e desbloqueio.
- Aplicar filtro no servidor em listagem, busca e contadores; evitar vazamento entre empresas e garantir que mensagens futuras ainda sejam armazenadas.
- Testar bloqueio, recebimento posterior, desbloqueio, concorrência, permissões e reinício de sessão.
- Nenhum envio de mensagens ou alteração em credenciais é permitido por esta especificação.
