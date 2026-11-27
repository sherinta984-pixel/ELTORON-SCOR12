import { useMemo } from 'react';
import { DesktopSetup } from './components/DesktopSetup';
import { OverlayScreen } from './components/OverlayScreen';

export default function App() {
  const isOverlayMode = useMemo(
    () => new URLSearchParams(window.location.search).get('overlay') === '1',
    [],
  );

  return isOverlayMode ? <OverlayScreen /> : <DesktopSetup />;
}
