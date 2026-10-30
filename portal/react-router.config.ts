import type { Config } from '@react-router/dev/config';

export default {
  ssr: true,
  allowedActionOrigins: ['stage-merchant.dxp.dtic.com.ph'],
  future: {
    unstable_optimizeDeps: true,
  },
} satisfies Config;
