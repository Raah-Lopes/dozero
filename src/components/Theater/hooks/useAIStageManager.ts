import { useEffect, useRef } from 'react';
import { state } from '../../../services/yjs';
import { updateTheaterState, getTheaterState, addTheaterDiaryEntry } from '../../../store/theater';

export function useAIStageManager(isActive: boolean) {
  
  const lastProcessedId = useRef<string | null>(null);

  useEffect(() => {
    if (!isActive) return;

    const observer = () => {
      const messages = state.chat.toArray();
      if (messages.length === 0) return;
      
      const lastMsg = messages[messages.length - 1] as any;
      
      if (lastProcessedId.current === lastMsg.id) return;
      lastProcessedId.current = lastMsg.id;

      // Ensure we only process if the message is fresh (within last 5 seconds) to avoid historical triggers on mount
      if (Date.now() - (lastMsg.timestamp || 0) > 5000) return;

      const text = (lastMsg.mensagem || '').toLowerCase();
      let triggered = false;
      const updates: any = {};
      
      // WEATHER KEYWORDS
      if (text.includes('chuva') || text.includes('tempestade') || text.includes('chovendo')) {
         updates.weather = 'rain';
         updates.mood = 'tension';
         triggered = true;
      } else if (text.match(/\b(nevasca|neve|frio|congelante)\b/)) {
         updates.weather = 'snow';
         updates.mood = 'melancholy';
         triggered = true;
      } else if (text.match(/\b(fogo|incêndio|chamas|queimando)\b/)) {
         updates.weather = 'embers';
         updates.mood = 'danger';
         triggered = true;
      } else if (text.match(/\b(neblina|névoa|bruma)\b/)) {
         updates.weather = 'fog';
         updates.mood = 'mystery';
         triggered = true;
      } else if (text.match(/\b(limpo|ensolarado|sol|calmo)\b/)) {
         updates.weather = 'none';
         updates.mood = 'neutral';
         triggered = true;
      }

      // TODO: SFX Keywords (Trovão, Espada, Grito) could trigger playSFX if we had default sounds configured

      if (triggered) {
         updateTheaterState(updates);
         
         const currentTheater = getTheaterState();
         // Update current scene if there is one, so the weather persists in the scene data
         if (currentTheater.currentSceneId) {
             const scenes = [...currentTheater.scenes];
             const idx = scenes.findIndex(s => s.id === currentTheater.currentSceneId);
             if (idx >= 0) {
                 scenes[idx] = { ...scenes[idx], ...updates };
                 updateTheaterState({ scenes });
             }
         }

         addTheaterDiaryEntry({
             timestamp: Date.now(),
             type: 'narrative',
             text: `🤖 AI Stage Manager reagiu ao chat e mudou o ambiente.`
         });
      }
    };

    state.chat.observe(observer);
    return () => state.chat.unobserve(observer);
  }, [isActive, state]);
}
