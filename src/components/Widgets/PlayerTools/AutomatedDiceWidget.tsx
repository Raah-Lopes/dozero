// src/components/HUD/AutomatedDiceWidget.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { DraggableWindow } from '../../HUD/DraggableWindow';
import { pushChatMessage } from '../../../store';
import { saveMarkdownContent, loadMarkdownFile } from '../../../utils/githubApi';
import { usePersonagens, FichaPersonagem } from '../../../hooks/usePersonagens';
import * as yaml from 'js-yaml';
import { Dices, Swords, Target, Skull, ArrowRightCircle, ListOrdered, BookOpen } from 'lucide-react';

interface AutomatedDiceWidgetProps {
  onClose: () => void;
}

interface ItemIniciativa {
  id: string;
  nome: string;
  valor: number;
  ficha: FichaPersonagem;
}

export const AutomatedDiceWidget: React.FC<AutomatedDiceWidgetProps> = ({ onClose }) => {
  const { personagens, carregando, recarregar } = usePersonagens();
  
  // Abas
  const [abaAtual, setAbaAtual] = useState<'combate' | 'iniciativa' | 'elenco'>('combate');

  // Seleção
  const [atacante, setAtacante] = useState<FichaPersonagem | null>(null);
  const [defensor, setDefensor] = useState<FichaPersonagem | null>(null);
  
  // Fila Iniciativa
  const [fila, setFila] = useState<ItemIniciativa[]>([]);
  const [turnoAtual, setTurnoAtual] = useState<number>(0);

  // Sistema de Log
  const [resultados, setResultados] = useState<string[]>([]);
  const [cd, setCd] = useState(15);

  // Novos estados para a Expansão do Motor Tático
  const [mentalAtkPool, setMentalAtkPool] = useState<number | null>(null);
  const [mentalDefPool, setMentalDefPool] = useState<number | null>(null);
  const [disputeAttr, setDisputeAttr] = useState<string>('forca');
  const [danoAvulsoInput, setDanoAvulsoInput] = useState<string>('1d6');
  const [bonusTestInput, setBonusTestInput] = useState<string>('0');
  const [sistemaMode, setSistemaMode] = useState<'d20' | 'd100'>('d20');

  const adicionarLog = (msg: string, pushGlobal = true) => {
    setResultados((prev) => [...prev.slice(-49), msg]);
    if (pushGlobal) pushChatMessage(msg, false, false);
  };

  // Sincronizar os Pontos de Mente (Sanidade)
  useEffect(() => {
    if (atacante) {
      setMentalAtkPool((atacante.sabedoria + atacante.inteligencia) * 2 || 20);
    } else {
      setMentalAtkPool(null);
    }
  }, [atacante]);

  useEffect(() => {
    if (defensor) {
      setMentalDefPool((defensor.sabedoria + defensor.inteligencia) * 2 || 20);
    } else {
      setMentalDefPool(null);
    }
  }, [defensor]);

  // Auxiliares de Atributos e Rolagens
  const getMod = (val: number) => Math.floor((val - 10) / 2);
  const formatMod = (mod: number) => (mod >= 0 ? `+${mod}` : `${mod}`);

  const parseEffectBonus = (efeito?: string): number => {
    if (!efeito) return 0;
    const match = efeito.match(/(\d+)/);
    return match ? parseInt(match[0]) : 0;
  };

  const aplicarDanoDireto = async (alvo: FichaPersonagem, dano: number) => {
    const updated = { ...alvo };
    updated.pv = Math.max(0, updated.pv - dano);
    if (updated.pv === 0) {
      if (!updated.status_efeitos.includes('Morto')) {
        updated.status_efeitos = [...updated.status_efeitos, 'Morto'];
      }
    }
    await salvarFicha(updated);
    if (defensor && defensor.caminhoArquivo === updated.caminhoArquivo) {
      setDefensor(updated);
    }
    if (atacante && atacante.caminhoArquivo === updated.caminhoArquivo) {
      setAtacante(updated);
    }
    recarregar();
  };

  // Calcular Sucesso Híbrido (Pathfinder d20 / Call of Cthulhu d100)
  const calcularSucessoHibrido = (
    roll: number,
    target: number,
    modifier = 0,
    isD20 = true
  ): { grau: 'sucesso_critico' | 'sucesso' | 'falha' | 'falha_critica'; label: string; color: string } => {
    if (isD20) {
      const total = roll + modifier;
      const natural20 = roll === 20;
      const natural1 = roll === 1;
      
      let baseGrau: 'sucesso_critico' | 'sucesso' | 'falha' | 'falha_critica' = 'falha';
      
      if (total >= target) {
        baseGrau = (total >= target + 10) ? 'sucesso_critico' : 'sucesso';
      } else {
        baseGrau = (total <= target - 10) ? 'falha_critica' : 'falha';
      }
      
      let finalGrau = baseGrau;
      if (natural20) {
        if (baseGrau === 'falha_critica') finalGrau = 'falha';
        else if (baseGrau === 'falha') finalGrau = 'sucesso';
        else if (baseGrau === 'sucesso') finalGrau = 'sucesso_critico';
      } else if (natural1) {
        if (baseGrau === 'sucesso_critico') finalGrau = 'sucesso';
        else if (baseGrau === 'sucesso') finalGrau = 'falha';
        else if (baseGrau === 'falha') finalGrau = 'falha_critica';
      }
      
      const colors = {
        sucesso_critico: '#10b981',
        sucesso: '#34d399',
        falha: '#f87171',
        falha_critica: '#ef4444',
      };
      
      const labels = {
        sucesso_critico: '💥 SUCESSO CRÍTICO',
        sucesso: '✅ SUCESSO',
        falha: '❌ FALHA',
        falha_critica: '💀 FALHA CRÍTICA',
      };
      
      return { grau: finalGrau, label: labels[finalGrau], color: colors[finalGrau] };
    } else {
      // d100 Mode
      const targetPercent = target * 5;
      const ext = Math.floor(targetPercent / 5);
      
      let grau: 'sucesso_critico' | 'sucesso' | 'falha' | 'falha_critica' = 'falha';
      
      if (roll === 1 || roll <= ext) {
        grau = 'sucesso_critico';
      } else if (roll <= targetPercent) {
        grau = 'sucesso';
      } else if (roll >= 96) {
        grau = 'falha_critica';
      } else {
        grau = 'falha';
      }
      
      const colors = {
        sucesso_critico: '#10b981',
        sucesso: '#34d399',
        falha: '#f87171',
        falha_critica: '#ef4444',
      };
      
      const labels = {
        sucesso_critico: '💥 SUCESSO CRÍTICO (Extremo)',
        sucesso: '✅ SUCESSO',
        falha: '❌ FALHA',
        falha_critica: '💀 FALHA CRÍTICA (Desastre)',
      };
      
      return { grau, label: labels[grau], color: colors[grau] };
    }
  };

  // Funções de Rolagem Tática
  const rolarAtributo4DET = (nomeAtributo: string, valor: number, charNome: string) => {
    const isD20 = sistemaMode === 'd20';
    if (isD20) {
      const roll = Math.floor(Math.random() * 20) + 1;
      const mod = getMod(valor);
      const res = calcularSucessoHibrido(roll, cd, mod, true);
      adicionarLog(`🎲 **${charNome}** rola **${nomeAtributo.toUpperCase()}**: 1d20(${roll})${formatMod(mod)} = **${roll + mod}** vs CD ${cd}. [**${res.label}**]`, true);
    } else {
      const roll = Math.floor(Math.random() * 100) + 1;
      const chance = valor * 5;
      const res = calcularSucessoHibrido(roll, valor, 0, false);
      adicionarLog(`📊 **${charNome}** rola **${nomeAtributo.toUpperCase()} (d100)**: Rolou **${roll}** vs chance **${chance}%** (Atributo ${valor}). [**${res.label}**]`, true);
    }
  };

  const rolarAtributo3DT = (nomeAtributo: string, valor: number, charNome: string) => {
    const d6 = Math.floor(Math.random() * 6) + 1;
    const total = d6 + valor;
    adicionarLog(`🎲 Rolo Reto de **${nomeAtributo.toUpperCase()} (3D&T)** para **${charNome}**: 1d6(${d6}) + ${valor} = **${total}**`, true);
  };

  const rolarPericia = async (nomePericia: string, attrValor: number, charNome: string) => {
    const isD20 = sistemaMode === 'd20';
    let roll = 0;
    let total = 0;
    let res;
    
    if (isD20) {
      roll = Math.floor(Math.random() * 20) + 1;
      const mod = getMod(attrValor);
      total = roll + mod;
      res = calcularSucessoHibrido(roll, cd, mod, true);
    } else {
      roll = Math.floor(Math.random() * 100) + 1;
      total = roll;
      res = calcularSucessoHibrido(roll, attrValor, 0, false);
    }

    let logMsg = isD20
      ? `🤸‍♂️ **${charNome}** rola **${nomePericia}**: 1d20(${roll})${formatMod(getMod(attrValor))} = **${total}** vs CD ${cd}. [**${res.label}**]`
      : `🤸‍♂️ **${charNome}** rola **${nomePericia} (d100)**: Rolou **${roll}** vs chance **${attrValor * 5}%**. [**${res.label}**]`;

    adicionarLog(logMsg, true);

    // Efeitos ativos no combate baseados nos resultados das perícias
    if (nomePericia === 'Medicina') {
      const alvo = defensor || atacante;
      if (alvo) {
        const mod = getMod(attrValor);
        if (res.grau === 'sucesso_critico') {
          const healing = (Math.floor(Math.random() * 8) + 1) + (Math.floor(Math.random() * 8) + 1) + Math.max(0, mod);
          adicionarLog(`⚕️ **Medicina (Sucesso Crítico)**: Cura milagrosa em **${alvo.nome}** (+${healing} PV)!`, true);
          await aplicarDanoDireto(alvo, -healing);
        } else if (res.grau === 'sucesso') {
          const healing = (Math.floor(Math.random() * 8) + 1) + Math.max(0, mod);
          adicionarLog(`⚕️ **Medicina (Sucesso)**: Tratou ferimentos de **${alvo.nome}** (+${healing} PV).`, true);
          await aplicarDanoDireto(alvo, -healing);
        } else if (res.grau === 'falha_critica') {
          const dmg = Math.floor(Math.random() * 4) + 1;
          adicionarLog(`⚠️ **Medicina (Falha Crítica)**: Erro no procedimento! **${alvo.nome}** sofreu **${dmg}** de dano acidental.`, true);
          await aplicarDanoDireto(alvo, dmg);
        }
      }
    } else if (nomePericia === 'Acrobacia' && atacante) {
      const atk = { ...atacante };
      if (res.grau === 'sucesso_critico') {
        atk.status_efeitos = [...atk.status_efeitos.filter(e => !e.includes('Esquiva') && !e.includes('Desequilibrado')), 'Esquiva Crítica (+4 CA)'];
        adicionarLog(`🤸‍♂️ **Acrobacia (Sucesso Crítico)**: **${atk.nome}** executa manobra espetacular (+4 CA por 1 rodada)!`, true);
      } else if (res.grau === 'sucesso') {
        atk.status_efeitos = [...atk.status_efeitos.filter(e => !e.includes('Esquiva') && !e.includes('Desequilibrado')), 'Esquiva (+2 CA)'];
        adicionarLog(`🤸‍♂️ **Acrobacia (Sucesso)**: **${atk.nome}** se posiciona defensivamente (+2 CA por 1 rodada).`, true);
      } else if (res.grau === 'falha_critica') {
        atk.status_efeitos = [...atk.status_efeitos.filter(e => !e.includes('Esquiva') && !e.includes('Desequilibrado')), 'Desequilibrado (-2 CA)'];
        adicionarLog(`🤸‍♂️ **Acrobacia (Falha Crítica)**: **${atk.nome}** tropeçou e ficou vulnerável (-2 CA por 1 rodada)!`, true);
      }
      await salvarFicha(atk);
      setAtacante(atk);
      recarregar();
    } else if (nomePericia === 'Intimidação' && atacante && defensor) {
      if (res.grau === 'sucesso_critico') {
        const mindDmg = Math.floor(Math.random() * 6) + 1;
        adicionarLog(`🔥 **Intimidação (Sucesso Crítico)**: **${atacante.nome}** apavora **${defensor.nome}**! Aplica status *Confuso* e causa **${mindDmg}** de dano mental.`, true);
        const def = { ...defensor };
        if (!def.status_efeitos.includes('Confuso')) def.status_efeitos.push('Confuso');
        await salvarFicha(def);
        setDefensor(def);
        if (mentalDefPool !== null) setMentalDefPool(Math.max(0, mentalDefPool - mindDmg));
        recarregar();
      } else if (res.grau === 'sucesso') {
        const mindDmg = Math.floor(Math.random() * 3) + 1;
        adicionarLog(`🔥 **Intimidação (Sucesso)**: **${atacante.nome}** assusta **${defensor.nome}** (causa **${mindDmg}** de dano mental).`, true);
        if (mentalDefPool !== null) setMentalDefPool(Math.max(0, mentalDefPool - mindDmg));
      } else if (res.grau === 'falha_critica') {
        adicionarLog(`⚠️ **Intimidação (Falha Crítica)**: O contra-ataque de presença intimida o próprio **${atacante.nome}** (-2 em ataques)!`, true);
        const atk = { ...atacante };
        if (!atk.status_efeitos.includes('Amedrontado')) atk.status_efeitos.push('Amedrontado');
        await salvarFicha(atk);
        setAtacante(atk);
        recarregar();
      }
    }
  };

  const rolarAtaqueDesarmado = () => {
    if (!atacante) return;
    const isD20 = sistemaMode === 'd20';
    const target = defensor ? defensor.defesa : cd;
    
    let roll = 0;
    let toHit = 0;
    let res;
    
    if (isD20) {
      roll = Math.floor(Math.random() * 20) + 1;
      const mod = getMod(atacante.forca);
      toHit = roll + mod;
      res = calcularSucessoHibrido(roll, target, mod, true);
    } else {
      roll = Math.floor(Math.random() * 100) + 1;
      toHit = roll;
      res = calcularSucessoHibrido(roll, atacante.forca, 0, false);
    }

    const dmgVal = Math.floor(Math.random() * 3) + 1;
    let totalDmg = Math.max(1, dmgVal + getMod(atacante.forca));
    if (res.grau === 'sucesso_critico') totalDmg *= 2;

    let logStr = isD20
      ? `⚔️ **Ataque Desarmado** de **${atacante.nome}**: Acerto 1d20(${roll})${formatMod(getMod(atacante.forca))} = **${toHit}** vs Defesa ${target}. [**${res.label}**]`
      : `⚔️ **Ataque Desarmado (d100)** de **${atacante.nome}**: Rolou **${roll}** vs chance **${atacante.forca * 5}%** (FOR). [**${res.label}**]`;

    if (res.grau === 'sucesso' || res.grau === 'sucesso_critico') {
      logStr += ` ✅ Causa **${totalDmg}** de dano contundente.`;
      if (defensor) aplicarDanoDireto(defensor, totalDmg);
    } else {
      logStr += ` 🛡️ Errou!`;
    }
    adicionarLog(logStr, true);
  };

  const rolarPedraDistancia = () => {
    if (!atacante) return;
    const isD20 = sistemaMode === 'd20';
    const target = defensor ? defensor.defesa : cd;
    
    let roll = 0;
    let toHit = 0;
    let res;
    
    if (isD20) {
      roll = Math.floor(Math.random() * 20) + 1;
      const mod = getMod(atacante.destreza);
      toHit = roll + mod;
      res = calcularSucessoHibrido(roll, target, mod, true);
    } else {
      roll = Math.floor(Math.random() * 100) + 1;
      toHit = roll;
      res = calcularSucessoHibrido(roll, atacante.destreza, 0, false);
    }

    const dmgVal = Math.floor(Math.random() * 4) + 1;
    let totalDmg = Math.max(1, dmgVal + getMod(atacante.destreza));
    if (res.grau === 'sucesso_critico') totalDmg *= 2;

    let logStr = isD20
      ? `🎯 **Pedra à Distância** de **${atacante.nome}**: Acerto 1d20(${roll})${formatMod(getMod(atacante.destreza))} = **${toHit}** vs Defesa ${target}. [**${res.label}**]`
      : `🎯 **Pedra à Distância (d100)** de **${atacante.nome}**: Rolou **${roll}** vs chance **${atacante.destreza * 5}%** (DES). [**${res.label}**]`;

    if (res.grau === 'sucesso' || res.grau === 'sucesso_critico') {
      logStr += ` ✅ Causa **${totalDmg}** de dano por esmagamento.`;
      if (defensor) aplicarDanoDireto(defensor, totalDmg);
    } else {
      logStr += ` 🛡️ Errou!`;
    }
    adicionarLog(logStr, true);
  };

  const rolarMagiaBasica = async () => {
    if (!atacante) return;
    if (atacante.mana < 1) {
      alert("Mana insuficiente!");
      return;
    }

    const a = { ...atacante };
    a.mana = Math.max(0, a.mana - 1);
    await salvarFicha(a);
    setAtacante(a);
    recarregar();

    const isD20 = sistemaMode === 'd20';
    const target = defensor ? defensor.defesa : cd;
    
    let roll = 0;
    let toHit = 0;
    let res;
    
    if (isD20) {
      roll = Math.floor(Math.random() * 20) + 1;
      const mod = getMod(a.inteligencia);
      toHit = roll + mod;
      res = calcularSucessoHibrido(roll, target, mod, true);
    } else {
      roll = Math.floor(Math.random() * 100) + 1;
      toHit = roll;
      res = calcularSucessoHibrido(roll, a.inteligencia, 0, false);
    }

    const dmgVal = Math.floor(Math.random() * 6) + 1;
    let totalDmg = Math.max(1, dmgVal + getMod(a.inteligencia));
    if (res.grau === 'sucesso_critico') totalDmg *= 2;

    let logStr = isD20
      ? `✨ **Magia Básica** de **${a.nome}** (Gasta 1 PM): Acerto 1d20(${roll})${formatMod(getMod(a.inteligencia))} = **${toHit}** vs Defesa ${target}. [**${res.label}**]`
      : `✨ **Magia Básica (d100)** de **${a.nome}** (Gasta 1 PM): Rolou **${roll}** vs chance **${a.inteligencia * 5}%** (INT). [**${res.label}**]`;

    if (res.grau === 'sucesso' || res.grau === 'sucesso_critico') {
      logStr += ` ✅ Causa **${totalDmg}** de dano mágico.`;
      if (defensor) aplicarDanoDireto(defensor, totalDmg);
    } else {
      logStr += ` 🛡️ Errou!`;
    }
    adicionarLog(logStr, true);
  };

  const rolarAtaqueArea = () => {
    if (!atacante) return;
    const dmg = Math.floor(Math.random() * 6) + 1 + Math.floor(atacante.nivel / 2);
    adicionarLog(`💥 **Ataque em Área** de **${atacante.nome}**: Rola 1d6+${Math.floor(atacante.nivel/2)} = **${dmg}** de dano em área! Todos os alvos na zona devem rolar resistência (CD ${10 + getMod(atacante.inteligencia || atacante.destreza)}).`, true);
  };

  const rolarArmaEquipada = (item: any) => {
    if (!atacante) return;
    const isD20 = sistemaMode === 'd20';
    const target = defensor ? defensor.defesa : cd;
    const bonus = parseEffectBonus(item.efeito);
    
    let roll = 0;
    let toHit = 0;
    let res;
    
    if (isD20) {
      roll = Math.floor(Math.random() * 20) + 1;
      const mod = getMod(atacante.forca) + bonus;
      toHit = roll + mod;
      res = calcularSucessoHibrido(roll, target, mod, true);
    } else {
      roll = Math.floor(Math.random() * 100) + 1;
      toHit = roll;
      res = calcularSucessoHibrido(roll, atacante.forca + bonus, 0, false);
    }

    const weaponDmg = Math.floor(Math.random() * 8) + 1;
    let totalDmg = Math.max(1, weaponDmg + getMod(atacante.forca));
    if (res.grau === 'sucesso_critico') totalDmg *= 2;

    let logStr = isD20
      ? `⚔️ **Ataque com ${item.nome}** de **${atacante.nome}**: Acerto 1d20(${roll})${formatMod(getMod(atacante.forca))}+${bonus} = **${toHit}** vs Defesa ${target}. [**${res.label}**]`
      : `⚔️ **Ataque com ${item.nome} (d100)** de **${atacante.nome}**: Rolou **${roll}** vs chance **${(atacante.forca + bonus) * 5}%**. [**${res.label}**]`;

    if (res.grau === 'sucesso' || res.grau === 'sucesso_critico') {
      logStr += ` ✅ Causa **${totalDmg}** de dano.`;
      if (defensor) aplicarDanoDireto(defensor, totalDmg);
    } else {
      logStr += ` 🛡️ Errou!`;
    }
    adicionarLog(logStr, true);
  };

  // Disputa de Atributo (Atk vs Def)
  const rolarDisputaAtributos = () => {
    if (!atacante || !defensor) {
      alert("Selecione Atacante e Defensor para rolar disputa!");
      return;
    }
    
    const attrKey = disputeAttr as keyof FichaPersonagem;
    const valAtk = Number(atacante[attrKey]) || 10;
    const valDef = Number(defensor[attrKey]) || 10;

    const isD20 = sistemaMode === 'd20';
    if (isD20) {
      const modAtk = getMod(valAtk);
      const modDef = getMod(valDef);

      const d20Atk = Math.floor(Math.random() * 20) + 1;
      const d20Def = Math.floor(Math.random() * 20) + 1;

      const totalAtk = d20Atk + modAtk;
      const totalDef = d20Def + modDef;

      let vencedor = "";
      if (totalAtk > totalDef) vencedor = `🏆 **${atacante.nome}** vence!`;
      else if (totalDef > totalAtk) vencedor = `🏆 **${defensor.nome}** vence!`;
      else vencedor = `🤝 **Empate!**`;

      adicionarLog(`⚔️ **Disputa de ${disputeAttr.toUpperCase()}**:
- **${atacante.nome}**: 1d20(${d20Atk})${formatMod(modAtk)} = **${totalAtk}**
- **${defensor.nome}**: 1d20(${d20Def})${formatMod(modDef)} = **${totalDef}**
${vencedor}`, true);
    } else {
      const rollAtk = Math.floor(Math.random() * 100) + 1;
      const rollDef = Math.floor(Math.random() * 100) + 1;

      const resAtk = calcularSucessoHibrido(rollAtk, valAtk, 0, false);
      const resDef = calcularSucessoHibrido(rollDef, valDef, 0, false);

      const hierarchy = {
        sucesso_critico: 4,
        sucesso: 3,
        falha: 2,
        falha_critica: 1
      };

      const scoreAtk = hierarchy[resAtk.grau];
      const scoreDef = hierarchy[resDef.grau];

      let vencedor = "";
      if (scoreAtk > scoreDef) {
        vencedor = `🏆 **${atacante.nome}** vence (grau de sucesso superior)!`;
      } else if (scoreDef > scoreAtk) {
        vencedor = `🏆 **${defensor.nome}** vence (grau de sucesso superior)!`;
      } else {
        if (valAtk > valDef) {
          vencedor = `🏆 **${atacante.nome}** vence (maior valor de atributo: ${valAtk} vs ${valDef})!`;
        } else if (valDef > valAtk) {
          vencedor = `🏆 **${defensor.nome}** vence (maior valor de atributo: ${valDef} vs ${valAtk})!`;
        } else {
          if (rollAtk < rollDef) {
            vencedor = `🏆 **${atacante.nome}** vence (menor rolagem no d100: ${rollAtk} vs ${rollDef})!`;
          } else if (rollDef < rollAtk) {
            vencedor = `🏆 **${defensor.nome}** vence (menor rolagem no d100: ${rollDef} vs ${rollAtk})!`;
          } else {
            vencedor = `🤝 **Empate absoluto!**`;
          }
        }
      }

      adicionarLog(`⚔️ **Disputa de ${disputeAttr.toUpperCase()} (d100)**:
- **${atacante.nome}**: Rolou **${rollAtk}** vs chance **${valAtk * 5}%** (Atributo ${valAtk}). [**${resAtk.label}**]
- **${defensor.nome}**: Rolou **${rollDef}** vs chance **${valDef * 5}%** (Atributo ${valDef}). [**${resDef.label}**]
${vencedor}`, true);
    }
  };

  // Combate Mental
  const rolarCombateMental = () => {
    if (!atacante || !defensor || mentalAtkPool === null || mentalDefPool === null) {
      alert("Selecione Atacante e Defensor para o combate mental!");
      return;
    }

    if (mentalAtkPool <= 0) {
      alert(`A mente de ${atacante.nome} já está quebrada!`);
      return;
    }
    if (mentalDefPool <= 0) {
      alert(`A mente de ${defensor.nome} já está quebrada!`);
      return;
    }

    const isD20 = sistemaMode === 'd20';
    if (isD20) {
      const d20Atk = Math.floor(Math.random() * 20) + 1;
      const d20Def = Math.floor(Math.random() * 20) + 1;

      const modAtk = getMod(atacante.inteligencia);
      const modDef = getMod(defensor.inteligencia);

      const totalAtk = d20Atk + modAtk;
      const totalDef = d20Def + modDef;

      let logStr = `🧠 **Combate Mental (INT vs INT)**:
- **Atacante ${atacante.nome}**: 1d20(${d20Atk})${formatMod(modAtk)} = **${totalAtk}**
- **Defensor ${defensor.nome}**: 1d20(${d20Def})${formatMod(modDef)} = **${totalDef}**
`;

      if (totalAtk > totalDef) {
        const dmg = Math.floor(Math.random() * 6) + 1 + Math.max(0, modAtk);
        const newDefPool = Math.max(0, mentalDefPool - dmg);
        setMentalDefPool(newDefPool);
        logStr += `💥 **${atacante.nome}** vence e inflige **${dmg}** de dano mental! Mente de **${defensor.nome}**: **${newDefPool}** HP Mental.`;
        if (newDefPool === 0) {
          logStr += ` ☠️ **A mente de ${defensor.nome} foi QUEBRADA!**`;
        }
      } else if (totalDef > totalAtk) {
        const dmg = Math.floor(Math.random() * 6) + 1 + Math.max(0, modDef);
        const newAtkPool = Math.max(0, mentalAtkPool - dmg);
        setMentalAtkPool(newAtkPool);
        logStr += `💥 **${defensor.nome}** vence e inflige **${dmg}** de dano mental de contra-ataque! Mente de **${atacante.nome}**: **${newAtkPool}** HP Mental.`;
        if (newAtkPool === 0) {
          logStr += ` ☠️ **A mente de ${atacante.nome} foi QUEBRADA!**`;
        }
      } else {
        logStr += `🤝 Ambos resistem mentalmente! Sem dano.`;
      }

      adicionarLog(logStr, true);
    } else {
      const rollAtk = Math.floor(Math.random() * 100) + 1;
      const rollDef = Math.floor(Math.random() * 100) + 1;

      const resAtk = calcularSucessoHibrido(rollAtk, atacante.inteligencia, 0, false);
      const resDef = calcularSucessoHibrido(rollDef, defensor.inteligencia, 0, false);

      const hierarchy = {
        sucesso_critico: 4,
        sucesso: 3,
        falha: 2,
        falha_critica: 1
      };

      const scoreAtk = hierarchy[resAtk.grau];
      const scoreDef = hierarchy[resDef.grau];

      let logStr = `🧠 **Combate Mental (INT vs INT - d100)**:
- **Atacante ${atacante.nome}**: Rolou **${rollAtk}** vs chance **${atacante.inteligencia * 5}%** (INT ${atacante.inteligencia}). [**${resAtk.label}**]
- **Defensor ${defensor.nome}**: Rolou **${rollDef}** vs chance **${defensor.inteligencia * 5}%** (INT ${defensor.inteligencia}). [**${resDef.label}**]
`;

      const modAtk = getMod(atacante.inteligencia);
      const modDef = getMod(defensor.inteligencia);

      if (scoreAtk > scoreDef) {
        const dmg = Math.floor(Math.random() * 6) + 1 + Math.max(0, modAtk);
        const newDefPool = Math.max(0, mentalDefPool - dmg);
        setMentalDefPool(newDefPool);
        logStr += `💥 **${atacante.nome}** vence e inflige **${dmg}** de dano mental! Mente de **${defensor.nome}**: **${newDefPool}** HP Mental.`;
        if (newDefPool === 0) {
          logStr += ` ☠️ **A mente de ${defensor.nome} foi QUEBRADA!**`;
        }
      } else if (scoreDef > scoreAtk) {
        const dmg = Math.floor(Math.random() * 6) + 1 + Math.max(0, modDef);
        const newAtkPool = Math.max(0, mentalAtkPool - dmg);
        setMentalAtkPool(newAtkPool);
        logStr += `💥 **${defensor.nome}** vence e inflige **${dmg}** de dano mental de contra-ataque! Mente de **${atacante.nome}**: **${newAtkPool}** HP Mental.`;
        if (newAtkPool === 0) {
          logStr += ` ☠️ **A mente de ${atacante.nome} foi QUEBRADA!**`;
        }
      } else {
        logStr += `🤝 Ambos resistem mentalmente! Sem dano.`;
      }

      adicionarLog(logStr, true);
    }
  };

  // Alternar Condições do Defensor
  const alternarCondicaoDefensor = async (condicao: string) => {
    if (!defensor) return;
    const def = { ...defensor };
    const jaTem = def.status_efeitos.some(e => e.toLowerCase() === condicao.toLowerCase());
    
    if (jaTem) {
      def.status_efeitos = def.status_efeitos.filter(e => e.toLowerCase() !== condicao.toLowerCase());
    } else {
      def.status_efeitos = [...def.status_efeitos, condicao];
    }
    
    await salvarFicha(def);
    setDefensor(def);
    recarregar();
    adicionarLog(`🩺 Condição **${condicao}** ${jaTem ? 'removida de' : 'aplicada em'} **${def.nome}**`, true);
  };

  // Ações de Inventário do Atacante
  const alternarEquipamentoAttacker = async (itemIdx: number) => {
    if (!atacante) return;
    const atk = { ...atacante };
    if (!atk.inventario[itemIdx]) return;
    
    const item = atk.inventario[itemIdx];
    item.equipado = !item.equipado;
    
    await salvarFicha(atk);
    setAtacante(atk);
    recarregar();
    adicionarLog(`🎒 **${atacante.nome}** ${item.equipado ? 'equipou' : 'desequipou'} **${item.nome}**`, true);
  };

  const usarConsumivelAttacker = async (itemIdx: number) => {
    if (!atacante) return;
    const atk = { ...atacante };
    if (!atk.inventario[itemIdx]) return;
    
    const item = atk.inventario[itemIdx];
    if (item.quantidade <= 0) return;
    
    item.quantidade -= 1;
    let logEfeito = `🎒 **${atacante.nome}** consumiu **${item.nome}**`;
    
    if (item.efeito && item.efeito.startsWith('heal_')) {
      const healVal = parseEffectBonus(item.efeito);
      const curado = Math.min(healVal, atk.pv_max - atk.pv);
      atk.pv += curado;
      logEfeito += `. Recuperou +${curado} PV (HP atual: ${atk.pv}/${atk.pv_max})`;
    }
    
    if (item.quantidade === 0) {
      atk.inventario = atk.inventario.filter((_, idx) => idx !== itemIdx);
    }
    
    await salvarFicha(atk);
    setAtacante(atk);
    recarregar();
    adicionarLog(logEfeito, true);
  };

  const handleItemActionAttacker = async (listName: string, itemIdx: number, action: 'usar' | 'equipar' | 'conjurar') => {
    if (!atacante) return;
    const atk = { ...atacante };
    const list = (atk as any)[listName];
    if (!list || !list[itemIdx]) return;
    const item = list[itemIdx];

    if (action === 'usar') {
      const qty = item.quantidade !== undefined ? Number(item.quantidade) : 1;
      if (qty > 0) {
        if (item.quantidade !== undefined) {
          item.quantidade -= 1;
        } else {
          list.splice(itemIdx, 1);
        }

        const efeito = String(item.efeito || '').toLowerCase();
        let logEfeito = `🎒 **${atk.nome}** consumiu **${item.nome}**`;
        
        if (efeito.startsWith('heal_') || efeito.startsWith('cura_')) {
          const val = parseInt(efeito.split('_')[1], 10) || 10;
          const curado = Math.min(val, atk.pv_max - atk.pv);
          atk.pv += curado;
          logEfeito += `. Recuperou +${curado} PV (HP atual: ${atk.pv}/${atk.pv_max})`;
        } else if (efeito.startsWith('mana_') || efeito.startsWith('pm_')) {
          const val = parseInt(efeito.split('_')[1], 10) || 10;
          const recovered = Math.min(val, atk.mana_max - atk.mana);
          atk.mana += recovered;
          logEfeito += `. Recuperou +${recovered} Mana (Mana atual: ${atk.mana}/${atk.mana_max})`;
        } else if (efeito.startsWith('energia_') || efeito.startsWith('vigor_')) {
          const val = parseInt(efeito.split('_')[1], 10) || 10;
          const recovered = Math.min(val, atk.energia_max - atk.energia);
          atk.energia += recovered;
          logEfeito += `. Recuperou +${recovered} Energia (Energia atual: ${atk.energia}/${atk.energia_max})`;
        } else if (efeito.startsWith('sanidade_') || efeito.startsWith('mente_')) {
          const val = parseInt(efeito.split('_')[1], 10) || 10;
          const recovered = Math.min(val, atk.sanidade_max - atk.sanidade);
          atk.sanidade += recovered;
          logEfeito += `. Recuperou +${recovered} Sanidade (Sanidade atual: ${atk.sanidade}/${atk.sanidade_max})`;
        }

        if (item.quantidade <= 0) {
          list.splice(itemIdx, 1);
        }

        await salvarFicha(atk);
        setAtacante(atk);
        recarregar();
        adicionarLog(logEfeito, true);
      }
    } else if (action === 'equipar') {
      item.equipado = !item.equipado;
      const efeito = String(item.efeito || '').toLowerCase();
      let logEfeito = `🎒 **${atk.nome}** ${item.equipado ? 'equipou' : 'desequipou'} **${item.nome}**`;

      if (efeito.startsWith('defesa_') || efeito.startsWith('armadura_')) {
        const defVal = parseInt(efeito.split('_')[1], 10) || 2;
        atk.defesa = item.equipado ? (atk.defesa || 10) + defVal : (atk.defesa || 10) - defVal;
        logEfeito += ` (+${defVal} Defesa)`;
      } else if (efeito.startsWith('ataque_')) {
        const atkVal = parseInt(efeito.split('_')[1], 10) || 2;
        atk.ataque = item.equipado ? (atk.ataque || 10) + atkVal : (atk.ataque || 10) - atkVal;
        logEfeito += ` (+${atkVal} Ataque)`;
      }

      await salvarFicha(atk);
      setAtacante(atk);
      recarregar();
      adicionarLog(logEfeito, true);
    } else if (action === 'conjurar') {
      const custoMatch = String(item.custo || '').match(/(\d+)/);
      const custoVal = custoMatch ? parseInt(custoMatch[0], 10) : 0;
      
      if (custoVal > 0 && atk.mana < custoVal) {
        alert("Mana insuficiente para conjurar!");
        return;
      }

      if (custoVal > 0) {
        atk.mana = Math.max(0, atk.mana - custoVal);
      }

      const danoMatch = String(item.efeito || '').match(/dano_(\w+)/);
      const danoExpr = danoMatch ? danoMatch[1] : '1d6';
      
      await salvarFicha(atk);
      setAtacante(atk);
      recarregar();
      adicionarLog(`✨ **${atk.nome}** conjurou **${item.nome}**! (Gasto: ${item.custo || '0 PM'})\n*${item.descricao}*\n🎲 Dano sugerido: **${danoExpr}**`, true);
    }
  };

  // Rolagens Avulsas
  const rolarDanoAvulso = () => {
    try {
      const expression = danoAvulsoInput.trim().toLowerCase();
      const parts = expression.split('+');
      const dicePart = parts[0];
      const modifier = parts[1] ? parseInt(parts[1]) : 0;
      
      const diceMatch = dicePart.match(/(\d+)d(\d+)/);
      if (!diceMatch) {
        const val = parseInt(expression);
        if (!isNaN(val)) {
          adicionarLog(`🎲 Dano avulso rolado: **${val}**`, true);
        } else {
          alert("Expressão de dano inválida. Use ex: 1d6, 2d8+4");
        }
        return;
      }
      
      const qtd = parseInt(diceMatch[1]);
      const faces = parseInt(diceMatch[2]);
      
      let sum = 0;
      const rolls = [];
      for (let i = 0; i < qtd; i++) {
        const roll = Math.floor(Math.random() * faces) + 1;
        rolls.push(roll);
        sum += roll;
      }
      
      const total = sum + modifier;
      let logStr = `🎲 Rolo de Dano Avulso (${expression}): [${rolls.join(', ')}]`;
      if (modifier > 0) logStr += ` + ${modifier}`;
      logStr += ` = **${total}**`;
      
      if (defensor) {
        logStr += ` aplicado a **${defensor.nome}**.`;
        aplicarDanoDireto(defensor, total);
      }
      
      adicionarLog(logStr, true);
    } catch(e) {
      alert("Erro ao rolar dano. Use formato ex: 1d6, 2d8+3");
    }
  };

  const aplicarMorteDireta = async () => {
    if (!defensor) {
      alert("Selecione um defensor!");
      return;
    }
    if (!confirm(`Deseja realmente aplicar Morte Direta em ${defensor.nome}?`)) return;
    const def = { ...defensor };
    def.pv = 0;
    if (!def.status_efeitos.includes('Morto')) {
      def.status_efeitos = [...def.status_efeitos, 'Morto'];
    }
    await salvarFicha(def);
    setDefensor(def);
    recarregar();
    adicionarLog(`☠️ **Morte Direta** aplicada a **${def.nome}** (HP zerado e status Morto adicionado).`, true);
  };

  const rolarD20Generico = () => {
    const isD20 = sistemaMode === 'd20';
    if (isD20) {
      const d20 = Math.floor(Math.random() * 20) + 1;
      adicionarLog(`🎲 Teste Genérico (d20): rolou **${d20}**`, true);
    } else {
      const d100 = Math.floor(Math.random() * 100) + 1;
      adicionarLog(`📊 Teste Genérico (d100): rolou **${d100}**`, true);
    }
  };

  const rolarTesteBonus = () => {
    const isD20 = sistemaMode === 'd20';
    const bonus = parseInt(bonusTestInput) || 0;
    if (isD20) {
      const d20 = Math.floor(Math.random() * 20) + 1;
      const total = d20 + bonus;
      adicionarLog(`🎲 Teste com Bônus (1d20 ${formatMod(bonus)}): rolou 1d20(${d20}) ${formatMod(bonus)} = **${total}**`, true);
    } else {
      const d100 = Math.floor(Math.random() * 100) + 1;
      const total = d100 + bonus;
      adicionarLog(`📊 Teste com Modificador (1d100 ${formatMod(bonus)}): rolou 1d100(${d100}) ${formatMod(bonus)} = **${total}**`, true);
    }
  };

  const salvarFicha = async (ficha: FichaPersonagem) => {
    try {
      const originalMd = await loadMarkdownFile(ficha.caminhoArquivo);
      if (originalMd) {
        const textParts = originalMd.split('---');
        if (textParts.length >= 3) {
          const frontmatterStr = textParts[1];
          const data = yaml.load(frontmatterStr) as any || {};
          
          // Mapeamento dos valores de volta para os campos do Obsidian
          data.HP = ficha.pv;
          data.HP_max = ficha.pv_max;
          data.PM = ficha.mana;
          data.PM_max = ficha.mana_max;
          data.usos_cura_atual = ficha.usos_cura;
          data.status_efeitos = ficha.status_efeitos;
          data.saqueado = ficha.saqueado;
          
          data.energia = ficha.energia;
          data.energia_max = ficha.energia_max;
          data.sanidade = ficha.sanidade;
          data.sanidade_max = ficha.sanidade_max;
          data.fome = ficha.fome;
          data.fome_max = ficha.fome_max;
          data.sede = ficha.sede;
          data.sede_max = ficha.sede_max;
          data.cansaco = ficha.cansaco;
          data.cansaco_max = ficha.cansaco_max;
          data.defesa = ficha.defesa;
          data.riquezas = ficha.riquezas;
          data.armas = ficha.armas;
          data.poderes = ficha.poderes;
          data.pocoes = ficha.pocoes;
          data.maldicoes = ficha.maldicoes;
          data.objetos_campanha = ficha.objetos_campanha;
          
          if (data.tipo === 'Monstro') {
            data.Ouro_recompensa = ficha.ouro;
            data.XP_recompensa = ficha.xp;
          } else {
            data.Ouro = ficha.ouro;
            data.XP = ficha.xp;
          }

          const novaFront = '---\n' + yaml.dump(data) + '---\n';
          const body = textParts.slice(2).join('---');
          await saveMarkdownContent(ficha.caminhoArquivo, novaFront + body);
        }
      }
    } catch (e) {
      console.error('Falha ao salvar ficha:', e);
    }
  };

  // =====================
  // MOTORES TÁTICOS (D20)
  // =====================

  const rolarIniciativaGeral = () => {
    const todosEnvolvidos = [atacante, defensor].filter(Boolean) as FichaPersonagem[];
    if (todosEnvolvidos.length === 0) {
      alert("Selecione pelo menos um atacante ou defensor na aba Combate para rolar iniciativa!");
      return;
    }
    
    // Na falta de seleção múltipla, puxa todos que não são NPCs mortos
    const envolvidos = personagens.filter(p => p.pv > 0);
    
    const novaFila: ItemIniciativa[] = envolvidos.map(p => {
      const d20 = Math.floor(Math.random() * 20) + 1;
      const modificador = Math.floor(p.velocidade / 2);
      return { id: p.caminhoArquivo, nome: p.nome, valor: d20 + modificador, ficha: p };
    }).sort((a, b) => b.valor - a.valor); // Decrescente

    setFila(novaFila);
    setTurnoAtual(0);
    adicionarLog(`🏃‍♂️ Iniciativa rolada para ${novaFila.length} combatentes! Ação para: ${novaFila[0].nome}.`, true);
  };

  const proximoTurno = async () => {
    if (fila.length === 0) return;
    let nextIndex = turnoAtual + 1;
    if (nextIndex >= fila.length) {
      nextIndex = 0;
      adicionarLog(`🔄 Nova Rodada!`);
    }
    setTurnoAtual(nextIndex);
    const combatente = fila[nextIndex];

    // Processamento de Status Automático
    let msgEfeitos = "";
    const f = personagens.find(p => p.caminhoArquivo === combatente.id) || combatente.ficha;
    const atualizada = { ...f };
    let tomouDano = false;

    if (atualizada.status_efeitos && atualizada.status_efeitos.length > 0) {
      let danoPassivo = 0;
      const stringsEfeitos = atualizada.status_efeitos.map(e => e.toLowerCase());
      
      if (stringsEfeitos.some(e => e.includes('fogo') || e.includes('chamas'))) {
        danoPassivo += Math.floor(Math.random() * 4) + 1; // 1d4
      }
      if (stringsEfeitos.some(e => e.includes('sangra'))) {
        danoPassivo += Math.floor(Math.random() * 3) + 1; // 1d3
      }
      if (stringsEfeitos.some(e => e.includes('veneno') || e.includes('envenenado'))) {
        danoPassivo += Math.floor(Math.random() * 6) + 1; // 1d6
      }

      if (danoPassivo > 0) {
        atualizada.pv = Math.max(0, atualizada.pv - danoPassivo);
        tomouDano = true;
        msgEfeitos = `⚠️ ${atualizada.nome} sofreu ${danoPassivo} de dano por efeitos contínuos!`;
        if (atualizada.pv === 0) {
          if (!atualizada.status_efeitos.includes('Morto')) atualizada.status_efeitos.push('Morto');
          msgEfeitos += " Caiu morto.";
        }
      }
    }

    if (tomouDano) {
      await salvarFicha(atualizada);
      recarregar();
      adicionarLog(msgEfeitos);
    }

    adicionarLog(`👉 Turno atual: ${combatente.nome}`, false);
  };

    const __executarAtaqueInteligente = async () => {
    if (!atacante || !defensor) return;
    const atk = { ...atacante };
    const def = { ...defensor };

    // Rolagem 1d20 + Ataque vs Defesa (CA)
    const d20 = Math.floor(Math.random() * 20) + 1;
    const modificadorAtk = atk.ataque || 0;
    const totalAcerto = d20 + modificadorAtk;
    const CA = def.defesa || 10;

    let critico = false;
    let falhaCritica = false;
    let acertou = false;

    if (d20 === 20) { critico = true; acertou = true; }
    else if (d20 === 1) { falhaCritica = true; acertou = false; }
    else if (totalAcerto >= CA) acertou = true;

    let logAcerto = `⚔️ ${atk.nome} ataca ${def.nome}: 1d20(${d20})+${modificadorAtk} = ${totalAcerto} vs CA ${CA}.`;
    
    if (falhaCritica) {
      adicionarLog(logAcerto + " ❌ FALHA CRÍTICA!", true);
      return;
    }
    
    if (!acertou) {
      adicionarLog(logAcerto + " 🛡️ Errou!", true);
      return;
    }

    // Calculo de Dano (Rola 1d8 de dano base da arma simulada + modificador)
    const d8 = Math.floor(Math.random() * 8) + 1;
    let danoFinal = d8 + Math.floor(atk.nivel / 2);
    if (critico) danoFinal *= 2; // Dobra o dano inteiro
    
    // Absorção de armadura se existir
    let absorvido = 0;
    if (def.armadura > 0) {
      absorvido = Math.min(def.armadura, Math.floor(danoFinal / 2)); // Armadura tanka 50%
      def.armadura -= absorvido;
    }

    const danoAplicado = danoFinal - absorvido;
    def.pv = Math.max(0, def.pv - danoAplicado);
    
    if (def.pv === 0) {
      if (!def.status_efeitos.includes('Morto')) def.status_efeitos.push('Morto');
    }

    // XP
    if (def.pv === 0 && def.status === 'inimigo') {
      atk.xp += (def.nivel || 1) * 20;
    }

    let msgDano = logAcerto + ` ✅ ${critico ? '💥 ACERTO CRÍTICO!' : 'Acertou!'} Causa ${danoFinal} de dano (${absorvido} absorvido). HP Restante: ${def.pv}/${def.pv_max}.`;
    if (def.pv === 0) msgDano += ` ☠️ ${def.nome} morreu!`;

    adicionarLog(msgDano, true);

    await salvarFicha(atk);
    await salvarFicha(def);
    setAtacante(atk);
    setDefensor(def);
    recarregar();
  };

    const __executarCuraInteligente = async () => {
    if (!atacante) return;
    const alvo = defensor || atacante; // Cura o defensor, ou curar si mesmo
    
    if (atacante.usos_cura <= 0) {
      adicionarLog(`❌ ${atacante.nome} não possui mais usos de cura!`, false);
      return;
    }

    const d20 = Math.floor(Math.random() * 20) + 1;
    if (d20 === 1) {
      const a = { ...atacante };
      a.usos_cura -= 1;
      await salvarFicha(a);
      setAtacante(a);
      adicionarLog(`⚕️ ${atacante.nome} tenta curar ${alvo.nome} mas falha miseravelmente (Rolou 1). Perdeu o uso.`, true);
      recarregar();
      return;
    }

    const healDice = Math.floor(Math.random() * 8) + 1;
    const modificadorSabedoria = Math.floor(atacante.mana_max / 10) || 1; // Simulando SAB
    let totalCura = healDice + modificadorSabedoria + (atacante.nivel || 1);
    
    if (d20 === 20) totalCura *= 2; // Cura crítica

    const atk = { ...atacante };
    const def = { ...alvo };

    atk.usos_cura -= 1;
    
    const curadoReal = Math.min(totalCura, def.pv_max - def.pv);
    def.pv += curadoReal;
    // Remove "Morto" ou "Sangrando" ao ser curado magicamente
    def.status_efeitos = def.status_efeitos.filter(e => e !== 'Morto' && e !== 'Sangrando');

    adicionarLog(`⚕️ ${atk.nome} cura ${def.nome}: +${curadoReal} PV (1d8:${healDice}). Usos de cura restantes: ${atk.usos_cura}.`, true);

    await salvarFicha(atk);
    if (atk.caminhoArquivo !== def.caminhoArquivo) {
      await salvarFicha(def);
    }
    
    setAtacante(atk);
    if (defensor) setDefensor(def);
    recarregar();
  };

    const _vasculharCadaver = async () => {
    if (!atacante || !defensor) return;
    if (defensor.pv > 0) {
      adicionarLog("⚠️ O alvo ainda está vivo para ser saqueado!", false);
      return;
    }
    if (defensor.saqueado) {
      adicionarLog(`⚠️ ${defensor.nome} já foi saqueado. Não há mais nada de valor.`, false);
      return;
    }

    const ouroSorte = Math.floor(Math.random() * (defensor.nivel * 10)) + 5;
    
    const atk = { ...atacante };
    const def = { ...defensor };

    atk.ouro = (atk.ouro || 0) + ouroSorte;
    def.saqueado = true;

    adicionarLog(`💰 ${atk.nome} vasculhou o cadáver de ${def.nome} e encontrou ${ouroSorte} Moedas de Ouro! (Total: ${atk.ouro} MO)`, true);

    await salvarFicha(atk);
    await salvarFicha(def);
    setAtacante(atk);
    setDefensor(def);
    recarregar();
  };

  const estiloSelect = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(15,23,42,0.9)',
    color: '#f1f5f9',
    fontFamily: 'var(--font-body)',
    marginBottom: '8px',
  };

  return (
    <DraggableWindow
      title="Motor Tático (Hub)"
      id="automated-dice-widget"
      onClose={onClose}
      width={900}
      height={720}
      initialX={window.innerWidth / 2 - 450}
      initialY={window.innerHeight / 2 - 360}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', color: '#f1f5f9', fontFamily: 'var(--font-body)' }}>
        
        {/* NAVEGAÇÃO DE ABAS E SELETOR DE MODO */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 20px 0', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(30,41,59,0.2)' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={() => setAbaAtual('combate')}
              style={{ padding: '12px 16px', background: abaAtual === 'combate' ? 'rgba(168,85,247,0.15)' : 'transparent', border: 'none', borderBottom: abaAtual === 'combate' ? '3px solid #a855f7' : '3px solid transparent', color: abaAtual === 'combate' ? 'white' : '#cbd5e1', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'var(--font-display)', transition: 'all 0.2s' }}
            >
              <Swords size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
              Combate e Alvos
            </button>
            <button 
              onClick={() => setAbaAtual('iniciativa')}
              style={{ padding: '12px 16px', background: abaAtual === 'iniciativa' ? 'rgba(56,189,248,0.15)' : 'transparent', border: 'none', borderBottom: abaAtual === 'iniciativa' ? '3px solid #38bdf8' : '3px solid transparent', color: abaAtual === 'iniciativa' ? 'white' : '#cbd5e1', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'var(--font-display)', transition: 'all 0.2s' }}
            >
              <ListOrdered size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
              Fila de Iniciativa
            </button>
            <button 
              onClick={() => setAbaAtual('elenco')}
              style={{ padding: '12px 16px', background: abaAtual === 'elenco' ? 'rgba(16,185,129,0.15)' : 'transparent', border: 'none', borderBottom: abaAtual === 'elenco' ? '3px solid #10b981' : '3px solid transparent', color: abaAtual === 'elenco' ? 'white' : '#cbd5e1', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'var(--font-display)', transition: 'all 0.2s' }}
            >
              <Target size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
              Elenco
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', paddingBottom: '5px' }}>
            {/* Seletor de Modo de Sistema */}
            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '3px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <button
                onClick={() => setSistemaMode('d20')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: sistemaMode === 'd20' ? 'linear-gradient(135deg, #a855f7, #6366f1)' : 'transparent',
                  color: sistemaMode === 'd20' ? '#ffffff' : '#94a3b8',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                Modo d20
              </button>
              <button
                onClick={() => setSistemaMode('d100')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: sistemaMode === 'd100' ? 'linear-gradient(135deg, #38bdf8, #0ea5e9)' : 'transparent',
                  color: sistemaMode === 'd100' ? '#ffffff' : '#94a3b8',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                Modo d100 (CoC)
              </button>
            </div>

            {/* Input de CD */}
            {sistemaMode === 'd20' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <span style={{ fontSize: '0.75rem', color: '#cbd5e1', fontWeight: 'bold' }}>CD:</span>
                <input
                  type="number"
                  value={cd}
                  onChange={(e) => setCd(Math.max(1, parseInt(e.target.value) || 0))}
                  style={{
                    width: '45px',
                    background: 'rgba(15,23,42,0.6)',
                    border: '1px solid rgba(168,85,247,0.4)',
                    borderRadius: '5px',
                    padding: '2px 4px',
                    color: '#ffffff',
                    textAlign: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    outline: 'none',
                  }}
                />
              </div>
            )}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          
          {/* ======================= ABA DE COMBATE ======================= */}
          {abaAtual === 'combate' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* TOP SELECTORS AND SURVIVAL STATS */}
              <div style={{ display: 'flex', gap: '20px' }}>
                {/* Seleção de atacante */}
                <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', padding: '12px 16px', borderRadius: '10px', borderLeft: '4px solid #a855f7' }}>
                  <h4 style={{ fontFamily: 'var(--font-display)', color: '#a855f7', margin: '0 0 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <Target size={15} style={{ marginRight: 6 }} /> Atacante / Aliado
                    </div>
                    {atacante && (
                      <button 
                        onClick={() => window.dispatchEvent(new CustomEvent('open-sheet-by-wiki', { detail: atacante.caminhoArquivo }))}
                        style={{ background: 'transparent', border: 'none', color: '#38bdf8', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                        title="Abrir Ficha do Personagem"
                      >
                        <BookOpen size={15} />
                      </button>
                    )}
                  </h4>
                  <select
                    style={estiloSelect}
                    value={atacante?.caminhoArquivo || ''}
                    onChange={(e) => {
                      const encontrado = personagens.find((p) => p.caminhoArquivo === e.target.value);
                      setAtacante(encontrado || null);
                    }}
                    disabled={carregando}
                  >
                    <option value="">-- Escolha um Personagem --</option>
                    {personagens.filter(p => p.ativo && (p.status === 'jogador' || p.status === 'npc')).map((p) => (
                      <option key={p.caminhoArquivo} value={p.caminhoArquivo}>
                        {p.nome} (Nv.{p.nivel})
                      </option>
                    ))}
                  </select>
                  
                  {atacante && (
                    <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#cbd5e1', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                      <span style={{ color: '#ef4444' }}>❤️ HP: {atacante.pv}/{atacante.pv_max}</span>
                      <span style={{ color: '#a855f7' }}>⚡ Mana: {atacante.mana}/{atacante.mana_max}</span>
                      <span style={{ color: '#38bdf8' }}>🏃‍♂️ Ener: {atacante.energia}/{atacante.energia_max}</span>
                      <span style={{ color: '#ec4899' }}>🧠 San: {atacante.sanidade}/{atacante.sanidade_max}</span>
                      <span style={{ color: '#f59e0b' }}>🍎 Fome: {atacante.fome}/{atacante.fome_max}</span>
                      <span style={{ color: '#06b6d4' }}>💧 Sede: {atacante.sede}/{atacante.sede_max}</span>
                      <span style={{ color: '#8b5cf6' }}>💤 Fad: {atacante.cansaco}/{atacante.cansaco_max}</span>
                      <span style={{ color: '#eab308' }}>💰 Ouro: {atacante.ouro}</span>
                      <span style={{ color: '#10b981' }}>💎 Riq: {atacante.riquezas}</span>
                      {atacante.status_efeitos.length > 0 && (
                        <span style={{ gridColumn: '1 / -1', color: '#f87171' }}>⚠️ Status: {atacante.status_efeitos.join(', ')}</span>
                      )}
                    </div>
                  )}
                </div>
 
                {/* Seleção de defensor */}
                <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', padding: '12px 16px', borderRadius: '10px', borderLeft: '4px solid #ef4444' }}>
                  <h4 style={{ fontFamily: 'var(--font-display)', color: '#ef4444', margin: '0 0 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <Skull size={15} style={{ marginRight: 6 }} /> Defensor / Inimigo
                    </div>
                    {defensor && (
                      <button 
                        onClick={() => window.dispatchEvent(new CustomEvent('open-sheet-by-wiki', { detail: defensor.caminhoArquivo }))}
                        style={{ background: 'transparent', border: 'none', color: '#38bdf8', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                        title="Abrir Ficha do Personagem"
                      >
                        <BookOpen size={15} />
                      </button>
                    )}
                  </h4>
                  <select
                    style={estiloSelect}
                    value={defensor?.caminhoArquivo || ''}
                    onChange={(e) => {
                      const encontrado = personagens.find((p) => p.caminhoArquivo === e.target.value);
                      setDefensor(encontrado || null);
                    }}
                    disabled={carregando}
                  >
                    <option value="">-- Escolha o Alvo --</option>
                    {personagens.filter(p => p.ativo).map((p) => (
                      <option key={p.caminhoArquivo} value={p.caminhoArquivo}>
                        {p.nome} {p.pv <= 0 ? '(MORTO)' : ''}
                      </option>
                    ))}
                  </select>
 
                  {defensor && (
                    <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#cbd5e1', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                      <span style={{ color: '#ef4444' }}>❤️ HP: {defensor.pv}/{defensor.pv_max}</span>
                      <span style={{ color: '#a855f7' }}>⚡ Mana: {defensor.mana}/{defensor.mana_max}</span>
                      <span style={{ color: '#38bdf8' }}>🏃‍♂️ Ener: {defensor.energia}/{defensor.energia_max}</span>
                      <span style={{ color: '#ec4899' }}>🧠 San: {defensor.sanidade}/{defensor.sanidade_max}</span>
                      <span style={{ color: '#8b5cf6' }}>💤 Fad: {defensor.cansaco}/{defensor.cansaco_max}</span>
                      <span style={{ color: '#10b981' }}>🛡️ Def: {defensor.defesa}</span>
                      {defensor.status_efeitos.length > 0 && (
                        <span style={{ gridColumn: '1 / -1', color: '#f87171' }}>⚠️ Status: {defensor.status_efeitos.join(', ')}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* TWO COLUMN INTERACTIVE INTERFACES */}
              <div style={{ display: 'flex', gap: '20px' }}>
                
                {/* LEFT COLUMN: ATTACKER CONTROLS */}
                <div style={{ flex: 1.1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  
                  {/* ATRIBUTOS 4DET */}
                  <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px' }}>
                    <h5 style={{ margin: '0 0 8px', color: '#cbd5e1', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Atributos (4DET)</h5>
                    {atacante ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                        {[
                          { label: 'FOR', val: atacante.forca },
                          { label: 'CON', val: atacante.constituicao },
                          { label: 'SAB', val: atacante.sabedoria },
                          { label: 'DES', val: atacante.destreza },
                          { label: 'INT', val: atacante.inteligencia },
                          { label: 'CAR', val: atacante.carisma },
                        ].map(a => (
                          <button
                            key={a.label}
                            onClick={() => rolarAtributo4DET(a.label, a.val, atacante.nome)}
                            style={{
                              background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)',
                              borderRadius: '6px', color: '#c084fc', padding: '6px', cursor: 'pointer',
                              display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '0.75rem'
                            }}
                          >
                            <span style={{ fontWeight: 'bold' }}>{a.label}</span>
                            <span>{a.val} ({sistemaMode === 'd20' ? formatMod(getMod(a.val)) : `${a.val * 5}%`})</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' }}>Selecione um Atacante.</div>
                    )}
                  </div>

                  {/* ATRIBUTOS 3D&T */}
                  <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px' }}>
                    <h5 style={{ margin: '0 0 8px', color: '#cbd5e1', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>3D&T (Bônus Reto)</h5>
                    {atacante ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
                        {[
                          { label: 'H', val: atacante.habilidade },
                          { label: 'A', val: atacante.armadura_3dt },
                          { label: 'F', val: atacante.forca_3dt },
                          { label: 'R', val: atacante.resistencia },
                          { label: 'PdF', val: atacante.pdf },
                        ].map(a => (
                          <button
                            key={a.label}
                            onClick={() => rolarAtributo3DT(a.label, a.val, atacante.nome)}
                            style={{
                              background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)',
                              borderRadius: '6px', color: '#ffedd5', padding: '4px', cursor: 'pointer',
                              display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '0.75rem'
                            }}
                          >
                            <span style={{ fontWeight: 'bold' }}>{a.label}</span>
                            <span>{a.val}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' }}>Selecione um Atacante.</div>
                    )}
                  </div>

                  {/* PERÍCIAS */}
                  <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px' }}>
                    <h5 style={{ margin: '0 0 8px', color: '#cbd5e1', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Perícias</h5>
                    {atacante ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                        {[
                          { name: 'Acrobacia', val: atacante.destreza },
                          { name: 'Furtividade', val: atacante.destreza },
                          { name: 'Investigação', val: atacante.inteligencia },
                          { name: 'Medicina', val: atacante.inteligencia },
                          { name: 'Percepção', val: atacante.sabedoria },
                          { name: 'Sobrevivência', val: atacante.sabedoria },
                          { name: 'Intimidação', val: atacante.carisma },
                        ].map(p => (
                          <button
                            key={p.name}
                            onClick={() => rolarPericia(p.name, p.val, atacante.nome)}
                            style={{
                              background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)',
                              borderRadius: '6px', color: '#bae6fd', padding: '5px 8px', cursor: 'pointer',
                              fontSize: '0.75rem', textAlign: 'left', display: 'flex', justifyContent: 'space-between'
                            }}
                          >
                            <span>{p.name}</span>
                            <span style={{ opacity: 0.7 }}>{sistemaMode === 'd20' ? formatMod(getMod(p.val)) : `${p.val * 5}%`}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' }}>Selecione um Atacante.</div>
                    )}
                  </div>

                  {/* ATAQUES E ARMAS */}
                  <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px' }}>
                    <h5 style={{ margin: '0 0 8px', color: '#cbd5e1', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ataques e Armas</h5>
                    {atacante ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        
                        {/* Basic Attacks */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                          <button
                            onClick={rolarAtaqueDesarmado}
                            style={{
                              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                              borderRadius: '6px', color: '#fca5a5', padding: '6px', cursor: 'pointer', fontSize: '0.75rem'
                            }}
                          >
                            👊 Desarmado (1d3)
                          </button>
                          <button
                            onClick={rolarPedraDistancia}
                            style={{
                              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                              borderRadius: '6px', color: '#fca5a5', padding: '6px', cursor: 'pointer', fontSize: '0.75rem'
                            }}
                          >
                            🪨 Pedra (1d4)
                          </button>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                          <button
                            onClick={rolarMagiaBasica}
                            disabled={atacante.mana < 1}
                            style={{
                              background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)',
                              borderRadius: '6px', color: '#93c5fd', padding: '6px', cursor: 'pointer', fontSize: '0.75rem',
                              opacity: atacante.mana < 1 ? 0.5 : 1
                            }}
                          >
                            ⚡ Magia (1d6) -1PM
                          </button>
                          <button
                            onClick={rolarAtaqueArea}
                            style={{
                              background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)',
                              borderRadius: '6px', color: '#fde047', padding: '6px', cursor: 'pointer', fontSize: '0.75rem'
                            }}
                          >
                            💥 Ataque em Área
                          </button>
                        </div>

                        {/* Custom Attack from Sheet */}
                        {atacante.ataque_basico && (
                          <div style={{
                            background: 'rgba(255,255,255,0.02)', padding: '6px 10px', borderRadius: '6px',
                            border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.75rem',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                          }}>
                            <div>
                              <div style={{ fontWeight: 'bold' }}>Ficha: Ataque Básico</div>
                              <div style={{ opacity: 0.7, fontSize: '0.7rem' }}>{atacante.ataque_basico}</div>
                            </div>
                            <button
                              onClick={() => {
                                const expression = atacante.ataque_basico?.match(/(\d+d\d+[\+\-]?\d*)/)?.[1] || '1d6';
                                setDanoAvulsoInput(expression);
                                adicionarLog(`🎲 Copiado ataque básico "${expression}" para o Rolo de Dano Avulso!`, false);
                              }}
                              style={{ background: 'rgba(168,85,247,0.2)', border: 'none', color: '#c084fc', padding: '3px 8px', borderRadius: '4px', cursor: 'pointer' }}
                            >
                              Copiar
                            </button>
                          </div>
                        )}

                        {/* Equipped Weapons from Inventory */}
                        {atacante.inventario.filter(i => i.equipado && i.tipo === 'equipamento').map((item, idx) => (
                          <div key={`inv-wpn-${idx}`} style={{
                            background: 'rgba(16,185,129,0.05)', padding: '6px 10px', borderRadius: '6px',
                            border: '1px solid rgba(16,185,129,0.15)', fontSize: '0.75rem',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                          }}>
                            <div>
                              <span style={{ fontWeight: 'bold', color: '#6ee7b7' }}>⚔️ {item.nome}</span>
                              <span style={{ opacity: 0.7, fontSize: '0.7rem', marginLeft: '6px' }}>({item.efeito})</span>
                            </div>
                            <button
                              onClick={() => rolarArmaEquipada(item)}
                              style={{ background: 'rgba(16,185,129,0.2)', border: 'none', color: '#6ee7b7', padding: '3px 8px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                              Rolar
                            </button>
                          </div>
                        ))}

                        {/* Equipped Weapons from Catalog */}
                        {atacante.armas && atacante.armas.filter(w => w.equipado).map((item, idx) => (
                          <div key={`cat-wpn-${idx}`} style={{
                            background: 'rgba(239,68,68,0.05)', padding: '6px 10px', borderRadius: '6px',
                            border: '1px solid rgba(239, 68, 68, 0.25)', fontSize: '0.75rem',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                          }}>
                            <div>
                              <span style={{ fontWeight: 'bold', color: '#fca5a5' }}>⚔️ {item.nome}</span>
                              <span style={{ opacity: 0.7, fontSize: '0.7rem', marginLeft: '6px' }}>({item.dano || '1d6'} | {item.efeito})</span>
                            </div>
                            <button
                              onClick={() => rolarArmaEquipada(item)}
                              style={{ background: 'rgba(239,68,68,0.2)', border: 'none', color: '#fca5a5', padding: '3px 8px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                              Rolar
                            </button>
                          </div>
                        ))}

                        {/* Powers from Catalog */}
                        {atacante.poderes && atacante.poderes.map((item, idx) => (
                          <div key={`pwr-${idx}`} style={{
                            background: 'rgba(168,85,247,0.05)', padding: '6px 10px', borderRadius: '6px',
                            border: '1px solid rgba(168,85,247,0.15)', fontSize: '0.75rem',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                          }}>
                            <div>
                              <span style={{ fontWeight: 'bold', color: '#d8b4fe' }}>✨ {item.nome}</span>
                              <span style={{ opacity: 0.7, fontSize: '0.7rem', marginLeft: '6px' }}>({item.custo})</span>
                            </div>
                            <button
                              onClick={() => handleItemActionAttacker('poderes', idx, 'conjurar')}
                              style={{ background: 'rgba(168,85,247,0.2)', border: 'none', color: '#d8b4fe', padding: '3px 8px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                              Conjurar
                            </button>
                          </div>
                        ))}

                      </div>
                    ) : (
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' }}>Selecione um Atacante.</div>
                    )}
                  </div>

                  {/* Mochila e Inventário */}
                  <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px' }}>
                    <h5 style={{ margin: '0 0 8px', color: '#cbd5e1', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bolsa e Equipamentos</h5>
                    {atacante ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                        
                        {/* ARMAS */}
                        {atacante.armas && atacante.armas.length > 0 && (
                          <div>
                            <div style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 'bold', margin: '4px 0 2px' }}>🗡️ Armas</div>
                            {atacante.armas.map((item, idx) => (
                              <div key={`inv-arm-${idx}`} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '4px 6px', borderRadius: '4px', background: 'rgba(0,0,0,0.2)', fontSize: '0.7rem', marginBottom: '4px'
                              }}>
                                <div>
                                  <span style={{ fontWeight: item.equipado ? 'bold' : 'normal', color: item.equipado ? '#ef4444' : 'white' }}>
                                    {item.nome}
                                  </span>
                                  <div style={{ fontSize: '0.6rem', color: '#94a3b8' }}>Dano: {item.dano || '1d6'}</div>
                                </div>
                                <button
                                  onClick={() => handleItemActionAttacker('armas', idx, 'equipar')}
                                  style={{
                                    background: item.equipado ? 'rgba(239,68,68,0.2)' : 'rgba(59,130,246,0.2)',
                                    border: 'none', color: item.equipado ? '#fca5a5' : '#93c5fd', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.65rem'
                                  }}
                                >
                                  {item.equipado ? 'Desequipar' : 'Equipar'}
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* POÇÕES */}
                        {atacante.pocoes && atacante.pocoes.length > 0 && (
                          <div>
                            <div style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 'bold', margin: '4px 0 2px' }}>🧪 Poções e Consumíveis</div>
                            {atacante.pocoes.map((item, idx) => (
                              <div key={`inv-pot-${idx}`} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '4px 6px', borderRadius: '4px', background: 'rgba(0,0,0,0.2)', fontSize: '0.7rem', marginBottom: '4px'
                              }}>
                                <div>
                                  <span style={{ color: 'white' }}>{item.nome} {item.quantidade > 1 ? `(x${item.quantidade})` : ''}</span>
                                  <div style={{ fontSize: '0.6rem', color: '#94a3b8' }}>{item.descricao || item.efeito}</div>
                                </div>
                                <button
                                  onClick={() => handleItemActionAttacker('pocoes', idx, 'usar')}
                                  style={{ background: 'rgba(16,185,129,0.2)', border: 'none', color: '#6ee7b7', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.65rem' }}
                                >
                                  Usar
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* MALDIÇÕES */}
                        {atacante.maldicoes && atacante.maldicoes.length > 0 && (
                          <div>
                            <div style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 'bold', margin: '4px 0 2px' }}>💀 Maldições e Condições</div>
                            {atacante.maldicoes.map((item, idx) => (
                              <div key={`inv-curse-${idx}`} style={{
                                padding: '4px 6px', borderRadius: '4px', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)', fontSize: '0.7rem', marginBottom: '4px', color: '#fde047'
                              }}>
                                <strong>{item.nome}</strong>: {item.descricao}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* OBJETOS DE CAMPANHA */}
                        {atacante.objetos_campanha && atacante.objetos_campanha.length > 0 && (
                          <div>
                            <div style={{ fontSize: '0.7rem', color: '#06b6d4', fontWeight: 'bold', margin: '4px 0 2px' }}>🔑 Objetos de Campanha</div>
                            {atacante.objetos_campanha.map((item, idx) => (
                              <div key={`inv-obj-${idx}`} style={{
                                padding: '4px 6px', borderRadius: '4px', background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.15)', fontSize: '0.7rem', marginBottom: '4px', color: '#67e8f9'
                              }}>
                                <strong>{item.nome}</strong>: {item.descricao}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* LEGACY INVENTORY */}
                        {atacante.inventario && atacante.inventario.length > 0 && (
                          <div>
                            <div style={{ fontSize: '0.7rem', color: '#a855f7', fontWeight: 'bold', margin: '4px 0 2px' }}>🎒 Outros Itens (Mochila)</div>
                            {atacante.inventario.map((item, idx) => (
                              <div key={`inv-leg-${idx}`} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '4px 6px', borderRadius: '4px', background: 'rgba(0,0,0,0.2)', fontSize: '0.7rem', marginBottom: '4px'
                              }}>
                                <div>
                                  <span style={{ fontWeight: item.equipado ? 'bold' : 'normal', color: item.equipado ? '#c084fc' : 'white' }}>
                                    {item.nome} {item.quantidade > 1 ? `(x${item.quantidade})` : ''}
                                  </span>
                                  <div style={{ fontSize: '0.6rem', color: '#94a3b8' }}>{item.tipo} | {item.efeito}</div>
                                </div>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                  {item.tipo === 'consumivel' && (
                                    <button
                                      onClick={() => usarConsumivelAttacker(idx)}
                                      style={{ background: 'rgba(16,185,129,0.2)', border: 'none', color: '#6ee7b7', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.65rem' }}
                                    >
                                      Usar
                                    </button>
                                  )}
                                  {item.tipo === 'equipamento' && (
                                    <button
                                      onClick={() => alternarEquipamentoAttacker(idx)}
                                      style={{
                                        background: item.equipado ? 'rgba(239,68,68,0.2)' : 'rgba(59,130,246,0.2)',
                                        border: 'none', color: item.equipado ? '#fca5a5' : '#93c5fd', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.65rem'
                                      }}
                                    >
                                      {item.equipado ? 'Desequipar' : 'Equipar'}
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {(!atacante.armas || atacante.armas.length === 0) &&
                         (!atacante.pocoes || atacante.pocoes.length === 0) &&
                         (!atacante.maldicoes || atacante.maldicoes.length === 0) &&
                         (!atacante.objetos_campanha || atacante.objetos_campanha.length === 0) &&
                         (!atacante.inventario || atacante.inventario.length === 0) && (
                          <div style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' }}>Mochila vazia.</div>
                        )}

                      </div>
                    ) : (
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' }}>Selecione um Atacante.</div>
                    )}
                  </div>

                </div>

                {/* RIGHT COLUMN: DEFENDER CONTROLS */}
                <div style={{ flex: 0.9, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  
                  {/* CONDIÇÕES DO DEFENSOR */}
                  <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px' }}>
                    <h5 style={{ margin: '0 0 8px', color: '#cbd5e1', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Condições do Defensor</h5>
                    {defensor ? (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                        {[
                          { label: '🔥 Fogo', key: 'Fogo' },
                          { label: '❄️ Gelo', key: 'Gelo' },
                          { label: '🤕 Queda', key: 'Queda' },
                          { label: '🤢 Veneno', key: 'Veneno' },
                          { label: '👁️ Cego', key: 'Cego' },
                          { label: '💤 Sono', key: 'Sono' },
                          { label: '🩸 Sangrando', key: 'Sangrando' },
                          { label: '😵 Confuso', key: 'Confuso' },
                        ].map(c => {
                          const ativo = defensor.status_efeitos.some(e => e.toLowerCase() === c.key.toLowerCase());
                          return (
                            <button
                              key={c.key}
                              onClick={() => alternarCondicaoDefensor(c.key)}
                              style={{
                                background: ativo ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.02)',
                                border: ativo ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '6px', color: ativo ? '#fca5a5' : '#94a3b8', padding: '6px 8px',
                                cursor: 'pointer', fontSize: '0.75rem', textAlign: 'left', fontWeight: ativo ? 'bold' : 'normal'
                              }}
                            >
                              {c.label} {ativo ? '✓' : ''}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' }}>Selecione um Defensor.</div>
                    )}
                  </div>

                  {/* COMBATE MENTAL */}
                  <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px' }}>
                    <h5 style={{ margin: '0 0 8px', color: '#cbd5e1', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Combate Mental</h5>
                    {atacante && defensor && mentalAtkPool !== null && mentalDefPool !== null ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                          <span style={{ color: '#a855f7' }}>👤 {atacante.nome}: **{mentalAtkPool}** Mente</span>
                          <span style={{ color: '#ef4444' }}>👾 {defensor.nome}: **{mentalDefPool}** Mente</span>
                        </div>
                        
                        <div style={{ display: 'flex', height: '8px', borderRadius: '4px', overflow: 'hidden', background: '#334155' }}>
                          <div style={{ width: `${(mentalAtkPool / ((atacante.sabedoria+atacante.inteligencia)*2 || 20)) * 50}%`, background: '#a855f7' }} />
                          <div style={{ width: `${(mentalDefPool / ((defensor.sabedoria+defensor.inteligencia)*2 || 20)) * 50}%`, background: '#ef4444', marginLeft: 'auto' }} />
                        </div>

                        <button
                          onClick={rolarCombateMental}
                          disabled={mentalAtkPool <= 0 || mentalDefPool <= 0}
                          style={{
                            width: '100%', padding: '8px', background: 'linear-gradient(45deg, #4f46e5, #06b6d4)',
                            color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer',
                            fontWeight: 'bold', fontSize: '0.75rem', marginTop: '4px',
                            opacity: (mentalAtkPool <= 0 || mentalDefPool <= 0) ? 0.5 : 1
                          }}
                        >
                          🧠 Rolar Combate Mental (INT vs INT)
                        </button>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' }}>Selecione Atacante e Defensor.</div>
                    )}
                  </div>

                  {/* A DISPUTA (ATK vs DEF) */}
                  <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px' }}>
                    <h5 style={{ margin: '0 0 8px', color: '#cbd5e1', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>A Disputa (ATK vs DEF)</h5>
                    {atacante && defensor ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Selecionar Atributo</label>
                          <select
                            value={disputeAttr}
                            onChange={(e) => setDisputeAttr(e.target.value)}
                            style={{
                              width: '100%', padding: '6px 10px', borderRadius: '6px',
                              background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)',
                              color: 'white', fontSize: '0.75rem', cursor: 'pointer'
                            }}
                          >
                            <option value="forca">FOR (Força)</option>
                            <option value="constituicao">CON (Constituição)</option>
                            <option value="sabedoria">SAB (Sabedoria)</option>
                            <option value="destreza">DES (Destreza)</option>
                            <option value="inteligencia">INT (Inteligência)</option>
                            <option value="carisma">CAR (Carisma)</option>
                          </select>
                        </div>
                        <button
                          onClick={rolarDisputaAtributos}
                          style={{
                            width: '100%', padding: '8px', background: 'linear-gradient(45deg, #059669, #10b981)',
                            color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer',
                            fontWeight: 'bold', fontSize: '0.75rem'
                          }}
                        >
                          ⚔️ Rolar Disputa
                        </button>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' }}>Selecione Atacante e Defensor.</div>
                    )}
                  </div>

                </div>

              </div>

              {/* Rolar Dano Avulso & Testes Rápidos */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                
                {/* Dano Avulso */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase' }}>Rolar Dano Avulso</label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <input
                      type="text"
                      value={danoAvulsoInput}
                      onChange={e => setDanoAvulsoInput(e.target.value)}
                      placeholder="1d6"
                      style={{ width: '100%', padding: '6px', borderRadius: '6px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.75rem', textAlign: 'center' }}
                    />
                    <button
                      onClick={rolarDanoAvulso}
                      style={{ background: 'rgba(168,85,247,0.2)', border: 'none', color: '#c084fc', padding: '0 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}
                    >
                      Ir
                    </button>
                  </div>
                </div>

                {/* Teste Genérico (d20/d100) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={rolarD20Generico}
                    style={{ height: '31px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}
                  >
                    {sistemaMode === 'd20' ? '🎲 Teste Genérico (d20)' : '📊 Teste Genérico (d100)'}
                  </button>
                </div>

                {/* Teste de Bônus */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase' }}>
                    {sistemaMode === 'd20' ? 'Teste de Bônus (1d20+B)' : 'Modificador d100 (1d100+M)'}
                  </label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <input
                      type="text"
                      value={bonusTestInput}
                      onChange={e => setBonusTestInput(e.target.value)}
                      placeholder={sistemaMode === 'd20' ? '+5' : '-10'}
                      style={{ width: '100%', padding: '6px', borderRadius: '6px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.75rem', textAlign: 'center' }}
                    />
                    <button
                      onClick={rolarTesteBonus}
                      style={{ background: 'rgba(56,189,248,0.2)', border: 'none', color: '#38bdf8', padding: '0 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}
                    >
                      Rolar
                    </button>
                  </div>
                </div>

                {/* Morte Direta */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={aplicarMorteDireta}
                    disabled={!defensor}
                    style={{
                      height: '31px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                      borderRadius: '6px', color: '#fca5a5', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold',
                      opacity: !defensor ? 0.5 : 1
                    }}
                  >
                    ☠️ Morte Direta (Letal)
                  </button>
                </div>

              </div>

            </div>
          )}

          {/* ======================= ABA DE INICIATIVA ======================= */}
          {abaAtual === 'iniciativa' && (
            <div className="animate-fade-in" style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <button
                  onClick={rolarIniciativaGeral}
                  style={{ flex: 2, background: 'var(--accent-secondary)', color: 'white', fontWeight: 'bold', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                >
                  <Dices size={16} /> Rolar Iniciativa (Mesa Toda)
                </button>
                <button
                  onClick={proximoTurno}
                  disabled={fila.length === 0}
                  style={{ flex: 1, background: '#10b981', color: 'white', fontWeight: 'bold', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', opacity: fila.length === 0 ? 0.5 : 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                >
                  Próximo Turno <ArrowRightCircle size={16} />
                </button>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '15px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                {fila.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#94a3b8', fontStyle: 'italic', padding: '20px 0' }}>
                    A fila de combate está vazia.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {fila.map((item, idx) => {
                      const isAtual = idx === turnoAtual;
                      const f = personagens.find(p => p.caminhoArquivo === item.id) || item.ficha;
                      return (
                        <div key={item.id} style={{ 
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                          padding: '10px 15px', borderRadius: '6px', 
                          background: isAtual ? 'linear-gradient(90deg, rgba(168,85,247,0.4), rgba(168,85,247,0.1))' : 'rgba(255,255,255,0.03)',
                          borderLeft: isAtual ? '4px solid #a855f7' : '4px solid transparent',
                          transition: 'all 0.3s'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: isAtual ? '#c084fc' : '#94a3b8', width: '30px' }}>{item.valor}</div>
                            <div style={{ fontWeight: 'bold', color: isAtual ? 'white' : '#cbd5e1' }}>{item.nome}</div>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', gap: '10px' }}>
                            <span>❤️ {f.pv}/{f.pv_max}</span>
                            {f.status_efeitos && f.status_efeitos.length > 0 && (
                              <span style={{ color: '#f87171' }}>{f.status_efeitos.join(', ')}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================= ABA DE ELENCO ======================= */}
          {abaAtual === 'elenco' && (
            <div className="animate-fade-in" style={{ marginBottom: '20px' }}>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '15px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h3 style={{ margin: '0 0 15px', color: '#10b981', display: 'flex', alignItems: 'center' }}>
                  <Target size={20} style={{ marginRight: '8px' }} />
                  Gerenciamento de Visibilidade
                </h3>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '15px' }}>
                  Desative os personagens para escondê-los dos dropdowns de combate sem excluir os arquivos.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '350px', overflowY: 'auto', paddingRight: '10px' }}>
                  {personagens.sort((a,b) => a.nome.localeCompare(b.nome)).map(p => (
                    <div key={p.caminhoArquivo} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 15px', borderRadius: '6px',
                      background: 'rgba(255,255,255,0.03)',
                      borderLeft: p.ativo ? '4px solid #10b981' : '4px solid #ef4444'
                    }}>
                      <div>
                        <div style={{ fontWeight: 'bold', color: p.ativo ? 'white' : '#64748b' }}>{p.nome}</div>
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{p.status.toUpperCase()} | ❤️ {p.pv}/{p.pv_max}</div>
                      </div>
                      <button
                        onClick={async () => {
                          const atualizada = { ...p, ativo: !p.ativo };
                          await salvarFicha(atualizada);
                          recarregar();
                        }}
                        style={{
                          background: p.ativo ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
                          border: p.ativo ? '1px solid #10b981' : '1px solid #ef4444',
                          color: p.ativo ? '#10b981' : '#ef4444',
                          padding: '6px 12px', borderRadius: '20px',
                          cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem',
                          minWidth: '90px'
                        }}
                      >
                        {p.ativo ? '👁️ Ativo' : '🚫 Oculto'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ======================= LOG GLOBAL ======================= */}
          <h5 style={{ margin: '0 0 8px', color: '#cbd5e1', display: 'flex', justifyContent: 'space-between' }}>
            <span>📝 Log Tático</span>
            <span style={{ fontSize: '0.75rem', color: '#64748b', cursor: 'pointer' }} onClick={() => setResultados([])}>Limpar</span>
          </h5>
          <div style={{
            background: 'rgba(2,6,23,0.8)', borderRadius: '10px', padding: '12px',
            minHeight: '150px', maxHeight: '180px', overflowY: 'auto',
            border: '1px solid rgba(255,255,255,0.06)',
            fontFamily: 'var(--font-body)', fontSize: '0.9rem', lineHeight: 1.5,
          }}>
            {resultados.length === 0 ? (
              <div style={{ color: '#475569', fontStyle: 'italic', textAlign: 'center', marginTop: '40px' }}>Nenhuma rolagem registrada...</div>
            ) : (
              [...resultados].reverse().map((linha, i) => (
                <div key={i} style={{ marginBottom: '6px', paddingBottom: '6px', borderBottom: '1px solid rgba(255,255,255,0.02)', color: '#e2e8f0' }}>
                  {linha}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      <style>{`
        .pulse-animation {
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(251, 191, 36, 0); }
          100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0); }
        }
      `}</style>
    </DraggableWindow>
  );
};
