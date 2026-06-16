import { ExpoConfig, ConfigContext } from 'expo/config';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const base = require('./app.json').expo;

export default ({ config }: ConfigContext): ExpoConfig => {
  const apiKey =
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || 'YOUR_GOOGLE_MAPS_API_KEY';

  return {
    ...config,
    ...base,
    android: {
      ...base.android,
      config: {
        ...base.android?.config,
        googleMaps: { apiKey },
      },
    },
  };
};
