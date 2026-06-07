# Política de Versionamento (Git) para Agentes de IA

1. **PROIBIDO COMMITAR AUTOMATICAMENTE:** O agente de IA (Antigravity/Assistente) está expressamente proibido de executar o comando `git commit` por conta própria, sob qualquer circunstância.
2. **APROVAÇÃO HUMANA OBRIGATÓRIA:** Todo o código modificado deve ser revisado pelo usuário (desenvolvedor humano). O agente deve apenas preparar o terreno, escrever o código e sugerir as mensagens de commit. O comando final deve ser dado pelo humano.
3. **MONITORAMENTO DE STATUS:** É responsabilidade do agente rodar `git status` com frequência.
4. **ALERTA DE ACÚMULO:** Se houver um grande volume de arquivos modificados e não commitados (ex: mais de 3 arquivos com mudanças significativas), o agente deve parar proativamente o desenvolvimento de novas _features_ e avisar o usuário: _"Temos muitas alterações não salvas no Source Control. Por favor, revise e commite antes de prosseguirmos."_
