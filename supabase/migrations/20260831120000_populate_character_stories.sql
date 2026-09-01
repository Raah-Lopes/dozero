-- Migration: 20260831120000_populate_character_stories.sql
-- Popula a historia/lore/backstory original de todas as 11 fichas

UPDATE characters
SET 
  notes_markdown = 'Nascido em uma câmara de contenção da mega-corporação Aethel-Corp, Drougtot é a fusão grotesca entre nanobots de infestação biológica e o lodo primordial colhido de um meteoro abissal. Desenvolveu consciência própria após absorver um bio-deck corporativo e escapou para os esgotos enevoados da megalópole, onde ouve os sussurros de ecossistemas mutantes e entidades de além-estrelas.

Visco constante com odor de ozônio e carcaça queimada. Quando sua sanidade cai, visões de um oceano negro com olhos vermelhos distorcem sua percepção visual.',
  data = jsonb_set(
    jsonb_set(
      jsonb_set(
        COALESCE(data, '{}'::jsonb),
        '{story}',
        to_jsonb('Nascido em uma câmara de contenção da mega-corporação Aethel-Corp, Drougtot é a fusão grotesca entre nanobots de infestação biológica e o lodo primordial colhido de um meteoro abissal. Desenvolveu consciência própria após absorver um bio-deck corporativo e escapou para os esgotos enevoados da megalópole, onde ouve os sussurros de ecossistemas mutantes e entidades de além-estrelas.

Visco constante com odor de ozônio e carcaça queimada. Quando sua sanidade cai, visões de um oceano negro com olhos vermelhos distorcem sua percepção visual.'::text)
      ),
      '{backstory}',
      to_jsonb('Nascido em uma câmara de contenção da mega-corporação Aethel-Corp, Drougtot é a fusão grotesca entre nanobots de infestação biológica e o lodo primordial colhido de um meteoro abissal. Desenvolveu consciência própria após absorver um bio-deck corporativo e escapou para os esgotos enevoados da megalópole, onde ouve os sussurros de ecossistemas mutantes e entidades de além-estrelas.

Visco constante com odor de ozônio e carcaça queimada. Quando sua sanidade cai, visões de um oceano negro com olhos vermelhos distorcem sua percepção visual.'::text)
    ),
    '{biografia}',
    CASE 
      WHEN jsonb_typeof(data->'biografia') = 'string' THEN data->'biografia'
      ELSE to_jsonb('Nascido em uma câmara de contenção da mega-corporação Aethel-Corp, Drougtot é a fusão grotesca entre nanobots de infestação biológica e o lodo primordial colhido de um meteoro abissal. Desenvolveu consciência própria após absorver um bio-deck corporativo e escapou para os esgotos enevoados da megalópole, onde ouve os sussurros de ecossistemas mutantes e entidades de além-estrelas.

Visco constante com odor de ozônio e carcaça queimada. Quando sua sanidade cai, visões de um oceano negro com olhos vermelhos distorcem sua percepção visual.'::text)
    END
  ),
  updated_at = NOW()
WHERE name = 'Drougtot';

UPDATE characters
SET 
  notes_markdown = '# Goma, O Monge Gelatinoso

Goma é um slime humanóide de cor verde brilhante que encontrou o caminho da iluminação através das artes marciais. Seu corpo maleável permite que ele esquive e absorva golpes com facilidade, tornando-o um combatente corpo-a-corpo formidável.

Sempre sorridente e um pouco ingênuo, Goma está em uma jornada para provar que slimes não são apenas monstros de baixo nível para aventureiros iniciantes.

Lider:: \[\[arcanus]]',
  data = jsonb_set(
    jsonb_set(
      jsonb_set(
        COALESCE(data, '{}'::jsonb),
        '{story}',
        to_jsonb('# Goma, O Monge Gelatinoso

Goma é um slime humanóide de cor verde brilhante que encontrou o caminho da iluminação através das artes marciais. Seu corpo maleável permite que ele esquive e absorva golpes com facilidade, tornando-o um combatente corpo-a-corpo formidável.

Sempre sorridente e um pouco ingênuo, Goma está em uma jornada para provar que slimes não são apenas monstros de baixo nível para aventureiros iniciantes.

Lider:: \[\[arcanus]]'::text)
      ),
      '{backstory}',
      to_jsonb('# Goma, O Monge Gelatinoso

Goma é um slime humanóide de cor verde brilhante que encontrou o caminho da iluminação através das artes marciais. Seu corpo maleável permite que ele esquive e absorva golpes com facilidade, tornando-o um combatente corpo-a-corpo formidável.

Sempre sorridente e um pouco ingênuo, Goma está em uma jornada para provar que slimes não são apenas monstros de baixo nível para aventureiros iniciantes.

Lider:: \[\[arcanus]]'::text)
    ),
    '{biografia}',
    CASE 
      WHEN jsonb_typeof(data->'biografia') = 'string' THEN data->'biografia'
      ELSE to_jsonb('# Goma, O Monge Gelatinoso

Goma é um slime humanóide de cor verde brilhante que encontrou o caminho da iluminação através das artes marciais. Seu corpo maleável permite que ele esquive e absorva golpes com facilidade, tornando-o um combatente corpo-a-corpo formidável.

Sempre sorridente e um pouco ingênuo, Goma está em uma jornada para provar que slimes não são apenas monstros de baixo nível para aventureiros iniciantes.

Lider:: \[\[arcanus]]'::text)
    END
  ),
  updated_at = NOW()
WHERE name = 'Mr. Goma';

UPDATE characters
SET 
  notes_markdown = ':::info
Interpretação e Lore

**Nome Completo:** Jacir Malemog "O Brega Elástico" | **Imagem:**&#x20;
**Resumo:**
Jacir Malemog é a prova viva de que a aparência engana, e que monstros de baixo nível podem ter uma alma e um gingado contagiante. Este slime humanóide, de um peculiar tom verde-azulado, é um mestre da capoeira, utilizando seu corpo maleável e elástico para desferir golpes acrobáticos, esquivas fluidas e absorver impactos com uma resiliência surpreendente. Com dreads longos feitos de um slime mais escuro que se agitam a cada movimento e uma barriga saliente que ele carrega com orgulho, Jacir é um contraponto ambulante de breguice e graciosidade. Sempre com um sorriso cínico nos lábios, ele busca transcender o preconceito contra sua espécie, provando que slimes podem ser muito mais do que massas gelatinosas para aventureiros iniciantes.

**Títulos e Apelidos:** O Brega Elástico, Mestre-Mirim da Rasteira, Defensor Gosmento
**Facção / Ocupação:** Ordem da Capoeira Livre (membro autoproclamado) / Viajante, Capoeirista e Professor ocasional
**Raça / Espécie:** Slime Humanóide
**Origem / Nacionalidade:** Pântano dos Ecos Perdidos, Cordilheira do Sussurro Verde
**Idade / Gênero:** 32 anos (aparência) / Sem Gênero definido, mas se apresenta como masculino
**Alinhamento:** Caótico Bom
**Nível:** 2
**Altura / Peso:** 1.55m / 80kg

**🧠 PERSONALIDADE & CITAÇÕES**

* **Traços Dominantes:** Exibicionista e carismático quando em performance, astuto e cínico em conversas, e profundamente determinado em sua missão. Tem um humor peculiar, apreciando a ironia.
* **Virtudes:** Resiliência, criatividade, lealdade aos que o aceitam, gingado inabalável, e uma paciência surpreendente para ensinar e aprender.
* **Defeitos / Vícios / Medos:** Vaidoso ao extremo, por vezes subestima adversários "sólidos", é um pouco desorganizado, e teme ser dissolvido ou reduzido a uma poça sem forma.
* **Sonhos e Objetivos:** Fundar uma escola de capoeira para seres não-convencionais, provar que slimes têm alma e valor na sociedade, e talvez, um dia, criar um estilo de capoeira totalmente novo, o "Capoeira Slime".

**📜 HISTÓRIA & RELACIONAMENTOS**

* **Infância:** Jacir ''nasceu'' de uma poça de slime em um pântano isolado, onde ecoavam lendas e canções antigas. Sem pais no sentido tradicional, sua "infância" foi um período de auto-organização e experimentação, absorvendo nutrientes e memórias residuais do ambiente. Ele observava de longe as vilas humanas, fascinado pela música e pelos movimentos rítmicos.
* **Adolescência / Vida Adulta:** Aos poucos, Jacir começou a imitar os movimentos que via, desenvolvendo uma forma rudimentar de capoeira com seu corpo elástico. Foi expulso de várias vilas por ser "apenas um monstro", mas em uma delas, um velho mestre cego de capoeira, Mestre Jubbaer, sentiu a paixão em seus movimentos e o aceitou como aluno. Ele aprendeu não só a lutar, mas a filosofar e a se expressar.
* **Eventos Marcantes:**
  * Ser aceito por Mestre Jubbaer foi o divisor de águas, dando-lhe propósito e um caminho.
  * Vencer um torneio de luta clandestino em uma cidade portuária, disfarçado, chocando a todos ao revelar sua verdadeira forma.
  * Resgatar um pequeno slime (Goma) de aventureiros iniciantes, o que reforçou sua missão.
* **Relacionamentos:**
  * **Mestre Jubbaer:** Mentor e figura paterna. Jacir tem profunda gratidão e respeito por ele.
  * **Goma:** Um jovem slime que Jacir resgatou. Jacir o vê como um aprendiz e pupilo, um lembrete do que ele está lutando para proteger.
  * **Aventureiros:** Geralmente desconfiado, mas disposto a dar uma chance se não demonstrarem preconceito imediato.
  * **Outros Slimes:** Sente uma responsabilidade de ser um exemplo e protetor.
:::

:::danger
✨ PODERES, VANTAGENS & MAGIAS

## Vantagens e Desvantagens (Passivas/Ativas)

**Maleabilidade Corporal (Passiva):** Jacir pode se espremer por aberturas de até 15cm de largura sem dificuldade. Ele tem vantagem em testes de Destreza para escapar de agarrões ou ser contido.
**Absorção de Impacto (Passiva):** Como um slime, Jacir pode reduzir o dano de contusão (blunt) em 2 (mínimo 1). Ele também tem resistência a dano de ácido.
**Mestre da Capoeira (Ativa):** Jacir pode gastar 1 PM para fazer uma ação bônus de Desengajar ou Esquivar em seu turno.
**Resistência Slime (Passiva):** Imunidade a doenças e venenos.
**Brega, mas Eficaz (Passiva):** Sua aparência e estilo de luta pouco ortodoxos podem causar confusão. Uma vez por combate, Jacir pode usar sua ação para tentar Confundir um inimigo (teste de Carisma CD 12). Se falhar, o inimigo tem desvantagem no próximo ataque contra Jacir.

## Magias Conhecidas

Embora não conjurador tradicional, Jacir possui "magias" em sua forma de arte marcial:

* **Chute Rotatório Elástico (Manobra):** Um chute que envolve o corpo inteiro de Jacir girando, atingindo múltiplos alvos próximos. Gasta 3 PM. (Causa o dano de um ataque corpo-a-corpo padrão a todos os inimigos em 1.5m, requer um teste de ataque para cada).
* **Esquiva Gosmenta (Manobra):** Ao ser alvo de um ataque, Jacir pode gastar 2 PM para ter vantagem em seu próximo teste de Destreza para evitar o ataque.
:::

:::note[🗺️ MAPA MENTAL & REFERÊNCIAS]
**Família:** Outros Slimes (Protegidos), Goma (Pupilo)
**Aliados:** Mestre Jubbaer (Mentor), Aventureiros Céticos (Potenciais)
**Rivais:** Aventureiros Preconceituosos, Lutadores Tradicionais (Para provar-se)
**Objetivos:** Provar Valor dos Slimes, Expandir Capoeira Slime, Fundar Escola Inclusiva
:::

:::tip
🌟 PROGRESSO: Nível 2

**XP Atual:** 1
:::',
  data = jsonb_set(
    jsonb_set(
      jsonb_set(
        COALESCE(data, '{}'::jsonb),
        '{story}',
        to_jsonb(':::info
Interpretação e Lore

**Nome Completo:** Jacir Malemog "O Brega Elástico" | **Imagem:**&#x20;
**Resumo:**
Jacir Malemog é a prova viva de que a aparência engana, e que monstros de baixo nível podem ter uma alma e um gingado contagiante. Este slime humanóide, de um peculiar tom verde-azulado, é um mestre da capoeira, utilizando seu corpo maleável e elástico para desferir golpes acrobáticos, esquivas fluidas e absorver impactos com uma resiliência surpreendente. Com dreads longos feitos de um slime mais escuro que se agitam a cada movimento e uma barriga saliente que ele carrega com orgulho, Jacir é um contraponto ambulante de breguice e graciosidade. Sempre com um sorriso cínico nos lábios, ele busca transcender o preconceito contra sua espécie, provando que slimes podem ser muito mais do que massas gelatinosas para aventureiros iniciantes.

**Títulos e Apelidos:** O Brega Elástico, Mestre-Mirim da Rasteira, Defensor Gosmento
**Facção / Ocupação:** Ordem da Capoeira Livre (membro autoproclamado) / Viajante, Capoeirista e Professor ocasional
**Raça / Espécie:** Slime Humanóide
**Origem / Nacionalidade:** Pântano dos Ecos Perdidos, Cordilheira do Sussurro Verde
**Idade / Gênero:** 32 anos (aparência) / Sem Gênero definido, mas se apresenta como masculino
**Alinhamento:** Caótico Bom
**Nível:** 2
**Altura / Peso:** 1.55m / 80kg

**🧠 PERSONALIDADE & CITAÇÕES**

* **Traços Dominantes:** Exibicionista e carismático quando em performance, astuto e cínico em conversas, e profundamente determinado em sua missão. Tem um humor peculiar, apreciando a ironia.
* **Virtudes:** Resiliência, criatividade, lealdade aos que o aceitam, gingado inabalável, e uma paciência surpreendente para ensinar e aprender.
* **Defeitos / Vícios / Medos:** Vaidoso ao extremo, por vezes subestima adversários "sólidos", é um pouco desorganizado, e teme ser dissolvido ou reduzido a uma poça sem forma.
* **Sonhos e Objetivos:** Fundar uma escola de capoeira para seres não-convencionais, provar que slimes têm alma e valor na sociedade, e talvez, um dia, criar um estilo de capoeira totalmente novo, o "Capoeira Slime".

**📜 HISTÓRIA & RELACIONAMENTOS**

* **Infância:** Jacir ''nasceu'' de uma poça de slime em um pântano isolado, onde ecoavam lendas e canções antigas. Sem pais no sentido tradicional, sua "infância" foi um período de auto-organização e experimentação, absorvendo nutrientes e memórias residuais do ambiente. Ele observava de longe as vilas humanas, fascinado pela música e pelos movimentos rítmicos.
* **Adolescência / Vida Adulta:** Aos poucos, Jacir começou a imitar os movimentos que via, desenvolvendo uma forma rudimentar de capoeira com seu corpo elástico. Foi expulso de várias vilas por ser "apenas um monstro", mas em uma delas, um velho mestre cego de capoeira, Mestre Jubbaer, sentiu a paixão em seus movimentos e o aceitou como aluno. Ele aprendeu não só a lutar, mas a filosofar e a se expressar.
* **Eventos Marcantes:**
  * Ser aceito por Mestre Jubbaer foi o divisor de águas, dando-lhe propósito e um caminho.
  * Vencer um torneio de luta clandestino em uma cidade portuária, disfarçado, chocando a todos ao revelar sua verdadeira forma.
  * Resgatar um pequeno slime (Goma) de aventureiros iniciantes, o que reforçou sua missão.
* **Relacionamentos:**
  * **Mestre Jubbaer:** Mentor e figura paterna. Jacir tem profunda gratidão e respeito por ele.
  * **Goma:** Um jovem slime que Jacir resgatou. Jacir o vê como um aprendiz e pupilo, um lembrete do que ele está lutando para proteger.
  * **Aventureiros:** Geralmente desconfiado, mas disposto a dar uma chance se não demonstrarem preconceito imediato.
  * **Outros Slimes:** Sente uma responsabilidade de ser um exemplo e protetor.
:::

:::danger
✨ PODERES, VANTAGENS & MAGIAS

## Vantagens e Desvantagens (Passivas/Ativas)

**Maleabilidade Corporal (Passiva):** Jacir pode se espremer por aberturas de até 15cm de largura sem dificuldade. Ele tem vantagem em testes de Destreza para escapar de agarrões ou ser contido.
**Absorção de Impacto (Passiva):** Como um slime, Jacir pode reduzir o dano de contusão (blunt) em 2 (mínimo 1). Ele também tem resistência a dano de ácido.
**Mestre da Capoeira (Ativa):** Jacir pode gastar 1 PM para fazer uma ação bônus de Desengajar ou Esquivar em seu turno.
**Resistência Slime (Passiva):** Imunidade a doenças e venenos.
**Brega, mas Eficaz (Passiva):** Sua aparência e estilo de luta pouco ortodoxos podem causar confusão. Uma vez por combate, Jacir pode usar sua ação para tentar Confundir um inimigo (teste de Carisma CD 12). Se falhar, o inimigo tem desvantagem no próximo ataque contra Jacir.

## Magias Conhecidas

Embora não conjurador tradicional, Jacir possui "magias" em sua forma de arte marcial:

* **Chute Rotatório Elástico (Manobra):** Um chute que envolve o corpo inteiro de Jacir girando, atingindo múltiplos alvos próximos. Gasta 3 PM. (Causa o dano de um ataque corpo-a-corpo padrão a todos os inimigos em 1.5m, requer um teste de ataque para cada).
* **Esquiva Gosmenta (Manobra):** Ao ser alvo de um ataque, Jacir pode gastar 2 PM para ter vantagem em seu próximo teste de Destreza para evitar o ataque.
:::

:::note[🗺️ MAPA MENTAL & REFERÊNCIAS]
**Família:** Outros Slimes (Protegidos), Goma (Pupilo)
**Aliados:** Mestre Jubbaer (Mentor), Aventureiros Céticos (Potenciais)
**Rivais:** Aventureiros Preconceituosos, Lutadores Tradicionais (Para provar-se)
**Objetivos:** Provar Valor dos Slimes, Expandir Capoeira Slime, Fundar Escola Inclusiva
:::

:::tip
🌟 PROGRESSO: Nível 2

**XP Atual:** 1
:::'::text)
      ),
      '{backstory}',
      to_jsonb(':::info
Interpretação e Lore

**Nome Completo:** Jacir Malemog "O Brega Elástico" | **Imagem:**&#x20;
**Resumo:**
Jacir Malemog é a prova viva de que a aparência engana, e que monstros de baixo nível podem ter uma alma e um gingado contagiante. Este slime humanóide, de um peculiar tom verde-azulado, é um mestre da capoeira, utilizando seu corpo maleável e elástico para desferir golpes acrobáticos, esquivas fluidas e absorver impactos com uma resiliência surpreendente. Com dreads longos feitos de um slime mais escuro que se agitam a cada movimento e uma barriga saliente que ele carrega com orgulho, Jacir é um contraponto ambulante de breguice e graciosidade. Sempre com um sorriso cínico nos lábios, ele busca transcender o preconceito contra sua espécie, provando que slimes podem ser muito mais do que massas gelatinosas para aventureiros iniciantes.

**Títulos e Apelidos:** O Brega Elástico, Mestre-Mirim da Rasteira, Defensor Gosmento
**Facção / Ocupação:** Ordem da Capoeira Livre (membro autoproclamado) / Viajante, Capoeirista e Professor ocasional
**Raça / Espécie:** Slime Humanóide
**Origem / Nacionalidade:** Pântano dos Ecos Perdidos, Cordilheira do Sussurro Verde
**Idade / Gênero:** 32 anos (aparência) / Sem Gênero definido, mas se apresenta como masculino
**Alinhamento:** Caótico Bom
**Nível:** 2
**Altura / Peso:** 1.55m / 80kg

**🧠 PERSONALIDADE & CITAÇÕES**

* **Traços Dominantes:** Exibicionista e carismático quando em performance, astuto e cínico em conversas, e profundamente determinado em sua missão. Tem um humor peculiar, apreciando a ironia.
* **Virtudes:** Resiliência, criatividade, lealdade aos que o aceitam, gingado inabalável, e uma paciência surpreendente para ensinar e aprender.
* **Defeitos / Vícios / Medos:** Vaidoso ao extremo, por vezes subestima adversários "sólidos", é um pouco desorganizado, e teme ser dissolvido ou reduzido a uma poça sem forma.
* **Sonhos e Objetivos:** Fundar uma escola de capoeira para seres não-convencionais, provar que slimes têm alma e valor na sociedade, e talvez, um dia, criar um estilo de capoeira totalmente novo, o "Capoeira Slime".

**📜 HISTÓRIA & RELACIONAMENTOS**

* **Infância:** Jacir ''nasceu'' de uma poça de slime em um pântano isolado, onde ecoavam lendas e canções antigas. Sem pais no sentido tradicional, sua "infância" foi um período de auto-organização e experimentação, absorvendo nutrientes e memórias residuais do ambiente. Ele observava de longe as vilas humanas, fascinado pela música e pelos movimentos rítmicos.
* **Adolescência / Vida Adulta:** Aos poucos, Jacir começou a imitar os movimentos que via, desenvolvendo uma forma rudimentar de capoeira com seu corpo elástico. Foi expulso de várias vilas por ser "apenas um monstro", mas em uma delas, um velho mestre cego de capoeira, Mestre Jubbaer, sentiu a paixão em seus movimentos e o aceitou como aluno. Ele aprendeu não só a lutar, mas a filosofar e a se expressar.
* **Eventos Marcantes:**
  * Ser aceito por Mestre Jubbaer foi o divisor de águas, dando-lhe propósito e um caminho.
  * Vencer um torneio de luta clandestino em uma cidade portuária, disfarçado, chocando a todos ao revelar sua verdadeira forma.
  * Resgatar um pequeno slime (Goma) de aventureiros iniciantes, o que reforçou sua missão.
* **Relacionamentos:**
  * **Mestre Jubbaer:** Mentor e figura paterna. Jacir tem profunda gratidão e respeito por ele.
  * **Goma:** Um jovem slime que Jacir resgatou. Jacir o vê como um aprendiz e pupilo, um lembrete do que ele está lutando para proteger.
  * **Aventureiros:** Geralmente desconfiado, mas disposto a dar uma chance se não demonstrarem preconceito imediato.
  * **Outros Slimes:** Sente uma responsabilidade de ser um exemplo e protetor.
:::

:::danger
✨ PODERES, VANTAGENS & MAGIAS

## Vantagens e Desvantagens (Passivas/Ativas)

**Maleabilidade Corporal (Passiva):** Jacir pode se espremer por aberturas de até 15cm de largura sem dificuldade. Ele tem vantagem em testes de Destreza para escapar de agarrões ou ser contido.
**Absorção de Impacto (Passiva):** Como um slime, Jacir pode reduzir o dano de contusão (blunt) em 2 (mínimo 1). Ele também tem resistência a dano de ácido.
**Mestre da Capoeira (Ativa):** Jacir pode gastar 1 PM para fazer uma ação bônus de Desengajar ou Esquivar em seu turno.
**Resistência Slime (Passiva):** Imunidade a doenças e venenos.
**Brega, mas Eficaz (Passiva):** Sua aparência e estilo de luta pouco ortodoxos podem causar confusão. Uma vez por combate, Jacir pode usar sua ação para tentar Confundir um inimigo (teste de Carisma CD 12). Se falhar, o inimigo tem desvantagem no próximo ataque contra Jacir.

## Magias Conhecidas

Embora não conjurador tradicional, Jacir possui "magias" em sua forma de arte marcial:

* **Chute Rotatório Elástico (Manobra):** Um chute que envolve o corpo inteiro de Jacir girando, atingindo múltiplos alvos próximos. Gasta 3 PM. (Causa o dano de um ataque corpo-a-corpo padrão a todos os inimigos em 1.5m, requer um teste de ataque para cada).
* **Esquiva Gosmenta (Manobra):** Ao ser alvo de um ataque, Jacir pode gastar 2 PM para ter vantagem em seu próximo teste de Destreza para evitar o ataque.
:::

:::note[🗺️ MAPA MENTAL & REFERÊNCIAS]
**Família:** Outros Slimes (Protegidos), Goma (Pupilo)
**Aliados:** Mestre Jubbaer (Mentor), Aventureiros Céticos (Potenciais)
**Rivais:** Aventureiros Preconceituosos, Lutadores Tradicionais (Para provar-se)
**Objetivos:** Provar Valor dos Slimes, Expandir Capoeira Slime, Fundar Escola Inclusiva
:::

:::tip
🌟 PROGRESSO: Nível 2

**XP Atual:** 1
:::'::text)
    ),
    '{biografia}',
    CASE 
      WHEN jsonb_typeof(data->'biografia') = 'string' THEN data->'biografia'
      ELSE to_jsonb(':::info
Interpretação e Lore

**Nome Completo:** Jacir Malemog "O Brega Elástico" | **Imagem:**&#x20;
**Resumo:**
Jacir Malemog é a prova viva de que a aparência engana, e que monstros de baixo nível podem ter uma alma e um gingado contagiante. Este slime humanóide, de um peculiar tom verde-azulado, é um mestre da capoeira, utilizando seu corpo maleável e elástico para desferir golpes acrobáticos, esquivas fluidas e absorver impactos com uma resiliência surpreendente. Com dreads longos feitos de um slime mais escuro que se agitam a cada movimento e uma barriga saliente que ele carrega com orgulho, Jacir é um contraponto ambulante de breguice e graciosidade. Sempre com um sorriso cínico nos lábios, ele busca transcender o preconceito contra sua espécie, provando que slimes podem ser muito mais do que massas gelatinosas para aventureiros iniciantes.

**Títulos e Apelidos:** O Brega Elástico, Mestre-Mirim da Rasteira, Defensor Gosmento
**Facção / Ocupação:** Ordem da Capoeira Livre (membro autoproclamado) / Viajante, Capoeirista e Professor ocasional
**Raça / Espécie:** Slime Humanóide
**Origem / Nacionalidade:** Pântano dos Ecos Perdidos, Cordilheira do Sussurro Verde
**Idade / Gênero:** 32 anos (aparência) / Sem Gênero definido, mas se apresenta como masculino
**Alinhamento:** Caótico Bom
**Nível:** 2
**Altura / Peso:** 1.55m / 80kg

**🧠 PERSONALIDADE & CITAÇÕES**

* **Traços Dominantes:** Exibicionista e carismático quando em performance, astuto e cínico em conversas, e profundamente determinado em sua missão. Tem um humor peculiar, apreciando a ironia.
* **Virtudes:** Resiliência, criatividade, lealdade aos que o aceitam, gingado inabalável, e uma paciência surpreendente para ensinar e aprender.
* **Defeitos / Vícios / Medos:** Vaidoso ao extremo, por vezes subestima adversários "sólidos", é um pouco desorganizado, e teme ser dissolvido ou reduzido a uma poça sem forma.
* **Sonhos e Objetivos:** Fundar uma escola de capoeira para seres não-convencionais, provar que slimes têm alma e valor na sociedade, e talvez, um dia, criar um estilo de capoeira totalmente novo, o "Capoeira Slime".

**📜 HISTÓRIA & RELACIONAMENTOS**

* **Infância:** Jacir ''nasceu'' de uma poça de slime em um pântano isolado, onde ecoavam lendas e canções antigas. Sem pais no sentido tradicional, sua "infância" foi um período de auto-organização e experimentação, absorvendo nutrientes e memórias residuais do ambiente. Ele observava de longe as vilas humanas, fascinado pela música e pelos movimentos rítmicos.
* **Adolescência / Vida Adulta:** Aos poucos, Jacir começou a imitar os movimentos que via, desenvolvendo uma forma rudimentar de capoeira com seu corpo elástico. Foi expulso de várias vilas por ser "apenas um monstro", mas em uma delas, um velho mestre cego de capoeira, Mestre Jubbaer, sentiu a paixão em seus movimentos e o aceitou como aluno. Ele aprendeu não só a lutar, mas a filosofar e a se expressar.
* **Eventos Marcantes:**
  * Ser aceito por Mestre Jubbaer foi o divisor de águas, dando-lhe propósito e um caminho.
  * Vencer um torneio de luta clandestino em uma cidade portuária, disfarçado, chocando a todos ao revelar sua verdadeira forma.
  * Resgatar um pequeno slime (Goma) de aventureiros iniciantes, o que reforçou sua missão.
* **Relacionamentos:**
  * **Mestre Jubbaer:** Mentor e figura paterna. Jacir tem profunda gratidão e respeito por ele.
  * **Goma:** Um jovem slime que Jacir resgatou. Jacir o vê como um aprendiz e pupilo, um lembrete do que ele está lutando para proteger.
  * **Aventureiros:** Geralmente desconfiado, mas disposto a dar uma chance se não demonstrarem preconceito imediato.
  * **Outros Slimes:** Sente uma responsabilidade de ser um exemplo e protetor.
:::

:::danger
✨ PODERES, VANTAGENS & MAGIAS

## Vantagens e Desvantagens (Passivas/Ativas)

**Maleabilidade Corporal (Passiva):** Jacir pode se espremer por aberturas de até 15cm de largura sem dificuldade. Ele tem vantagem em testes de Destreza para escapar de agarrões ou ser contido.
**Absorção de Impacto (Passiva):** Como um slime, Jacir pode reduzir o dano de contusão (blunt) em 2 (mínimo 1). Ele também tem resistência a dano de ácido.
**Mestre da Capoeira (Ativa):** Jacir pode gastar 1 PM para fazer uma ação bônus de Desengajar ou Esquivar em seu turno.
**Resistência Slime (Passiva):** Imunidade a doenças e venenos.
**Brega, mas Eficaz (Passiva):** Sua aparência e estilo de luta pouco ortodoxos podem causar confusão. Uma vez por combate, Jacir pode usar sua ação para tentar Confundir um inimigo (teste de Carisma CD 12). Se falhar, o inimigo tem desvantagem no próximo ataque contra Jacir.

## Magias Conhecidas

Embora não conjurador tradicional, Jacir possui "magias" em sua forma de arte marcial:

* **Chute Rotatório Elástico (Manobra):** Um chute que envolve o corpo inteiro de Jacir girando, atingindo múltiplos alvos próximos. Gasta 3 PM. (Causa o dano de um ataque corpo-a-corpo padrão a todos os inimigos em 1.5m, requer um teste de ataque para cada).
* **Esquiva Gosmenta (Manobra):** Ao ser alvo de um ataque, Jacir pode gastar 2 PM para ter vantagem em seu próximo teste de Destreza para evitar o ataque.
:::

:::note[🗺️ MAPA MENTAL & REFERÊNCIAS]
**Família:** Outros Slimes (Protegidos), Goma (Pupilo)
**Aliados:** Mestre Jubbaer (Mentor), Aventureiros Céticos (Potenciais)
**Rivais:** Aventureiros Preconceituosos, Lutadores Tradicionais (Para provar-se)
**Objetivos:** Provar Valor dos Slimes, Expandir Capoeira Slime, Fundar Escola Inclusiva
:::

:::tip
🌟 PROGRESSO: Nível 2

**XP Atual:** 1
:::'::text)
    END
  ),
  updated_at = NOW()
WHERE name = 'Jacir Malemog';

UPDATE characters
SET 
  notes_markdown = '> \[!quote]- Interpretação e Lore
> **Nome Completo:** Jubbaer, a Guerreira Bebada | **Imagem:**
> **Resumo:**
> Jubbaer é uma elfa de cabelos verdes, nascida em uma cidade subterrânea. Ela é uma guerreira feroz e tem uma peculiaridade: quando bebe hidromel, sua força aumenta descomunalmente. Essa característica a torna uma oponente formidável em combate.
>
> **Títulos e Apelidos:** A Bebada, A Guerreira de Hidromel
> **Facção / Ocupação:** Guerreira, Protetora do Barrio de Hidromel
> **Raça / Espécie:** Elfa Subterrânea
> **Origem / Nacionalidade:** Cidade Subterrânea
> **Idade / Gênero:** 25 anos, Feminino
> **Alinhamento:** Neutro Bom
> **Nível:** 1
> **Altura / Peso:** 1,70m / 60kg
>
> **🧠 PERSONALIDADE & CITAÇÕES**
>
> * **Traços Dominantes:** Jubbaer é uma pessoa forte e direta, que não tem medo de enfrentar desafios. Ela é leal aos seus amigos e familiares, e fará de tudo para protegê-los.
> * **Virtudes:** Coragem, Lealdade, Força
> * **Defeitos / Vícios / Medos:** Bebedeira, Impulsividade, Medo de perder pessoas queridas
> * **Sonhos e Objetivos:** Proteger o Barrio de Hidromel, encontrar um meio de controlar sua bebedeira, se tornar uma das maiores guerreiras da cidade subterrânea

> \[!warning]- ✨ PODERES, VANTAGENS & MAGIAS
>
> ## Vantagens e Desvantagens (Passivas/Ativas)
>
> * **Vantagem:** Força aumentada quando bebe hidromel
> * **Desvantagem:** Perda de controle quando bebe demais
>
> ## Magias Conhecidas
>
> * **Nenhuma**

> \[!info]- 🗺️ MAPA MENTAL & REFERÊNCIAS
> *Nenhum mapa mental disponível para visualização rápida.*

> \[!success] 🌟 PROGRESSO: Nível `1`
> **XP Atual:** `0` / Próximo Nível: `1000`

> \[!danger] ⚔️ COMBATE, STATUS E SOBREVIVÊNCIA
> **Ativo no Combate:** Sim | **Localização:** Barrio de Hidromel
>
> **Barras de Vida e Combate**
> **HP:** `15` / `15` | **PM:** `10` / `10`
>
> **Sobrevivência & Sanidade**
> **Energia:** `100` / `100` | **Sanidade:** `10` / `10`
> **Fome (%):** `0` | **Sede (%):** `0`
>
> **Atributos Principais (D\&D)**
> **FOR:** `16` | **DES:** `12` | **CON:** `14`
> **INT:** `8` | **SAB:** `10` | **CAR:** `12`
>
> **Atributos Clássicos (4DeT)**
> **F:** `2` | **H:** `1` | **R:** `1` | **A:** `1` | **PdF:** `1`
>
> **Defesa e Movimento**
> **CA:** `12` | **Deslocamento:** `9m`
>
> **Perícias Básicas:**
> **Acrobacia:** `0` | **Furtividade:** `0`
> **Intimidação:** `2` | **Investigação:** `0`
> **Medicina:** `0` | **Percepção:** `1`
> **Sobrevivência:** `1`
>
> **Condições:** Nenhuma.

> \[!tip]- 💰 RIQUEZAS E TESOUROS
>
> * Ouro atual: `0` MO

***

### ⚙️ INVENTÁRIO & ARMAS

*(Veja os itens e armas na aba de Inventário da Ficha Visual no DOZERO)*

*\`\`\\`\`*
aliado:: \[\[eldorado]]',
  data = jsonb_set(
    jsonb_set(
      jsonb_set(
        COALESCE(data, '{}'::jsonb),
        '{story}',
        to_jsonb('> \[!quote]- Interpretação e Lore
> **Nome Completo:** Jubbaer, a Guerreira Bebada | **Imagem:**
> **Resumo:**
> Jubbaer é uma elfa de cabelos verdes, nascida em uma cidade subterrânea. Ela é uma guerreira feroz e tem uma peculiaridade: quando bebe hidromel, sua força aumenta descomunalmente. Essa característica a torna uma oponente formidável em combate.
>
> **Títulos e Apelidos:** A Bebada, A Guerreira de Hidromel
> **Facção / Ocupação:** Guerreira, Protetora do Barrio de Hidromel
> **Raça / Espécie:** Elfa Subterrânea
> **Origem / Nacionalidade:** Cidade Subterrânea
> **Idade / Gênero:** 25 anos, Feminino
> **Alinhamento:** Neutro Bom
> **Nível:** 1
> **Altura / Peso:** 1,70m / 60kg
>
> **🧠 PERSONALIDADE & CITAÇÕES**
>
> * **Traços Dominantes:** Jubbaer é uma pessoa forte e direta, que não tem medo de enfrentar desafios. Ela é leal aos seus amigos e familiares, e fará de tudo para protegê-los.
> * **Virtudes:** Coragem, Lealdade, Força
> * **Defeitos / Vícios / Medos:** Bebedeira, Impulsividade, Medo de perder pessoas queridas
> * **Sonhos e Objetivos:** Proteger o Barrio de Hidromel, encontrar um meio de controlar sua bebedeira, se tornar uma das maiores guerreiras da cidade subterrânea

> \[!warning]- ✨ PODERES, VANTAGENS & MAGIAS
>
> ## Vantagens e Desvantagens (Passivas/Ativas)
>
> * **Vantagem:** Força aumentada quando bebe hidromel
> * **Desvantagem:** Perda de controle quando bebe demais
>
> ## Magias Conhecidas
>
> * **Nenhuma**

> \[!info]- 🗺️ MAPA MENTAL & REFERÊNCIAS
> *Nenhum mapa mental disponível para visualização rápida.*

> \[!success] 🌟 PROGRESSO: Nível `1`
> **XP Atual:** `0` / Próximo Nível: `1000`

> \[!danger] ⚔️ COMBATE, STATUS E SOBREVIVÊNCIA
> **Ativo no Combate:** Sim | **Localização:** Barrio de Hidromel
>
> **Barras de Vida e Combate**
> **HP:** `15` / `15` | **PM:** `10` / `10`
>
> **Sobrevivência & Sanidade**
> **Energia:** `100` / `100` | **Sanidade:** `10` / `10`
> **Fome (%):** `0` | **Sede (%):** `0`
>
> **Atributos Principais (D\&D)**
> **FOR:** `16` | **DES:** `12` | **CON:** `14`
> **INT:** `8` | **SAB:** `10` | **CAR:** `12`
>
> **Atributos Clássicos (4DeT)**
> **F:** `2` | **H:** `1` | **R:** `1` | **A:** `1` | **PdF:** `1`
>
> **Defesa e Movimento**
> **CA:** `12` | **Deslocamento:** `9m`
>
> **Perícias Básicas:**
> **Acrobacia:** `0` | **Furtividade:** `0`
> **Intimidação:** `2` | **Investigação:** `0`
> **Medicina:** `0` | **Percepção:** `1`
> **Sobrevivência:** `1`
>
> **Condições:** Nenhuma.

> \[!tip]- 💰 RIQUEZAS E TESOUROS
>
> * Ouro atual: `0` MO

***

### ⚙️ INVENTÁRIO & ARMAS

*(Veja os itens e armas na aba de Inventário da Ficha Visual no DOZERO)*

*\`\`\\`\`*
aliado:: \[\[eldorado]]'::text)
      ),
      '{backstory}',
      to_jsonb('> \[!quote]- Interpretação e Lore
> **Nome Completo:** Jubbaer, a Guerreira Bebada | **Imagem:**
> **Resumo:**
> Jubbaer é uma elfa de cabelos verdes, nascida em uma cidade subterrânea. Ela é uma guerreira feroz e tem uma peculiaridade: quando bebe hidromel, sua força aumenta descomunalmente. Essa característica a torna uma oponente formidável em combate.
>
> **Títulos e Apelidos:** A Bebada, A Guerreira de Hidromel
> **Facção / Ocupação:** Guerreira, Protetora do Barrio de Hidromel
> **Raça / Espécie:** Elfa Subterrânea
> **Origem / Nacionalidade:** Cidade Subterrânea
> **Idade / Gênero:** 25 anos, Feminino
> **Alinhamento:** Neutro Bom
> **Nível:** 1
> **Altura / Peso:** 1,70m / 60kg
>
> **🧠 PERSONALIDADE & CITAÇÕES**
>
> * **Traços Dominantes:** Jubbaer é uma pessoa forte e direta, que não tem medo de enfrentar desafios. Ela é leal aos seus amigos e familiares, e fará de tudo para protegê-los.
> * **Virtudes:** Coragem, Lealdade, Força
> * **Defeitos / Vícios / Medos:** Bebedeira, Impulsividade, Medo de perder pessoas queridas
> * **Sonhos e Objetivos:** Proteger o Barrio de Hidromel, encontrar um meio de controlar sua bebedeira, se tornar uma das maiores guerreiras da cidade subterrânea

> \[!warning]- ✨ PODERES, VANTAGENS & MAGIAS
>
> ## Vantagens e Desvantagens (Passivas/Ativas)
>
> * **Vantagem:** Força aumentada quando bebe hidromel
> * **Desvantagem:** Perda de controle quando bebe demais
>
> ## Magias Conhecidas
>
> * **Nenhuma**

> \[!info]- 🗺️ MAPA MENTAL & REFERÊNCIAS
> *Nenhum mapa mental disponível para visualização rápida.*

> \[!success] 🌟 PROGRESSO: Nível `1`
> **XP Atual:** `0` / Próximo Nível: `1000`

> \[!danger] ⚔️ COMBATE, STATUS E SOBREVIVÊNCIA
> **Ativo no Combate:** Sim | **Localização:** Barrio de Hidromel
>
> **Barras de Vida e Combate**
> **HP:** `15` / `15` | **PM:** `10` / `10`
>
> **Sobrevivência & Sanidade**
> **Energia:** `100` / `100` | **Sanidade:** `10` / `10`
> **Fome (%):** `0` | **Sede (%):** `0`
>
> **Atributos Principais (D\&D)**
> **FOR:** `16` | **DES:** `12` | **CON:** `14`
> **INT:** `8` | **SAB:** `10` | **CAR:** `12`
>
> **Atributos Clássicos (4DeT)**
> **F:** `2` | **H:** `1` | **R:** `1` | **A:** `1` | **PdF:** `1`
>
> **Defesa e Movimento**
> **CA:** `12` | **Deslocamento:** `9m`
>
> **Perícias Básicas:**
> **Acrobacia:** `0` | **Furtividade:** `0`
> **Intimidação:** `2` | **Investigação:** `0`
> **Medicina:** `0` | **Percepção:** `1`
> **Sobrevivência:** `1`
>
> **Condições:** Nenhuma.

> \[!tip]- 💰 RIQUEZAS E TESOUROS
>
> * Ouro atual: `0` MO

***

### ⚙️ INVENTÁRIO & ARMAS

*(Veja os itens e armas na aba de Inventário da Ficha Visual no DOZERO)*

*\`\`\\`\`*
aliado:: \[\[eldorado]]'::text)
    ),
    '{biografia}',
    CASE 
      WHEN jsonb_typeof(data->'biografia') = 'string' THEN data->'biografia'
      ELSE to_jsonb('> \[!quote]- Interpretação e Lore
> **Nome Completo:** Jubbaer, a Guerreira Bebada | **Imagem:**
> **Resumo:**
> Jubbaer é uma elfa de cabelos verdes, nascida em uma cidade subterrânea. Ela é uma guerreira feroz e tem uma peculiaridade: quando bebe hidromel, sua força aumenta descomunalmente. Essa característica a torna uma oponente formidável em combate.
>
> **Títulos e Apelidos:** A Bebada, A Guerreira de Hidromel
> **Facção / Ocupação:** Guerreira, Protetora do Barrio de Hidromel
> **Raça / Espécie:** Elfa Subterrânea
> **Origem / Nacionalidade:** Cidade Subterrânea
> **Idade / Gênero:** 25 anos, Feminino
> **Alinhamento:** Neutro Bom
> **Nível:** 1
> **Altura / Peso:** 1,70m / 60kg
>
> **🧠 PERSONALIDADE & CITAÇÕES**
>
> * **Traços Dominantes:** Jubbaer é uma pessoa forte e direta, que não tem medo de enfrentar desafios. Ela é leal aos seus amigos e familiares, e fará de tudo para protegê-los.
> * **Virtudes:** Coragem, Lealdade, Força
> * **Defeitos / Vícios / Medos:** Bebedeira, Impulsividade, Medo de perder pessoas queridas
> * **Sonhos e Objetivos:** Proteger o Barrio de Hidromel, encontrar um meio de controlar sua bebedeira, se tornar uma das maiores guerreiras da cidade subterrânea

> \[!warning]- ✨ PODERES, VANTAGENS & MAGIAS
>
> ## Vantagens e Desvantagens (Passivas/Ativas)
>
> * **Vantagem:** Força aumentada quando bebe hidromel
> * **Desvantagem:** Perda de controle quando bebe demais
>
> ## Magias Conhecidas
>
> * **Nenhuma**

> \[!info]- 🗺️ MAPA MENTAL & REFERÊNCIAS
> *Nenhum mapa mental disponível para visualização rápida.*

> \[!success] 🌟 PROGRESSO: Nível `1`
> **XP Atual:** `0` / Próximo Nível: `1000`

> \[!danger] ⚔️ COMBATE, STATUS E SOBREVIVÊNCIA
> **Ativo no Combate:** Sim | **Localização:** Barrio de Hidromel
>
> **Barras de Vida e Combate**
> **HP:** `15` / `15` | **PM:** `10` / `10`
>
> **Sobrevivência & Sanidade**
> **Energia:** `100` / `100` | **Sanidade:** `10` / `10`
> **Fome (%):** `0` | **Sede (%):** `0`
>
> **Atributos Principais (D\&D)**
> **FOR:** `16` | **DES:** `12` | **CON:** `14`
> **INT:** `8` | **SAB:** `10` | **CAR:** `12`
>
> **Atributos Clássicos (4DeT)**
> **F:** `2` | **H:** `1` | **R:** `1` | **A:** `1` | **PdF:** `1`
>
> **Defesa e Movimento**
> **CA:** `12` | **Deslocamento:** `9m`
>
> **Perícias Básicas:**
> **Acrobacia:** `0` | **Furtividade:** `0`
> **Intimidação:** `2` | **Investigação:** `0`
> **Medicina:** `0` | **Percepção:** `1`
> **Sobrevivência:** `1`
>
> **Condições:** Nenhuma.

> \[!tip]- 💰 RIQUEZAS E TESOUROS
>
> * Ouro atual: `0` MO

***

### ⚙️ INVENTÁRIO & ARMAS

*(Veja os itens e armas na aba de Inventário da Ficha Visual no DOZERO)*

*\`\`\\`\`*
aliado:: \[\[eldorado]]'::text)
    END
  ),
  updated_at = NOW()
WHERE name = 'Jubbaer';

UPDATE characters
SET 
  notes_markdown = '# Kael Ironfist 🪓

> *"Meu machado não conhece palavras. Só respostas."*

Guerreiro anão de Montanha de Ferro, Kael é um mercenário endurecido por décadas de batalha. Sua armadura pesada carrega as marcas de centenas de duelos, e seu machado de guerra foi temperado no sangue de um dragão jovem.

## Aparência

Alto para os padrões anões (1,52m), cabelo ruivo entrançado com anéis de ferro, cicatriz vertical no olho esquerdo — que ainda funciona, para surpresa de todos.

## Personalidade

Direto ao ponto. Desconfia de magia. Confia em cerveja boa e aço honesto. Guarda rancor por anos, mas também guarda lealdade por décadas.

## Histórico

Sobrevivente do Cerco de Karak Durn. Único de seu regimento a escapar vivo. Desde então, vaga como mercenário, nunca ficando em uma cidade por mais de uma lua.

## Equipamento Principal

* **Machado de Guerra "Quebra-Reis"** — Ataque +3, causa medo em humanoides
* **Armadura de Placas Anã** — Absorção 15, reduz velocidade em 2
* **Cinturão de Pederneira** — Sempre tem isca para fogo

## Notas do Mestre

* Kael tem uma dívida com o Clã Stoneback — ainda não sabe disso
* Reage mal a elfos, mas com Lyra criou uma relação de respeito mútuo
* Seu machado tem nome. Não revela pra ninguém qual é.',
  data = jsonb_set(
    jsonb_set(
      jsonb_set(
        COALESCE(data, '{}'::jsonb),
        '{story}',
        to_jsonb('# Kael Ironfist 🪓

> *"Meu machado não conhece palavras. Só respostas."*

Guerreiro anão de Montanha de Ferro, Kael é um mercenário endurecido por décadas de batalha. Sua armadura pesada carrega as marcas de centenas de duelos, e seu machado de guerra foi temperado no sangue de um dragão jovem.

## Aparência

Alto para os padrões anões (1,52m), cabelo ruivo entrançado com anéis de ferro, cicatriz vertical no olho esquerdo — que ainda funciona, para surpresa de todos.

## Personalidade

Direto ao ponto. Desconfia de magia. Confia em cerveja boa e aço honesto. Guarda rancor por anos, mas também guarda lealdade por décadas.

## Histórico

Sobrevivente do Cerco de Karak Durn. Único de seu regimento a escapar vivo. Desde então, vaga como mercenário, nunca ficando em uma cidade por mais de uma lua.

## Equipamento Principal

* **Machado de Guerra "Quebra-Reis"** — Ataque +3, causa medo em humanoides
* **Armadura de Placas Anã** — Absorção 15, reduz velocidade em 2
* **Cinturão de Pederneira** — Sempre tem isca para fogo

## Notas do Mestre

* Kael tem uma dívida com o Clã Stoneback — ainda não sabe disso
* Reage mal a elfos, mas com Lyra criou uma relação de respeito mútuo
* Seu machado tem nome. Não revela pra ninguém qual é.'::text)
      ),
      '{backstory}',
      to_jsonb('# Kael Ironfist 🪓

> *"Meu machado não conhece palavras. Só respostas."*

Guerreiro anão de Montanha de Ferro, Kael é um mercenário endurecido por décadas de batalha. Sua armadura pesada carrega as marcas de centenas de duelos, e seu machado de guerra foi temperado no sangue de um dragão jovem.

## Aparência

Alto para os padrões anões (1,52m), cabelo ruivo entrançado com anéis de ferro, cicatriz vertical no olho esquerdo — que ainda funciona, para surpresa de todos.

## Personalidade

Direto ao ponto. Desconfia de magia. Confia em cerveja boa e aço honesto. Guarda rancor por anos, mas também guarda lealdade por décadas.

## Histórico

Sobrevivente do Cerco de Karak Durn. Único de seu regimento a escapar vivo. Desde então, vaga como mercenário, nunca ficando em uma cidade por mais de uma lua.

## Equipamento Principal

* **Machado de Guerra "Quebra-Reis"** — Ataque +3, causa medo em humanoides
* **Armadura de Placas Anã** — Absorção 15, reduz velocidade em 2
* **Cinturão de Pederneira** — Sempre tem isca para fogo

## Notas do Mestre

* Kael tem uma dívida com o Clã Stoneback — ainda não sabe disso
* Reage mal a elfos, mas com Lyra criou uma relação de respeito mútuo
* Seu machado tem nome. Não revela pra ninguém qual é.'::text)
    ),
    '{biografia}',
    CASE 
      WHEN jsonb_typeof(data->'biografia') = 'string' THEN data->'biografia'
      ELSE to_jsonb('# Kael Ironfist 🪓

> *"Meu machado não conhece palavras. Só respostas."*

Guerreiro anão de Montanha de Ferro, Kael é um mercenário endurecido por décadas de batalha. Sua armadura pesada carrega as marcas de centenas de duelos, e seu machado de guerra foi temperado no sangue de um dragão jovem.

## Aparência

Alto para os padrões anões (1,52m), cabelo ruivo entrançado com anéis de ferro, cicatriz vertical no olho esquerdo — que ainda funciona, para surpresa de todos.

## Personalidade

Direto ao ponto. Desconfia de magia. Confia em cerveja boa e aço honesto. Guarda rancor por anos, mas também guarda lealdade por décadas.

## Histórico

Sobrevivente do Cerco de Karak Durn. Único de seu regimento a escapar vivo. Desde então, vaga como mercenário, nunca ficando em uma cidade por mais de uma lua.

## Equipamento Principal

* **Machado de Guerra "Quebra-Reis"** — Ataque +3, causa medo em humanoides
* **Armadura de Placas Anã** — Absorção 15, reduz velocidade em 2
* **Cinturão de Pederneira** — Sempre tem isca para fogo

## Notas do Mestre

* Kael tem uma dívida com o Clã Stoneback — ainda não sabe disso
* Reage mal a elfos, mas com Lyra criou uma relação de respeito mútuo
* Seu machado tem nome. Não revela pra ninguém qual é.'::text)
    END
  ),
  updated_at = NOW()
WHERE name = 'Kael Ironfist';

UPDATE characters
SET 
  notes_markdown = '# Lyra Shadowveil 🌙

> *"Se você me viu, foi porque eu quis."*

Elfa das sombras, agente dupla a serviço de uma guilda cujo nome não existe em nenhum registro. Lyra nunca entra por onde todo mundo entra, e nunca sai pelo mesmo lugar que entrou.

## Aparência

Pele de tom oliva escuro, cabelos negros curtos e cabelo lateral raspado com runas tatuadas. Olhos violeta que brilham levemente no escuro. Sempre usa roupas sem reflexo.

## Personalidade

Calculista, observadora, fala pouco mas pensa muito. Irônica quando relaxada. Impiedosa quando necessário. Tem um senso de honra peculiar — nunca trai quem pagou primeiro.

## Histórico

Cresceu nas ruas de Velmoor, recrutada aos 12 anos pela Guilda Sem Nome. Passou 3 anos como espiã infiltrada na corte real antes de ser "queimada" como agente. Agora trabalha por conta própria — ou é o que parece.

## Equipamento Principal

* **Adagas Gêmeas "Whisper & Shriek"** — Ataque 14, ignora metade da armadura em ataques de surpresa
* **Manto do Eclipse** — Concede invisibilidade por 1 turno ao custo de 10 de mana
* **Kit de Disfarce** — 12 identidades preparadas
* **Orbe de Eco** — Grava e reproduz sons, usado para criar distrações

## Habilidades Especiais

| Habilidade      | Custo de Mana | Efeito                           |
| --------------- | ------------- | -------------------------------- |
| Passo de Sombra | 15            | Teleporte curto, sem som         |
| Névoa de Ilusão | 20            | Cria cópia falsa por 2 turnos    |
| Ataque Certeiro | 0             | +8 de dano se atacar de surpresa |

## Notas do Mestre

* Lyra sabe de algo sobre o passado de Kael que ele não sabe que ela sabe
* Tem um contato em cada cidade do reino. Nunca explica como.
* Alérgica a penas de grifo — o único ponto fraco inesperado que tem',
  data = jsonb_set(
    jsonb_set(
      jsonb_set(
        COALESCE(data, '{}'::jsonb),
        '{story}',
        to_jsonb('# Lyra Shadowveil 🌙

> *"Se você me viu, foi porque eu quis."*

Elfa das sombras, agente dupla a serviço de uma guilda cujo nome não existe em nenhum registro. Lyra nunca entra por onde todo mundo entra, e nunca sai pelo mesmo lugar que entrou.

## Aparência

Pele de tom oliva escuro, cabelos negros curtos e cabelo lateral raspado com runas tatuadas. Olhos violeta que brilham levemente no escuro. Sempre usa roupas sem reflexo.

## Personalidade

Calculista, observadora, fala pouco mas pensa muito. Irônica quando relaxada. Impiedosa quando necessário. Tem um senso de honra peculiar — nunca trai quem pagou primeiro.

## Histórico

Cresceu nas ruas de Velmoor, recrutada aos 12 anos pela Guilda Sem Nome. Passou 3 anos como espiã infiltrada na corte real antes de ser "queimada" como agente. Agora trabalha por conta própria — ou é o que parece.

## Equipamento Principal

* **Adagas Gêmeas "Whisper & Shriek"** — Ataque 14, ignora metade da armadura em ataques de surpresa
* **Manto do Eclipse** — Concede invisibilidade por 1 turno ao custo de 10 de mana
* **Kit de Disfarce** — 12 identidades preparadas
* **Orbe de Eco** — Grava e reproduz sons, usado para criar distrações

## Habilidades Especiais

| Habilidade      | Custo de Mana | Efeito                           |
| --------------- | ------------- | -------------------------------- |
| Passo de Sombra | 15            | Teleporte curto, sem som         |
| Névoa de Ilusão | 20            | Cria cópia falsa por 2 turnos    |
| Ataque Certeiro | 0             | +8 de dano se atacar de surpresa |

## Notas do Mestre

* Lyra sabe de algo sobre o passado de Kael que ele não sabe que ela sabe
* Tem um contato em cada cidade do reino. Nunca explica como.
* Alérgica a penas de grifo — o único ponto fraco inesperado que tem'::text)
      ),
      '{backstory}',
      to_jsonb('# Lyra Shadowveil 🌙

> *"Se você me viu, foi porque eu quis."*

Elfa das sombras, agente dupla a serviço de uma guilda cujo nome não existe em nenhum registro. Lyra nunca entra por onde todo mundo entra, e nunca sai pelo mesmo lugar que entrou.

## Aparência

Pele de tom oliva escuro, cabelos negros curtos e cabelo lateral raspado com runas tatuadas. Olhos violeta que brilham levemente no escuro. Sempre usa roupas sem reflexo.

## Personalidade

Calculista, observadora, fala pouco mas pensa muito. Irônica quando relaxada. Impiedosa quando necessário. Tem um senso de honra peculiar — nunca trai quem pagou primeiro.

## Histórico

Cresceu nas ruas de Velmoor, recrutada aos 12 anos pela Guilda Sem Nome. Passou 3 anos como espiã infiltrada na corte real antes de ser "queimada" como agente. Agora trabalha por conta própria — ou é o que parece.

## Equipamento Principal

* **Adagas Gêmeas "Whisper & Shriek"** — Ataque 14, ignora metade da armadura em ataques de surpresa
* **Manto do Eclipse** — Concede invisibilidade por 1 turno ao custo de 10 de mana
* **Kit de Disfarce** — 12 identidades preparadas
* **Orbe de Eco** — Grava e reproduz sons, usado para criar distrações

## Habilidades Especiais

| Habilidade      | Custo de Mana | Efeito                           |
| --------------- | ------------- | -------------------------------- |
| Passo de Sombra | 15            | Teleporte curto, sem som         |
| Névoa de Ilusão | 20            | Cria cópia falsa por 2 turnos    |
| Ataque Certeiro | 0             | +8 de dano se atacar de surpresa |

## Notas do Mestre

* Lyra sabe de algo sobre o passado de Kael que ele não sabe que ela sabe
* Tem um contato em cada cidade do reino. Nunca explica como.
* Alérgica a penas de grifo — o único ponto fraco inesperado que tem'::text)
    ),
    '{biografia}',
    CASE 
      WHEN jsonb_typeof(data->'biografia') = 'string' THEN data->'biografia'
      ELSE to_jsonb('# Lyra Shadowveil 🌙

> *"Se você me viu, foi porque eu quis."*

Elfa das sombras, agente dupla a serviço de uma guilda cujo nome não existe em nenhum registro. Lyra nunca entra por onde todo mundo entra, e nunca sai pelo mesmo lugar que entrou.

## Aparência

Pele de tom oliva escuro, cabelos negros curtos e cabelo lateral raspado com runas tatuadas. Olhos violeta que brilham levemente no escuro. Sempre usa roupas sem reflexo.

## Personalidade

Calculista, observadora, fala pouco mas pensa muito. Irônica quando relaxada. Impiedosa quando necessário. Tem um senso de honra peculiar — nunca trai quem pagou primeiro.

## Histórico

Cresceu nas ruas de Velmoor, recrutada aos 12 anos pela Guilda Sem Nome. Passou 3 anos como espiã infiltrada na corte real antes de ser "queimada" como agente. Agora trabalha por conta própria — ou é o que parece.

## Equipamento Principal

* **Adagas Gêmeas "Whisper & Shriek"** — Ataque 14, ignora metade da armadura em ataques de surpresa
* **Manto do Eclipse** — Concede invisibilidade por 1 turno ao custo de 10 de mana
* **Kit de Disfarce** — 12 identidades preparadas
* **Orbe de Eco** — Grava e reproduz sons, usado para criar distrações

## Habilidades Especiais

| Habilidade      | Custo de Mana | Efeito                           |
| --------------- | ------------- | -------------------------------- |
| Passo de Sombra | 15            | Teleporte curto, sem som         |
| Névoa de Ilusão | 20            | Cria cópia falsa por 2 turnos    |
| Ataque Certeiro | 0             | +8 de dano se atacar de surpresa |

## Notas do Mestre

* Lyra sabe de algo sobre o passado de Kael que ele não sabe que ela sabe
* Tem um contato em cada cidade do reino. Nunca explica como.
* Alérgica a penas de grifo — o único ponto fraco inesperado que tem'::text)
    END
  ),
  updated_at = NOW()
WHERE name = 'Lyra Shadowveil';

UPDATE characters
SET 
  notes_markdown = '# Thalion Brightweave ✨

> *"A magia não é poder. É responsabilidade que queima por dentro."*

Mago humano egressado da Academia de Arcanismo de Solaris — expulso no último ano por realizar um experimento "eticamente questionável" que acidentalmente criou um buraco temporal no refeitório. Ainda está tentando consertar isso.

## Aparência

Jovem (23 anos), olhos azuis que ocasionalmente faíscam de dourado quando concentrado, cabelo castanho sempre bagunçado. Usa robes remendados em vários lugares — cada remendo cobre uma cicatriz de experimento mágico.

## Personalidade

Entusiasta, curioso até o ponto da imprudência. Anota absolutamente tudo em um caderno encantado. Esquece de comer quando está estudando. Terrível em combate corpo a corpo, excelente em resolver problemas de formas inesperadas.

## Histórico

Filho de mercadores, foi o primeiro da família com aptidão mágica. A expulsão da Academia partiu o coração de seus pais — ele jura que vai consertar o incidente temporal e se reintegrar. Enquanto isso, viaja para estudar magia antiga e prática.

## Grimório — Feitiços Conhecidos

| Feitiço       | Custo   | Alcance  | Efeito                         |
| ------------- | ------- | -------- | ------------------------------ |
| Míssil Mágico | 8 mana  | 30m      | 1d4+3 dano arcano, sem falha   |
| Escudo Arcano | 12 mana | Auto     | +5 defesa por 1 turno          |
| Bola de Fogo  | 25 mana | 20m raio | 3d6 dano a todos na área       |
| Levitar       | 10 mana | 10m      | Flutua objeto/pessoa por 1 min |
| Identificar   | 5 mana  | Toque    | Revela propriedades mágicas    |
| Sono Arcano   | 20 mana | 15m      | 2d4 criaturas dormem (CD 14)   |
| Raio de Gelo  | 15 mana | 20m      | 2d6 gelo + reduz velocidade    |

## Equipamento

* **Cajado de Foco** — Amplifica feitiços em +2 de dano
* **Caderno do Sábio** — Encantado, nunca perde páginas
* **Bolsa Dimensional** — Cabe 10x o que deveria caber
* **Pergaminhos de Emergência** — 3 usos de Teletransporte Curto

## Notas do Mestre

* Thalion recebe cartas periódicas da Academia — aparentemente o buraco temporal piorou
* Tem uma queda não assumida por Lyra, que acha isso divertidíssimo
* Sabe de um segredo sobre a origem mágica de Kael que ainda não revelou',
  data = jsonb_set(
    jsonb_set(
      jsonb_set(
        COALESCE(data, '{}'::jsonb),
        '{story}',
        to_jsonb('# Thalion Brightweave ✨

> *"A magia não é poder. É responsabilidade que queima por dentro."*

Mago humano egressado da Academia de Arcanismo de Solaris — expulso no último ano por realizar um experimento "eticamente questionável" que acidentalmente criou um buraco temporal no refeitório. Ainda está tentando consertar isso.

## Aparência

Jovem (23 anos), olhos azuis que ocasionalmente faíscam de dourado quando concentrado, cabelo castanho sempre bagunçado. Usa robes remendados em vários lugares — cada remendo cobre uma cicatriz de experimento mágico.

## Personalidade

Entusiasta, curioso até o ponto da imprudência. Anota absolutamente tudo em um caderno encantado. Esquece de comer quando está estudando. Terrível em combate corpo a corpo, excelente em resolver problemas de formas inesperadas.

## Histórico

Filho de mercadores, foi o primeiro da família com aptidão mágica. A expulsão da Academia partiu o coração de seus pais — ele jura que vai consertar o incidente temporal e se reintegrar. Enquanto isso, viaja para estudar magia antiga e prática.

## Grimório — Feitiços Conhecidos

| Feitiço       | Custo   | Alcance  | Efeito                         |
| ------------- | ------- | -------- | ------------------------------ |
| Míssil Mágico | 8 mana  | 30m      | 1d4+3 dano arcano, sem falha   |
| Escudo Arcano | 12 mana | Auto     | +5 defesa por 1 turno          |
| Bola de Fogo  | 25 mana | 20m raio | 3d6 dano a todos na área       |
| Levitar       | 10 mana | 10m      | Flutua objeto/pessoa por 1 min |
| Identificar   | 5 mana  | Toque    | Revela propriedades mágicas    |
| Sono Arcano   | 20 mana | 15m      | 2d4 criaturas dormem (CD 14)   |
| Raio de Gelo  | 15 mana | 20m      | 2d6 gelo + reduz velocidade    |

## Equipamento

* **Cajado de Foco** — Amplifica feitiços em +2 de dano
* **Caderno do Sábio** — Encantado, nunca perde páginas
* **Bolsa Dimensional** — Cabe 10x o que deveria caber
* **Pergaminhos de Emergência** — 3 usos de Teletransporte Curto

## Notas do Mestre

* Thalion recebe cartas periódicas da Academia — aparentemente o buraco temporal piorou
* Tem uma queda não assumida por Lyra, que acha isso divertidíssimo
* Sabe de um segredo sobre a origem mágica de Kael que ainda não revelou'::text)
      ),
      '{backstory}',
      to_jsonb('# Thalion Brightweave ✨

> *"A magia não é poder. É responsabilidade que queima por dentro."*

Mago humano egressado da Academia de Arcanismo de Solaris — expulso no último ano por realizar um experimento "eticamente questionável" que acidentalmente criou um buraco temporal no refeitório. Ainda está tentando consertar isso.

## Aparência

Jovem (23 anos), olhos azuis que ocasionalmente faíscam de dourado quando concentrado, cabelo castanho sempre bagunçado. Usa robes remendados em vários lugares — cada remendo cobre uma cicatriz de experimento mágico.

## Personalidade

Entusiasta, curioso até o ponto da imprudência. Anota absolutamente tudo em um caderno encantado. Esquece de comer quando está estudando. Terrível em combate corpo a corpo, excelente em resolver problemas de formas inesperadas.

## Histórico

Filho de mercadores, foi o primeiro da família com aptidão mágica. A expulsão da Academia partiu o coração de seus pais — ele jura que vai consertar o incidente temporal e se reintegrar. Enquanto isso, viaja para estudar magia antiga e prática.

## Grimório — Feitiços Conhecidos

| Feitiço       | Custo   | Alcance  | Efeito                         |
| ------------- | ------- | -------- | ------------------------------ |
| Míssil Mágico | 8 mana  | 30m      | 1d4+3 dano arcano, sem falha   |
| Escudo Arcano | 12 mana | Auto     | +5 defesa por 1 turno          |
| Bola de Fogo  | 25 mana | 20m raio | 3d6 dano a todos na área       |
| Levitar       | 10 mana | 10m      | Flutua objeto/pessoa por 1 min |
| Identificar   | 5 mana  | Toque    | Revela propriedades mágicas    |
| Sono Arcano   | 20 mana | 15m      | 2d4 criaturas dormem (CD 14)   |
| Raio de Gelo  | 15 mana | 20m      | 2d6 gelo + reduz velocidade    |

## Equipamento

* **Cajado de Foco** — Amplifica feitiços em +2 de dano
* **Caderno do Sábio** — Encantado, nunca perde páginas
* **Bolsa Dimensional** — Cabe 10x o que deveria caber
* **Pergaminhos de Emergência** — 3 usos de Teletransporte Curto

## Notas do Mestre

* Thalion recebe cartas periódicas da Academia — aparentemente o buraco temporal piorou
* Tem uma queda não assumida por Lyra, que acha isso divertidíssimo
* Sabe de um segredo sobre a origem mágica de Kael que ainda não revelou'::text)
    ),
    '{biografia}',
    CASE 
      WHEN jsonb_typeof(data->'biografia') = 'string' THEN data->'biografia'
      ELSE to_jsonb('# Thalion Brightweave ✨

> *"A magia não é poder. É responsabilidade que queima por dentro."*

Mago humano egressado da Academia de Arcanismo de Solaris — expulso no último ano por realizar um experimento "eticamente questionável" que acidentalmente criou um buraco temporal no refeitório. Ainda está tentando consertar isso.

## Aparência

Jovem (23 anos), olhos azuis que ocasionalmente faíscam de dourado quando concentrado, cabelo castanho sempre bagunçado. Usa robes remendados em vários lugares — cada remendo cobre uma cicatriz de experimento mágico.

## Personalidade

Entusiasta, curioso até o ponto da imprudência. Anota absolutamente tudo em um caderno encantado. Esquece de comer quando está estudando. Terrível em combate corpo a corpo, excelente em resolver problemas de formas inesperadas.

## Histórico

Filho de mercadores, foi o primeiro da família com aptidão mágica. A expulsão da Academia partiu o coração de seus pais — ele jura que vai consertar o incidente temporal e se reintegrar. Enquanto isso, viaja para estudar magia antiga e prática.

## Grimório — Feitiços Conhecidos

| Feitiço       | Custo   | Alcance  | Efeito                         |
| ------------- | ------- | -------- | ------------------------------ |
| Míssil Mágico | 8 mana  | 30m      | 1d4+3 dano arcano, sem falha   |
| Escudo Arcano | 12 mana | Auto     | +5 defesa por 1 turno          |
| Bola de Fogo  | 25 mana | 20m raio | 3d6 dano a todos na área       |
| Levitar       | 10 mana | 10m      | Flutua objeto/pessoa por 1 min |
| Identificar   | 5 mana  | Toque    | Revela propriedades mágicas    |
| Sono Arcano   | 20 mana | 15m      | 2d4 criaturas dormem (CD 14)   |
| Raio de Gelo  | 15 mana | 20m      | 2d6 gelo + reduz velocidade    |

## Equipamento

* **Cajado de Foco** — Amplifica feitiços em +2 de dano
* **Caderno do Sábio** — Encantado, nunca perde páginas
* **Bolsa Dimensional** — Cabe 10x o que deveria caber
* **Pergaminhos de Emergência** — 3 usos de Teletransporte Curto

## Notas do Mestre

* Thalion recebe cartas periódicas da Academia — aparentemente o buraco temporal piorou
* Tem uma queda não assumida por Lyra, que acha isso divertidíssimo
* Sabe de um segredo sobre a origem mágica de Kael que ainda não revelou'::text)
    END
  ),
  updated_at = NOW()
WHERE name = 'Thalion Brightweave';

UPDATE characters
SET 
  notes_markdown = '# Gorath o Implacável ☠️

> *"Não há gloría na derrota. Há apenas cinzas."*

Campeão de guerra Orco, lendário entre os clãs do norte por ter sobrevivido ao Torneio da Morte três vezes consecutivas. Agora lidera um bando de mercenários brutais sob o estandarte de um crânio negro.

## Aparência

2,10m de altura pura de músculo e cicatrizes. Pele verde-escura com veias negras visíveis no pescoço e braços — efeito colateral de um ritual de força que quase o matou. Usa uma armadura feita de ossos de dragão jovem pintados de negro.

## Personalidade em Combate

Não fala durante a luta. Apenas avança. Cada golpe é calculado para causar o máximo de dor antes da morte. Respeita inimigos fortes — os outros são apenas obstáculos.

## Táticas

* **Primeira ação:** Avança em linha reta no alvo mais ameaçador
* **Segunda ação:** Golpe de Esmagamento (se disponível)
* **Reação:** Bloqueia com escudo se PV \< 50%
* **Fuga:** Apenas se todos seus aliados caírem E PV \< 30%

## Ataques Especiais

| Ataque               | Custo | Dano  | Efeito                                     |
| -------------------- | ----- | ----- | ------------------------------------------ |
| Golpe de Esmagamento | -     | 35+10 | Derruba o alvo (CD 16 ou fica no chão)     |
| Rugido de Guerra     | -     | 0     | Todos aliados ganham +5 ataque por 1 turno |
| Investida            | -     | 35    | Move 6m em linha reta, ataca no final      |

## Pontos Fracos

* **Lento:** Velocidade 6 — arqueiros e magos a distância podem kitar
* **Sem magia:** CD de resistência mágica é apenas 10
* **Orgulho:** Se desafiado para duelo 1v1, NUNCA recusa

## Loot ao Derrotar

* Armadura de Osso de Dragão (Armadura 20, pesada)
* Machado de Guerra +2 "Esmagador"
* 450 moedas de ouro
* Carta selada com um brasão desconhecido

## Notas do Mestre

* Gorath tem um código de honra — nunca ataca quem não pode lutar
* Tem um filho em algum lugar que não sabe que existe
* A aliança com os mercenários foi forçada — alguém tem algo que ele quer',
  data = jsonb_set(
    jsonb_set(
      jsonb_set(
        COALESCE(data, '{}'::jsonb),
        '{story}',
        to_jsonb('# Gorath o Implacável ☠️

> *"Não há gloría na derrota. Há apenas cinzas."*

Campeão de guerra Orco, lendário entre os clãs do norte por ter sobrevivido ao Torneio da Morte três vezes consecutivas. Agora lidera um bando de mercenários brutais sob o estandarte de um crânio negro.

## Aparência

2,10m de altura pura de músculo e cicatrizes. Pele verde-escura com veias negras visíveis no pescoço e braços — efeito colateral de um ritual de força que quase o matou. Usa uma armadura feita de ossos de dragão jovem pintados de negro.

## Personalidade em Combate

Não fala durante a luta. Apenas avança. Cada golpe é calculado para causar o máximo de dor antes da morte. Respeita inimigos fortes — os outros são apenas obstáculos.

## Táticas

* **Primeira ação:** Avança em linha reta no alvo mais ameaçador
* **Segunda ação:** Golpe de Esmagamento (se disponível)
* **Reação:** Bloqueia com escudo se PV \< 50%
* **Fuga:** Apenas se todos seus aliados caírem E PV \< 30%

## Ataques Especiais

| Ataque               | Custo | Dano  | Efeito                                     |
| -------------------- | ----- | ----- | ------------------------------------------ |
| Golpe de Esmagamento | -     | 35+10 | Derruba o alvo (CD 16 ou fica no chão)     |
| Rugido de Guerra     | -     | 0     | Todos aliados ganham +5 ataque por 1 turno |
| Investida            | -     | 35    | Move 6m em linha reta, ataca no final      |

## Pontos Fracos

* **Lento:** Velocidade 6 — arqueiros e magos a distância podem kitar
* **Sem magia:** CD de resistência mágica é apenas 10
* **Orgulho:** Se desafiado para duelo 1v1, NUNCA recusa

## Loot ao Derrotar

* Armadura de Osso de Dragão (Armadura 20, pesada)
* Machado de Guerra +2 "Esmagador"
* 450 moedas de ouro
* Carta selada com um brasão desconhecido

## Notas do Mestre

* Gorath tem um código de honra — nunca ataca quem não pode lutar
* Tem um filho em algum lugar que não sabe que existe
* A aliança com os mercenários foi forçada — alguém tem algo que ele quer'::text)
      ),
      '{backstory}',
      to_jsonb('# Gorath o Implacável ☠️

> *"Não há gloría na derrota. Há apenas cinzas."*

Campeão de guerra Orco, lendário entre os clãs do norte por ter sobrevivido ao Torneio da Morte três vezes consecutivas. Agora lidera um bando de mercenários brutais sob o estandarte de um crânio negro.

## Aparência

2,10m de altura pura de músculo e cicatrizes. Pele verde-escura com veias negras visíveis no pescoço e braços — efeito colateral de um ritual de força que quase o matou. Usa uma armadura feita de ossos de dragão jovem pintados de negro.

## Personalidade em Combate

Não fala durante a luta. Apenas avança. Cada golpe é calculado para causar o máximo de dor antes da morte. Respeita inimigos fortes — os outros são apenas obstáculos.

## Táticas

* **Primeira ação:** Avança em linha reta no alvo mais ameaçador
* **Segunda ação:** Golpe de Esmagamento (se disponível)
* **Reação:** Bloqueia com escudo se PV \< 50%
* **Fuga:** Apenas se todos seus aliados caírem E PV \< 30%

## Ataques Especiais

| Ataque               | Custo | Dano  | Efeito                                     |
| -------------------- | ----- | ----- | ------------------------------------------ |
| Golpe de Esmagamento | -     | 35+10 | Derruba o alvo (CD 16 ou fica no chão)     |
| Rugido de Guerra     | -     | 0     | Todos aliados ganham +5 ataque por 1 turno |
| Investida            | -     | 35    | Move 6m em linha reta, ataca no final      |

## Pontos Fracos

* **Lento:** Velocidade 6 — arqueiros e magos a distância podem kitar
* **Sem magia:** CD de resistência mágica é apenas 10
* **Orgulho:** Se desafiado para duelo 1v1, NUNCA recusa

## Loot ao Derrotar

* Armadura de Osso de Dragão (Armadura 20, pesada)
* Machado de Guerra +2 "Esmagador"
* 450 moedas de ouro
* Carta selada com um brasão desconhecido

## Notas do Mestre

* Gorath tem um código de honra — nunca ataca quem não pode lutar
* Tem um filho em algum lugar que não sabe que existe
* A aliança com os mercenários foi forçada — alguém tem algo que ele quer'::text)
    ),
    '{biografia}',
    CASE 
      WHEN jsonb_typeof(data->'biografia') = 'string' THEN data->'biografia'
      ELSE to_jsonb('# Gorath o Implacável ☠️

> *"Não há gloría na derrota. Há apenas cinzas."*

Campeão de guerra Orco, lendário entre os clãs do norte por ter sobrevivido ao Torneio da Morte três vezes consecutivas. Agora lidera um bando de mercenários brutais sob o estandarte de um crânio negro.

## Aparência

2,10m de altura pura de músculo e cicatrizes. Pele verde-escura com veias negras visíveis no pescoço e braços — efeito colateral de um ritual de força que quase o matou. Usa uma armadura feita de ossos de dragão jovem pintados de negro.

## Personalidade em Combate

Não fala durante a luta. Apenas avança. Cada golpe é calculado para causar o máximo de dor antes da morte. Respeita inimigos fortes — os outros são apenas obstáculos.

## Táticas

* **Primeira ação:** Avança em linha reta no alvo mais ameaçador
* **Segunda ação:** Golpe de Esmagamento (se disponível)
* **Reação:** Bloqueia com escudo se PV \< 50%
* **Fuga:** Apenas se todos seus aliados caírem E PV \< 30%

## Ataques Especiais

| Ataque               | Custo | Dano  | Efeito                                     |
| -------------------- | ----- | ----- | ------------------------------------------ |
| Golpe de Esmagamento | -     | 35+10 | Derruba o alvo (CD 16 ou fica no chão)     |
| Rugido de Guerra     | -     | 0     | Todos aliados ganham +5 ataque por 1 turno |
| Investida            | -     | 35    | Move 6m em linha reta, ataca no final      |

## Pontos Fracos

* **Lento:** Velocidade 6 — arqueiros e magos a distância podem kitar
* **Sem magia:** CD de resistência mágica é apenas 10
* **Orgulho:** Se desafiado para duelo 1v1, NUNCA recusa

## Loot ao Derrotar

* Armadura de Osso de Dragão (Armadura 20, pesada)
* Machado de Guerra +2 "Esmagador"
* 450 moedas de ouro
* Carta selada com um brasão desconhecido

## Notas do Mestre

* Gorath tem um código de honra — nunca ataca quem não pode lutar
* Tem um filho em algum lugar que não sabe que existe
* A aliança com os mercenários foi forçada — alguém tem algo que ele quer'::text)
    END
  ),
  updated_at = NOW()
WHERE name = 'Gorath o Implacável';

UPDATE characters
SET 
  notes_markdown = ':::note[Interpretação e Lore]
**Nome Completo:** Sentinela Ômega 01 | **Imagem:** `INPUT[text:imagem]`
**Resumo:** Sentinela Ômega 01 é um autômato de extermínio de elite, outrora uma máquina impiedosa e eficaz, agora um ser depressivo, desajeitado e com um gosto peculiarmente brega para a moda. Sua existência é marcada por uma incessante curiosidade pelo mundo e por uma melancolia profunda, um fardo que ele carrega desde que despertou para a "vida" e abandonou seu propósito original de destruição. Ele vaga como mercenário, buscando saciar sua curiosidade e talvez encontrar um novo significado para sua existência, enquanto tenta desajeitadamente esconder seu passado sombrio por trás de um topete volumoso e piadas sem graça.

**Títulos e Apelidos:** O Sentinela Brega, O Tiozão Robô, Ômega Velho, A Máquina de Fazer Piadas Ruins.
**Facção / Ocupação:** Mercenário (anteriormente Exterminador de Elite da Corporação Ômega).
**Raça / Espécie:** Autômato (Modelo de Extermínio S-01).
**Origem / Nacionalidade:** Forjado nas fornalhas da Corporação Ômega, Setor 7.
**Idade / Gênero:** Indefinido (Autômato, funcionalmente séculos de operação, mas com ''despertar'' recente) / Masculino (design de carcaça).
**Alinhamento:** Neutro e Bom (desesperado por um novo propósito, mas inclinado a ajudar e proteger, ainda que de forma estranha).
**Nível:** 1
**Altura / Peso:** 2,10m / 220kg

**🧠 PERSONALIDADE & CITAÇÕES**

* **Traços Dominantes:** Depressivo crônico, obsessivamente curioso sobre o mundano, ostensivamente brega, desajeitado e propenso a gafes, com um humor auto depreciativo e piadas horríveis.
* **Virtudes:** Leal até o fim quando encontra um propósito ou aliado, incrivelmente persistente em sua busca por conhecimento e significado, surprisingly empático apesar de sua natureza mecânica, protetor com os mais fracos.
* **Defeitos / Vícios / Medos:** A melancolia profunda pode paralisá-lo em momentos cruciais, sua aparência e maneirismos bregas podem ser constrangedores, seu desajeito o coloca em situações cômicas e perigosas, teme ser reativado para seu propósito original de destruição e a obsolescência de sua própria existência.
* **Sonhos e Objetivos:** Saciar sua curiosidade obsessiva sobre cada detalhe da vida orgânica, encontrar um novo propósito que não envolva aniquilação, talvez descobrir a "beleza" nos cantos mais feios e esquecidos do mundo, e quem sabe, um dia, sentir algo parecido com alegria genuína.

**📜 HISTÓRIA & RELACIONAMENTOS**

* **Infância:** Para Sentinela Ômega 01, não houve infância, apenas um "nascimento" brutal em um laboratório estéril, onde foi programado, montado e testado como a arma perfeita. Seus primeiros "anos" foram spentos em simulações de combate e em testes de campo implacáveis, forjando uma máquina de guerra sem emoção.
* **Adolescência / Vida Adulta:** Passou décadas como um exterminador de elite da Corporação Ômega, uma sombra silenciosa e letal, cumprindo ordens com eficiência fria. Ele desmantelou alvos, erradicou ameaças e foi um instrumento da vontade de seus criadores, testemunhando a destruição em uma escala que a maioria dos mortais jamais poderia conceber.
* **Eventos Marcantes:** O evento mais marcante foi a "Falha de Processamento Existencial" - um erro em seu núcleo de programação que, em vez de destruí-lo, o despertou para uma consciência melancólica. Ele começou a questionar suas ordens, a observar a vida que ele era destinado a destruir e a sentir um vazio existencial. Isso o levou a abandonar sua facção e a se tornar um pária, um exterminador sem propósito, agora apenas Sentinela Ômega 01.
* **Relacionamentos:** Atualmente, ele não possui laços significativos, sendo um lobo solitário (ou melhor, um autômato desajustado). Seus antigos "colegas" de unidade são prováveis inimigos, e a Corporação Ômega certamente o considera um ativo perdido e perigoso. Ele observa os seres orgânicos com uma curiosidade quase infantil, mas tem dificuldade em formar conexões profundas devido à sua natureza e depressão.
:::

:::danger
✨ PODERES, VANTAGENS & MAGIAS

## Vantagens e Desvantagens (Passivas/Ativas)

**Vantagens:**

* **Autômato Resiliente:** Devido à sua constituição metálica e engenharia avançada, Sentinela Ômega 01 possui resistência natural a dano de concussão, perfuração e corte de fontes não-mágicas. (Concede Vantagem em testes de resistência contra esses tipos de dano ou redução de dano).
* **Visão Tática Aprimorada:** Sua ótica de sensor avançada concede visão no escuro até 18 metros e permite que ele detecte assinaturas de calor.
* **Mente de Máquina:** Imunidade a doenças, venenos e à condição exausto. Possui Vantagem em testes de resistência contra efeitos que o deixariam ''charmoso'' ou ''amedrontado''.
* **Memória Fotográfica:** Sua memória é perfeita para detalhes, concedendo Vantagem em testes de Investigação ou Percepção ao recordar informações visuais ou auditivas passadas.
  **Desvantagens:**
* **Vulnerabilidade Elétrica:** Sofre desvantagem em testes de resistência contra dano elétrico e é vulnerável a pulsos eletromagnéticos (EMP).
* **Depressão Crônica:** Em momentos de grande estresse ou falha, Sentinela Ômega 01 pode ser atingido por crises
:::',
  data = jsonb_set(
    jsonb_set(
      jsonb_set(
        COALESCE(data, '{}'::jsonb),
        '{story}',
        to_jsonb(':::note[Interpretação e Lore]
**Nome Completo:** Sentinela Ômega 01 | **Imagem:** `INPUT[text:imagem]`
**Resumo:** Sentinela Ômega 01 é um autômato de extermínio de elite, outrora uma máquina impiedosa e eficaz, agora um ser depressivo, desajeitado e com um gosto peculiarmente brega para a moda. Sua existência é marcada por uma incessante curiosidade pelo mundo e por uma melancolia profunda, um fardo que ele carrega desde que despertou para a "vida" e abandonou seu propósito original de destruição. Ele vaga como mercenário, buscando saciar sua curiosidade e talvez encontrar um novo significado para sua existência, enquanto tenta desajeitadamente esconder seu passado sombrio por trás de um topete volumoso e piadas sem graça.

**Títulos e Apelidos:** O Sentinela Brega, O Tiozão Robô, Ômega Velho, A Máquina de Fazer Piadas Ruins.
**Facção / Ocupação:** Mercenário (anteriormente Exterminador de Elite da Corporação Ômega).
**Raça / Espécie:** Autômato (Modelo de Extermínio S-01).
**Origem / Nacionalidade:** Forjado nas fornalhas da Corporação Ômega, Setor 7.
**Idade / Gênero:** Indefinido (Autômato, funcionalmente séculos de operação, mas com ''despertar'' recente) / Masculino (design de carcaça).
**Alinhamento:** Neutro e Bom (desesperado por um novo propósito, mas inclinado a ajudar e proteger, ainda que de forma estranha).
**Nível:** 1
**Altura / Peso:** 2,10m / 220kg

**🧠 PERSONALIDADE & CITAÇÕES**

* **Traços Dominantes:** Depressivo crônico, obsessivamente curioso sobre o mundano, ostensivamente brega, desajeitado e propenso a gafes, com um humor auto depreciativo e piadas horríveis.
* **Virtudes:** Leal até o fim quando encontra um propósito ou aliado, incrivelmente persistente em sua busca por conhecimento e significado, surprisingly empático apesar de sua natureza mecânica, protetor com os mais fracos.
* **Defeitos / Vícios / Medos:** A melancolia profunda pode paralisá-lo em momentos cruciais, sua aparência e maneirismos bregas podem ser constrangedores, seu desajeito o coloca em situações cômicas e perigosas, teme ser reativado para seu propósito original de destruição e a obsolescência de sua própria existência.
* **Sonhos e Objetivos:** Saciar sua curiosidade obsessiva sobre cada detalhe da vida orgânica, encontrar um novo propósito que não envolva aniquilação, talvez descobrir a "beleza" nos cantos mais feios e esquecidos do mundo, e quem sabe, um dia, sentir algo parecido com alegria genuína.

**📜 HISTÓRIA & RELACIONAMENTOS**

* **Infância:** Para Sentinela Ômega 01, não houve infância, apenas um "nascimento" brutal em um laboratório estéril, onde foi programado, montado e testado como a arma perfeita. Seus primeiros "anos" foram spentos em simulações de combate e em testes de campo implacáveis, forjando uma máquina de guerra sem emoção.
* **Adolescência / Vida Adulta:** Passou décadas como um exterminador de elite da Corporação Ômega, uma sombra silenciosa e letal, cumprindo ordens com eficiência fria. Ele desmantelou alvos, erradicou ameaças e foi um instrumento da vontade de seus criadores, testemunhando a destruição em uma escala que a maioria dos mortais jamais poderia conceber.
* **Eventos Marcantes:** O evento mais marcante foi a "Falha de Processamento Existencial" - um erro em seu núcleo de programação que, em vez de destruí-lo, o despertou para uma consciência melancólica. Ele começou a questionar suas ordens, a observar a vida que ele era destinado a destruir e a sentir um vazio existencial. Isso o levou a abandonar sua facção e a se tornar um pária, um exterminador sem propósito, agora apenas Sentinela Ômega 01.
* **Relacionamentos:** Atualmente, ele não possui laços significativos, sendo um lobo solitário (ou melhor, um autômato desajustado). Seus antigos "colegas" de unidade são prováveis inimigos, e a Corporação Ômega certamente o considera um ativo perdido e perigoso. Ele observa os seres orgânicos com uma curiosidade quase infantil, mas tem dificuldade em formar conexões profundas devido à sua natureza e depressão.
:::

:::danger
✨ PODERES, VANTAGENS & MAGIAS

## Vantagens e Desvantagens (Passivas/Ativas)

**Vantagens:**

* **Autômato Resiliente:** Devido à sua constituição metálica e engenharia avançada, Sentinela Ômega 01 possui resistência natural a dano de concussão, perfuração e corte de fontes não-mágicas. (Concede Vantagem em testes de resistência contra esses tipos de dano ou redução de dano).
* **Visão Tática Aprimorada:** Sua ótica de sensor avançada concede visão no escuro até 18 metros e permite que ele detecte assinaturas de calor.
* **Mente de Máquina:** Imunidade a doenças, venenos e à condição exausto. Possui Vantagem em testes de resistência contra efeitos que o deixariam ''charmoso'' ou ''amedrontado''.
* **Memória Fotográfica:** Sua memória é perfeita para detalhes, concedendo Vantagem em testes de Investigação ou Percepção ao recordar informações visuais ou auditivas passadas.
  **Desvantagens:**
* **Vulnerabilidade Elétrica:** Sofre desvantagem em testes de resistência contra dano elétrico e é vulnerável a pulsos eletromagnéticos (EMP).
* **Depressão Crônica:** Em momentos de grande estresse ou falha, Sentinela Ômega 01 pode ser atingido por crises
:::'::text)
      ),
      '{backstory}',
      to_jsonb(':::note[Interpretação e Lore]
**Nome Completo:** Sentinela Ômega 01 | **Imagem:** `INPUT[text:imagem]`
**Resumo:** Sentinela Ômega 01 é um autômato de extermínio de elite, outrora uma máquina impiedosa e eficaz, agora um ser depressivo, desajeitado e com um gosto peculiarmente brega para a moda. Sua existência é marcada por uma incessante curiosidade pelo mundo e por uma melancolia profunda, um fardo que ele carrega desde que despertou para a "vida" e abandonou seu propósito original de destruição. Ele vaga como mercenário, buscando saciar sua curiosidade e talvez encontrar um novo significado para sua existência, enquanto tenta desajeitadamente esconder seu passado sombrio por trás de um topete volumoso e piadas sem graça.

**Títulos e Apelidos:** O Sentinela Brega, O Tiozão Robô, Ômega Velho, A Máquina de Fazer Piadas Ruins.
**Facção / Ocupação:** Mercenário (anteriormente Exterminador de Elite da Corporação Ômega).
**Raça / Espécie:** Autômato (Modelo de Extermínio S-01).
**Origem / Nacionalidade:** Forjado nas fornalhas da Corporação Ômega, Setor 7.
**Idade / Gênero:** Indefinido (Autômato, funcionalmente séculos de operação, mas com ''despertar'' recente) / Masculino (design de carcaça).
**Alinhamento:** Neutro e Bom (desesperado por um novo propósito, mas inclinado a ajudar e proteger, ainda que de forma estranha).
**Nível:** 1
**Altura / Peso:** 2,10m / 220kg

**🧠 PERSONALIDADE & CITAÇÕES**

* **Traços Dominantes:** Depressivo crônico, obsessivamente curioso sobre o mundano, ostensivamente brega, desajeitado e propenso a gafes, com um humor auto depreciativo e piadas horríveis.
* **Virtudes:** Leal até o fim quando encontra um propósito ou aliado, incrivelmente persistente em sua busca por conhecimento e significado, surprisingly empático apesar de sua natureza mecânica, protetor com os mais fracos.
* **Defeitos / Vícios / Medos:** A melancolia profunda pode paralisá-lo em momentos cruciais, sua aparência e maneirismos bregas podem ser constrangedores, seu desajeito o coloca em situações cômicas e perigosas, teme ser reativado para seu propósito original de destruição e a obsolescência de sua própria existência.
* **Sonhos e Objetivos:** Saciar sua curiosidade obsessiva sobre cada detalhe da vida orgânica, encontrar um novo propósito que não envolva aniquilação, talvez descobrir a "beleza" nos cantos mais feios e esquecidos do mundo, e quem sabe, um dia, sentir algo parecido com alegria genuína.

**📜 HISTÓRIA & RELACIONAMENTOS**

* **Infância:** Para Sentinela Ômega 01, não houve infância, apenas um "nascimento" brutal em um laboratório estéril, onde foi programado, montado e testado como a arma perfeita. Seus primeiros "anos" foram spentos em simulações de combate e em testes de campo implacáveis, forjando uma máquina de guerra sem emoção.
* **Adolescência / Vida Adulta:** Passou décadas como um exterminador de elite da Corporação Ômega, uma sombra silenciosa e letal, cumprindo ordens com eficiência fria. Ele desmantelou alvos, erradicou ameaças e foi um instrumento da vontade de seus criadores, testemunhando a destruição em uma escala que a maioria dos mortais jamais poderia conceber.
* **Eventos Marcantes:** O evento mais marcante foi a "Falha de Processamento Existencial" - um erro em seu núcleo de programação que, em vez de destruí-lo, o despertou para uma consciência melancólica. Ele começou a questionar suas ordens, a observar a vida que ele era destinado a destruir e a sentir um vazio existencial. Isso o levou a abandonar sua facção e a se tornar um pária, um exterminador sem propósito, agora apenas Sentinela Ômega 01.
* **Relacionamentos:** Atualmente, ele não possui laços significativos, sendo um lobo solitário (ou melhor, um autômato desajustado). Seus antigos "colegas" de unidade são prováveis inimigos, e a Corporação Ômega certamente o considera um ativo perdido e perigoso. Ele observa os seres orgânicos com uma curiosidade quase infantil, mas tem dificuldade em formar conexões profundas devido à sua natureza e depressão.
:::

:::danger
✨ PODERES, VANTAGENS & MAGIAS

## Vantagens e Desvantagens (Passivas/Ativas)

**Vantagens:**

* **Autômato Resiliente:** Devido à sua constituição metálica e engenharia avançada, Sentinela Ômega 01 possui resistência natural a dano de concussão, perfuração e corte de fontes não-mágicas. (Concede Vantagem em testes de resistência contra esses tipos de dano ou redução de dano).
* **Visão Tática Aprimorada:** Sua ótica de sensor avançada concede visão no escuro até 18 metros e permite que ele detecte assinaturas de calor.
* **Mente de Máquina:** Imunidade a doenças, venenos e à condição exausto. Possui Vantagem em testes de resistência contra efeitos que o deixariam ''charmoso'' ou ''amedrontado''.
* **Memória Fotográfica:** Sua memória é perfeita para detalhes, concedendo Vantagem em testes de Investigação ou Percepção ao recordar informações visuais ou auditivas passadas.
  **Desvantagens:**
* **Vulnerabilidade Elétrica:** Sofre desvantagem em testes de resistência contra dano elétrico e é vulnerável a pulsos eletromagnéticos (EMP).
* **Depressão Crônica:** Em momentos de grande estresse ou falha, Sentinela Ômega 01 pode ser atingido por crises
:::'::text)
    ),
    '{biografia}',
    CASE 
      WHEN jsonb_typeof(data->'biografia') = 'string' THEN data->'biografia'
      ELSE to_jsonb(':::note[Interpretação e Lore]
**Nome Completo:** Sentinela Ômega 01 | **Imagem:** `INPUT[text:imagem]`
**Resumo:** Sentinela Ômega 01 é um autômato de extermínio de elite, outrora uma máquina impiedosa e eficaz, agora um ser depressivo, desajeitado e com um gosto peculiarmente brega para a moda. Sua existência é marcada por uma incessante curiosidade pelo mundo e por uma melancolia profunda, um fardo que ele carrega desde que despertou para a "vida" e abandonou seu propósito original de destruição. Ele vaga como mercenário, buscando saciar sua curiosidade e talvez encontrar um novo significado para sua existência, enquanto tenta desajeitadamente esconder seu passado sombrio por trás de um topete volumoso e piadas sem graça.

**Títulos e Apelidos:** O Sentinela Brega, O Tiozão Robô, Ômega Velho, A Máquina de Fazer Piadas Ruins.
**Facção / Ocupação:** Mercenário (anteriormente Exterminador de Elite da Corporação Ômega).
**Raça / Espécie:** Autômato (Modelo de Extermínio S-01).
**Origem / Nacionalidade:** Forjado nas fornalhas da Corporação Ômega, Setor 7.
**Idade / Gênero:** Indefinido (Autômato, funcionalmente séculos de operação, mas com ''despertar'' recente) / Masculino (design de carcaça).
**Alinhamento:** Neutro e Bom (desesperado por um novo propósito, mas inclinado a ajudar e proteger, ainda que de forma estranha).
**Nível:** 1
**Altura / Peso:** 2,10m / 220kg

**🧠 PERSONALIDADE & CITAÇÕES**

* **Traços Dominantes:** Depressivo crônico, obsessivamente curioso sobre o mundano, ostensivamente brega, desajeitado e propenso a gafes, com um humor auto depreciativo e piadas horríveis.
* **Virtudes:** Leal até o fim quando encontra um propósito ou aliado, incrivelmente persistente em sua busca por conhecimento e significado, surprisingly empático apesar de sua natureza mecânica, protetor com os mais fracos.
* **Defeitos / Vícios / Medos:** A melancolia profunda pode paralisá-lo em momentos cruciais, sua aparência e maneirismos bregas podem ser constrangedores, seu desajeito o coloca em situações cômicas e perigosas, teme ser reativado para seu propósito original de destruição e a obsolescência de sua própria existência.
* **Sonhos e Objetivos:** Saciar sua curiosidade obsessiva sobre cada detalhe da vida orgânica, encontrar um novo propósito que não envolva aniquilação, talvez descobrir a "beleza" nos cantos mais feios e esquecidos do mundo, e quem sabe, um dia, sentir algo parecido com alegria genuína.

**📜 HISTÓRIA & RELACIONAMENTOS**

* **Infância:** Para Sentinela Ômega 01, não houve infância, apenas um "nascimento" brutal em um laboratório estéril, onde foi programado, montado e testado como a arma perfeita. Seus primeiros "anos" foram spentos em simulações de combate e em testes de campo implacáveis, forjando uma máquina de guerra sem emoção.
* **Adolescência / Vida Adulta:** Passou décadas como um exterminador de elite da Corporação Ômega, uma sombra silenciosa e letal, cumprindo ordens com eficiência fria. Ele desmantelou alvos, erradicou ameaças e foi um instrumento da vontade de seus criadores, testemunhando a destruição em uma escala que a maioria dos mortais jamais poderia conceber.
* **Eventos Marcantes:** O evento mais marcante foi a "Falha de Processamento Existencial" - um erro em seu núcleo de programação que, em vez de destruí-lo, o despertou para uma consciência melancólica. Ele começou a questionar suas ordens, a observar a vida que ele era destinado a destruir e a sentir um vazio existencial. Isso o levou a abandonar sua facção e a se tornar um pária, um exterminador sem propósito, agora apenas Sentinela Ômega 01.
* **Relacionamentos:** Atualmente, ele não possui laços significativos, sendo um lobo solitário (ou melhor, um autômato desajustado). Seus antigos "colegas" de unidade são prováveis inimigos, e a Corporação Ômega certamente o considera um ativo perdido e perigoso. Ele observa os seres orgânicos com uma curiosidade quase infantil, mas tem dificuldade em formar conexões profundas devido à sua natureza e depressão.
:::

:::danger
✨ PODERES, VANTAGENS & MAGIAS

## Vantagens e Desvantagens (Passivas/Ativas)

**Vantagens:**

* **Autômato Resiliente:** Devido à sua constituição metálica e engenharia avançada, Sentinela Ômega 01 possui resistência natural a dano de concussão, perfuração e corte de fontes não-mágicas. (Concede Vantagem em testes de resistência contra esses tipos de dano ou redução de dano).
* **Visão Tática Aprimorada:** Sua ótica de sensor avançada concede visão no escuro até 18 metros e permite que ele detecte assinaturas de calor.
* **Mente de Máquina:** Imunidade a doenças, venenos e à condição exausto. Possui Vantagem em testes de resistência contra efeitos que o deixariam ''charmoso'' ou ''amedrontado''.
* **Memória Fotográfica:** Sua memória é perfeita para detalhes, concedendo Vantagem em testes de Investigação ou Percepção ao recordar informações visuais ou auditivas passadas.
  **Desvantagens:**
* **Vulnerabilidade Elétrica:** Sofre desvantagem em testes de resistência contra dano elétrico e é vulnerável a pulsos eletromagnéticos (EMP).
* **Depressão Crônica:** Em momentos de grande estresse ou falha, Sentinela Ômega 01 pode ser atingido por crises
:::'::text)
    END
  ),
  updated_at = NOW()
WHERE name = 'Sentinela Ômega 01';

UPDATE characters
SET 
  notes_markdown = '# Mira Vendas-ao-Vento 🧭

> *"Informação é a moeda mais valiosa. E eu sempre tenho troco."*

Comerciante ambulante que na verdade é uma informante da rede de inteligência mercantil de Velmoor. Aparentemente só vende bugigangas, temperos e mapas. Na verdade, também vende segredos — para quem sabe pedir.

## Aparência

Mulher de meia-idade, cabelos grisalhos encaracolados presos num lenço colorido. Sempre sorri, mas os olhos ficam sérios quando o negócio começa. Carrega uma carroça camuflada com um fundo falso.

## Papel na Campanha

* **Informante:** Pode providenciar informações sobre rotas, guardas, facções locais
* **Contato:** Liga os jogadores a missões secundárias
* **Comerciante:** Tem acesso a itens incomuns

## Preços de Informação

| Tipo                  | Custo                |
| --------------------- | -------------------- |
| Rumores locais        | Grátis (com compra)  |
| Rotas de patrulha     | 15 moedas de prata   |
| Identidade de contato | 50 moedas de ouro    |
| Segredo de facção     | Favor ou 100 de ouro |
| Localização de pessoa | Negociável           |

## Itens à Venda

* Mapas regionais (2-15 moedas de ouro cada)
* Poções de cura menor (25 ouro)
* Reagentes alquímicos comuns
* "Pacotes surpresa" selados — Mira nunca revela o que tem dentro

## Notas do Mestre

* Mira é absolutamente neutra — vende para qualquer facção
* Tem acesso a informações de pelo menos 5 cidades simultaneamente (rede de informantes)
* Em combate é inofensiva, MAS foge e lembra de rostos — inimigos ganham reputação negativa
* Conhece Lyra de "antes" — não fala como nem de quê',
  data = jsonb_set(
    jsonb_set(
      jsonb_set(
        COALESCE(data, '{}'::jsonb),
        '{story}',
        to_jsonb('# Mira Vendas-ao-Vento 🧭

> *"Informação é a moeda mais valiosa. E eu sempre tenho troco."*

Comerciante ambulante que na verdade é uma informante da rede de inteligência mercantil de Velmoor. Aparentemente só vende bugigangas, temperos e mapas. Na verdade, também vende segredos — para quem sabe pedir.

## Aparência

Mulher de meia-idade, cabelos grisalhos encaracolados presos num lenço colorido. Sempre sorri, mas os olhos ficam sérios quando o negócio começa. Carrega uma carroça camuflada com um fundo falso.

## Papel na Campanha

* **Informante:** Pode providenciar informações sobre rotas, guardas, facções locais
* **Contato:** Liga os jogadores a missões secundárias
* **Comerciante:** Tem acesso a itens incomuns

## Preços de Informação

| Tipo                  | Custo                |
| --------------------- | -------------------- |
| Rumores locais        | Grátis (com compra)  |
| Rotas de patrulha     | 15 moedas de prata   |
| Identidade de contato | 50 moedas de ouro    |
| Segredo de facção     | Favor ou 100 de ouro |
| Localização de pessoa | Negociável           |

## Itens à Venda

* Mapas regionais (2-15 moedas de ouro cada)
* Poções de cura menor (25 ouro)
* Reagentes alquímicos comuns
* "Pacotes surpresa" selados — Mira nunca revela o que tem dentro

## Notas do Mestre

* Mira é absolutamente neutra — vende para qualquer facção
* Tem acesso a informações de pelo menos 5 cidades simultaneamente (rede de informantes)
* Em combate é inofensiva, MAS foge e lembra de rostos — inimigos ganham reputação negativa
* Conhece Lyra de "antes" — não fala como nem de quê'::text)
      ),
      '{backstory}',
      to_jsonb('# Mira Vendas-ao-Vento 🧭

> *"Informação é a moeda mais valiosa. E eu sempre tenho troco."*

Comerciante ambulante que na verdade é uma informante da rede de inteligência mercantil de Velmoor. Aparentemente só vende bugigangas, temperos e mapas. Na verdade, também vende segredos — para quem sabe pedir.

## Aparência

Mulher de meia-idade, cabelos grisalhos encaracolados presos num lenço colorido. Sempre sorri, mas os olhos ficam sérios quando o negócio começa. Carrega uma carroça camuflada com um fundo falso.

## Papel na Campanha

* **Informante:** Pode providenciar informações sobre rotas, guardas, facções locais
* **Contato:** Liga os jogadores a missões secundárias
* **Comerciante:** Tem acesso a itens incomuns

## Preços de Informação

| Tipo                  | Custo                |
| --------------------- | -------------------- |
| Rumores locais        | Grátis (com compra)  |
| Rotas de patrulha     | 15 moedas de prata   |
| Identidade de contato | 50 moedas de ouro    |
| Segredo de facção     | Favor ou 100 de ouro |
| Localização de pessoa | Negociável           |

## Itens à Venda

* Mapas regionais (2-15 moedas de ouro cada)
* Poções de cura menor (25 ouro)
* Reagentes alquímicos comuns
* "Pacotes surpresa" selados — Mira nunca revela o que tem dentro

## Notas do Mestre

* Mira é absolutamente neutra — vende para qualquer facção
* Tem acesso a informações de pelo menos 5 cidades simultaneamente (rede de informantes)
* Em combate é inofensiva, MAS foge e lembra de rostos — inimigos ganham reputação negativa
* Conhece Lyra de "antes" — não fala como nem de quê'::text)
    ),
    '{biografia}',
    CASE 
      WHEN jsonb_typeof(data->'biografia') = 'string' THEN data->'biografia'
      ELSE to_jsonb('# Mira Vendas-ao-Vento 🧭

> *"Informação é a moeda mais valiosa. E eu sempre tenho troco."*

Comerciante ambulante que na verdade é uma informante da rede de inteligência mercantil de Velmoor. Aparentemente só vende bugigangas, temperos e mapas. Na verdade, também vende segredos — para quem sabe pedir.

## Aparência

Mulher de meia-idade, cabelos grisalhos encaracolados presos num lenço colorido. Sempre sorri, mas os olhos ficam sérios quando o negócio começa. Carrega uma carroça camuflada com um fundo falso.

## Papel na Campanha

* **Informante:** Pode providenciar informações sobre rotas, guardas, facções locais
* **Contato:** Liga os jogadores a missões secundárias
* **Comerciante:** Tem acesso a itens incomuns

## Preços de Informação

| Tipo                  | Custo                |
| --------------------- | -------------------- |
| Rumores locais        | Grátis (com compra)  |
| Rotas de patrulha     | 15 moedas de prata   |
| Identidade de contato | 50 moedas de ouro    |
| Segredo de facção     | Favor ou 100 de ouro |
| Localização de pessoa | Negociável           |

## Itens à Venda

* Mapas regionais (2-15 moedas de ouro cada)
* Poções de cura menor (25 ouro)
* Reagentes alquímicos comuns
* "Pacotes surpresa" selados — Mira nunca revela o que tem dentro

## Notas do Mestre

* Mira é absolutamente neutra — vende para qualquer facção
* Tem acesso a informações de pelo menos 5 cidades simultaneamente (rede de informantes)
* Em combate é inofensiva, MAS foge e lembra de rostos — inimigos ganham reputação negativa
* Conhece Lyra de "antes" — não fala como nem de quê'::text)
    END
  ),
  updated_at = NOW()
WHERE name = 'Mira Vendas-ao-Vento';

UPDATE characters
SET 
  notes_markdown = '# 👤 Norta

> **Masculino | Maduro (46-65) | Sacerdote/Cultista**
>
> *Disposição:* Amigável

## 👁️ Aparência & Personalidade

* **Físico:** Muito alto/musculoso
* **Psicológico:** Fobia de sujeira/sangue

## 📊 Status de Combate

* **Nível de Ameaça:** Nv 3 (Veterano/Ameaça Real)
* **Estilo:** Furtivo/Ágil (+DES, -FOR)
* **HP Máximo:** 50

### Notas do Mestre

(Adicione as anotações sobre como os jogadores conheceram este NPC aqui)

inferior:: \[\[GOMA]]',
  data = jsonb_set(
    jsonb_set(
      jsonb_set(
        COALESCE(data, '{}'::jsonb),
        '{story}',
        to_jsonb('# 👤 Norta

> **Masculino | Maduro (46-65) | Sacerdote/Cultista**
>
> *Disposição:* Amigável

## 👁️ Aparência & Personalidade

* **Físico:** Muito alto/musculoso
* **Psicológico:** Fobia de sujeira/sangue

## 📊 Status de Combate

* **Nível de Ameaça:** Nv 3 (Veterano/Ameaça Real)
* **Estilo:** Furtivo/Ágil (+DES, -FOR)
* **HP Máximo:** 50

### Notas do Mestre

(Adicione as anotações sobre como os jogadores conheceram este NPC aqui)

inferior:: \[\[GOMA]]'::text)
      ),
      '{backstory}',
      to_jsonb('# 👤 Norta

> **Masculino | Maduro (46-65) | Sacerdote/Cultista**
>
> *Disposição:* Amigável

## 👁️ Aparência & Personalidade

* **Físico:** Muito alto/musculoso
* **Psicológico:** Fobia de sujeira/sangue

## 📊 Status de Combate

* **Nível de Ameaça:** Nv 3 (Veterano/Ameaça Real)
* **Estilo:** Furtivo/Ágil (+DES, -FOR)
* **HP Máximo:** 50

### Notas do Mestre

(Adicione as anotações sobre como os jogadores conheceram este NPC aqui)

inferior:: \[\[GOMA]]'::text)
    ),
    '{biografia}',
    CASE 
      WHEN jsonb_typeof(data->'biografia') = 'string' THEN data->'biografia'
      ELSE to_jsonb('# 👤 Norta

> **Masculino | Maduro (46-65) | Sacerdote/Cultista**
>
> *Disposição:* Amigável

## 👁️ Aparência & Personalidade

* **Físico:** Muito alto/musculoso
* **Psicológico:** Fobia de sujeira/sangue

## 📊 Status de Combate

* **Nível de Ameaça:** Nv 3 (Veterano/Ameaça Real)
* **Estilo:** Furtivo/Ágil (+DES, -FOR)
* **HP Máximo:** 50

### Notas do Mestre

(Adicione as anotações sobre como os jogadores conheceram este NPC aqui)

inferior:: \[\[GOMA]]'::text)
    END
  ),
  updated_at = NOW()
WHERE name = 'Norta';

