/**
 * App — 조립만 한다 (설계서 2.1). 여기서 store·테마·라우트를 화면에 연결한다.
 */
import { useMemo } from 'react';
import { SCHEMA_VERSION } from '@core/schema/current';
import { TodayScreen } from '@ui/screens/TodayScreen';
import { APP_VERSION } from '@app/version';
import { useTheme } from '@app/providers';
import { useRoute } from '@app/routes';
import { createAppStore } from '@app/store';

const DATE_FORMAT = new Intl.DateTimeFormat('ko-KR', {
  month: 'long',
  day: 'numeric',
  weekday: 'long',
});

export function App() {
  const { mode, setMode } = useTheme();
  const route = useRoute();
  // F0: 데이터는 아직 화면에 쓰이지 않는다. 저장소·스키마 조립이 살아 있는지만 확인한다.
  const store = useMemo(() => createAppStore(), []);

  const dateLabel = useMemo(() => DATE_FORMAT.format(new Date()), []);

  if (route !== 'today') return null;

  return (
    <TodayScreen
      dateLabel={dateLabel}
      theme={mode}
      onThemeChange={setMode}
      schemaVersion={SCHEMA_VERSION}
      appVersion={APP_VERSION}
      maxFocusCards={store.data.settings.maxFocusCards}
    />
  );
}
