# Visualizacao interativa: Diagrama Sankey do fluxo de concessao de credito

## 1. Introducao a proposta

### Por que um Sankey?

O modelo de otimizacao de limites pre-aprovados do Banco Pan precisa comunicar de forma clara o que acontece com 14,5 milhoes de correntistas ao longo do pipeline de concessao. Tabelas e equacoes descrevem bem o processo para quem esta dentro da modelagem, mas dificultam a compreensao para stakeholders que precisam entender o impacto real de cada decisao, como o time de politicas de credito.

O diagrama de Sankey resolve esse problema porque a largura de cada fluxo e proporcional ao volume de clientes. Isso torna imediatamente visivel quantas pessoas passam em cada etapa, quantas sao filtradas, e como o volume se distribui entre perfis de risco, sem precisar interpretar numeros em uma planilha.

### Estrutura do diagrama

O diagrama tem 4 colunas que representam as etapas do pipeline:

| Coluna | Etapa | O que representa |
|:---|:---|:---|
| 0 | Base total | 14,5M correntistas do Banco Pan |
| 1 | Elegibilidade | Separacao entre elegiveis e nao elegiveis |
| 2 | Clusters | Agrupamento dos elegiveis por perfil de risco |
| 3 | Limite otimizado | Limite atribuido a cada cluster ou "Sem oferta" |

### Prototipo vs. aplicacao real

Neste prototipo, o usuario pode ajustar dois parametros manualmente atraves de sliders: a porcentagem de clientes elegiveis e a quantidade de clusters. Isso serve para explorar cenarios e entender como esses parametros afetam o fluxo.

Numa aplicacao real, esses valores nao seriam editaveis pelo usuario. A porcentagem de elegiveis seria definida automaticamente pelos filtros cadastrais do banco (`flag_filtros`), e a quantidade e composicao dos clusters seria decidida pelo modelo de clusterizacao baseado no `score_credito_cross`. O Sankey funcionaria como um painel de visualizacao do resultado do modelo, mostrando a quantidade de clientes em cada etapa e o volume financeiro alocado por cluster.

Se houvesse algo personalizavel numa versao em producao, seriam as variaveis que o time de politicas de credito pode ajustar: por exemplo, o budget total disponivel para concessao, a taxa minima de retorno aceitavel por cluster, ou o percentual maximo de inadimplencia tolerado. Esses parametros alimentariam o modelo de otimizacao, e o Sankey atualizaria automaticamente para refletir o novo cenario de alocacao.

### Conceitos de p5.js utilizados

O projeto foi construido usando tres conceitos ensinados em aula:

**POO (Programacao Orientada a Objetos):** o codigo usa tres classes. `SankeyNode` representa os nos do diagrama (as barras), `SankeyLink` representa os fluxos entre nos (as curvas), e `Slider` representa os controles interativos. Cada classe tem seus proprios metodos `display()` e `contains()`.

**Transformacoes (push, pop, translate):** todo metodo `display()` segue o padrao de salvar o estado com `push()`, mover a origem com `translate(x, y)`, desenhar na posicao (0, 0) e restaurar com `pop()`. Isso isola cada transformacao para nao afetar os demais elementos do canvas.

**Interatividade com mouse:** os sliders sao feitos inteiramente em p5.js, sem elementos HTML. Usam `mousePressed()`, `mouseDragged()` e `mouseReleased()` para detectar o arrasto da bolinha. A deteccao de hover usa verificacao de area retangular com `contains()`, e o cursor muda dinamicamente entre `HAND` e `ARROW`.

### Controles interativos

O usuario pode ajustar dois parametros em tempo real arrastando sliders na parte inferior do canvas:

| Controle | Faixa | Efeito |
|:---|:---|:---|
| Clusters | 1 a 10 | Altera a quantidade de grupos de risco |
| Elegiveis (%) | 1% a 100% | Ajusta a proporcao de clientes que passam no filtro de elegibilidade |

Os dados do diagrama se recalculam instantaneamente ao arrastar, com uma animacao suave de transicao.

## 2. Rascunhos iniciais

### 2.1 Rascunho no Paint

Antes de comecar a codar, fiz um rascunho no Paint para ter uma ideia da estrutura visual:

![Rascunho inicial do Sankey feito no Paint](sankeypaint.jpg)

O rascunho mostra a ideia central do diagrama. A barra da esquerda ("14 milhoes de clientes") se divide em dois fluxos: os "elegiveis", que se ramificam em clusters e depois convergem para quem "receberam limite" (com "x milhoes alocados"), e os "nao elegiveis", representados pelo fluxo vermelho descendente. A anotacao "coisas clicaveis" ja indicava desde o inicio a intencao de tornar os elementos interativos. A estrutura de 4 colunas (base, elegibilidade, clusters, limite) que aparece no resultado final foi definida neste rascunho.

### 2.2 Evolucao do conceito

A partir do rascunho, algumas decisoes de design foram tomadas durante a implementacao:

1. **Fluxos curvos em vez de retos:** no rascunho as conexoes sao linhas retas. Na implementacao, foram usadas curvas bezier para melhorar a leitura visual e evitar sobreposicao entre fluxos adjacentes.
2. **Proporcao visual:** a altura de cada no e proporcional ao numero de clientes, o que torna a escala visivel sem precisar ler os numeros.
3. **Tema claro:** o fundo cinza claro foi escolhido para dar mais legibilidade e contraste com as barras coloridas.
4. **Sliders em p5:** a anotacao "coisas clicaveis" do rascunho evoluiu para sliders arrastaveis que permitem explorar cenarios diferentes em tempo real.

## 3. Registro do resultado obtido

### 3.1 Como executar

Abrir o arquivo `index.html` em qualquer navegador. Nao precisa de servidor local, funciona direto pelo protocolo `file://`. A unica dependencia externa e o p5.js, que e carregado via CDN.

**Arquivos do projeto:**
- `index.html` : pagina HTML que carrega o p5.js e o sketch
- `sketch.js` : codigo completo do diagrama (classes, layout, animacao, interatividade)
- `sankeypaint.jpg` : rascunho inicial feito no Paint

### 3.2 Interatividade

- **Hover nos nos:** as barras ficam mais opacas e todos os fluxos conectados se destacam junto, com tooltip mostrando nome e valor
- **Hover nos fluxos:** ao passar o mouse sobre uma curva, ela se destaca junto com os nos de origem e destino
- **Sliders arrastaveis:** permitem ajustar o numero de clusters (1 a 10) e a porcentagem de elegiveis (1% a 100%)
- **Animacao de transicao:** ao mexer nos sliders, os nos e fluxos animam suavemente para as novas posicoes usando `lerp()`
- **Cursor dinamico:** muda para `HAND` ao passar sobre elementos interativos

### 3.3 O que o diagrama comunica

**A escala da filtragem.** Com o valor padrao de 13%, apenas 1,8M dos 14,5M sao elegiveis. O fluxo cinza "Nao Elegiveis" domina visualmente a primeira transicao, o que evidencia que a maior parte da base e excluida antes mesmo do modelo atuar.

**A distribuicao por risco.** Os clusters recebem volumes proporcionais ao seu peso. Ao ajustar o numero de clusters, o usuario consegue ver como a granularidade afeta a forma como os elegiveis sao divididos.

**O impacto dos parametros.** Ao mover os sliders, fica claro como a porcentagem de elegiveis e o numero de clusters alteram completamente o perfil de concessao. Isso torna o modelo tangivel e exploravel, mesmo para quem nao tem contato direto com a modelagem matematica.
