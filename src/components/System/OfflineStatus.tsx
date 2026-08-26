import React from 'react';
import { OfflineSyncBadge } from '../UI/OfflineSyncBadge';
import { ConflictResolutionModal } from '../Modals/ConflictResolutionModal';
import { useWindowManager } from '../../hooks/useWindowManager';

export const OfflineStatus: React.FC = () => {
  const { viewMode, activeModal, openWindows } = useWindowManager();

  const isHidden = 
    viewMode !== 'canvas' || 
    activeModal !== 'none' || 
    Boolean(openWindows.lineage) || 
    Boolean(openWindows.chronicle);

  return (
    <>
      {!isHidden && (
        <div 
          style={{
            position: 'fixed',
            bottom: '16px',
            right: '16px',
            zIndex: 30, // Camada do HUD base: janelas flutuantes (z-index 100+) cobrem este aviso
            pointerEvents: 'auto'
          }}
        >
          <OfflineSyncBadge />
        </div>
      )}
      <ConflictResolutionModal />
    </>
  );
};
