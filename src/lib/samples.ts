export interface Sample {
  id: string;
  name: string;
  description: string;
  content: string;
}

const escapedApiResponse = JSON.stringify(
  JSON.stringify({
    status: 200,
    requestId: '8f14e45f-ea7b-4c1e-9c2d-0d1f7a2b3c4d',
    data: {
      user: { id: 4821, email: 'ada@example.com', roles: ['admin', 'billing'], verified: true },
      session: { expiresAt: '2026-01-14T09:31:00Z', ip: '203.0.113.42', mfa: null },
      notes: 'Line one\nLine two\tafter a tab — "quoted" ünïcode',
    },
  }),
);

const ndjsonLog = [
  '{"ts":"2026-01-14T09:30:01Z","level":"info","msg":"request.start","route":"/v1/orders","id":"a1"}',
  '{"ts":"2026-01-14T09:30:01Z","level":"debug","msg":"db.query","ms":12.4,"rows":38}',
  '{"ts":"2026-01-14T09:30:02Z","level":"warn","msg":"rate.limit.near","remaining":4}',
  '{"ts":"2026-01-14T09:30:02Z","level":"info","msg":"request.end","status":200,"ms":143.8}',
].join('\n');

const brokenConfig = `{
  // deployment profile
  name: 'edge-worker',
  replicas: 3,
  resources: {
    cpu: '250m',
    memory: '512Mi',
  },
  featureFlags: {
    newRouter: True,
    legacyCache: False,
    experimentBucket: None,
  },
  regions: ['iad', 'fra', 'sin',],
}`;

const nestedConfig = JSON.stringify(
  {
    version: 3,
    pipeline: {
      stages: [
        {
          name: 'build',
          steps: [
            { run: 'npm ci', env: { CI: 'true', NODE_ENV: 'production' } },
            { run: 'npm run build', artifacts: ['dist/**'] },
          ],
        },
        {
          name: 'deploy',
          needs: ['build'],
          matrix: { region: ['iad', 'fra'], channel: ['canary', 'stable'] },
          steps: [{ run: 'deploy --region $REGION --channel $CHANNEL', timeoutSeconds: 900 }],
        },
      ],
      notifications: { onFailure: ['slack:#deploys', 'pager:oncall'], onSuccess: [] },
    },
    metadata: { owner: 'platform', tags: ['infra', 'ci'], archived: false, budget: 12500.75 },
  },
  null,
  2,
);

export const SAMPLES: Sample[] = [
  {
    id: 'escaped-api',
    name: 'Double-escaped API response',
    description: 'A JSON body that was stringified twice before it reached the log.',
    content: escapedApiResponse,
  },
  {
    id: 'log-prefixed',
    name: 'Log line with a payload',
    description: 'Timestamp, level and label in front of an escaped payload.',
    content:
      '2026-01-14T09:30:02.481Z INFO  http.client response: "{\\"ok\\":true,\\"items\\":[{\\"sku\\":\\"A-19\\",\\"qty\\":2},{\\"sku\\":\\"B-04\\",\\"qty\\":1}],\\"total\\":48.5}"',
  },
  {
    id: 'ndjson',
    name: 'NDJSON log stream',
    description: 'Four JSON Lines documents that can be wrapped into an array.',
    content: ndjsonLog,
  },
  {
    id: 'broken-config',
    name: 'Broken config (needs repair)',
    description: 'Comments, single quotes, unquoted keys, Python literals and trailing commas.',
    content: brokenConfig,
  },
  {
    id: 'nested-config',
    name: 'Large nested config',
    description: 'A well-formed, deeply nested document for the tree view.',
    content: nestedConfig,
  },
];
