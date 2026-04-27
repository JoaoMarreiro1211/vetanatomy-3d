# VetAnatomy Web

Aplicacao web em Next.js para gestao hospitalar veterinaria com prontuario digital e visualizacao anatomica 3D.

## Experiencia incluida

- Home profissional com chamada direta para dashboard e pacientes.
- Login e cadastro com feedback de erro e redirecionamento.
- Dashboard com indicadores operacionais, fila recente e pre-visualizacao 3D.
- Cadastro, busca e listagem de pacientes.
- Prontuario do paciente com resumo, anatomia 3D clicavel, historico de anotacoes, area DICOM e planejamento cirurgico.

## Rodar localmente

```bash
pnpm install
pnpm dev
```

Por padrao o frontend usa `http://localhost:8000/api/v1`. Para trocar:

```bash
NEXT_PUBLIC_API_BASE=http://localhost:8000/api/v1 pnpm dev
```
