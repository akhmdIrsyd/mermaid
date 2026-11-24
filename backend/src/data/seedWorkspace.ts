import type { PoolClient } from 'pg';

const DEFAULT_PIPELINE_CODE = `---
config:
  theme: base
  themeVariables:
    fontFamily: ''
    fontSize: 16px
    primaryColor: '#ffffff'
    primaryTextColor: '#111111'
    primaryBorderColor: '#333333'
    lineColor: '#333333'
  flowchart:
    nodeSpacing: 30
    rankSpacing: 35
    curve: basis
    padding: 14
    layout: dagre
---
flowchart LR
  subgraph S1["<b>1. Data Ingestion &amp; Preprocessing Pipeline</b>"]
    direction LR
    A1["<b>Yahoo Finance API</b><br/>5 Saham Bank + 1 IHSG"]
    A2["<b>Cleaning &amp; Alignment</b><br/>Adj Close / Close, Dropna"]
    A3["<b>Normalization</b><br/>MinMaxScaler"]
    A4["<b>Train/Test Split</b><br/>85% Train, 15% Test"]
    A5["<b>Sliding Window</b><br/>seq_len=30<br/>X:(N,30,6), y:(N,6)"]
    A1 --> A2 --> A3 --> A4 --> A5
  end

  subgraph S2["<b>2. Hybrid Spatio-Temporal GNN-BiGRU Model</b>"]
    direction TB
    B_IN["<b>Input Tensor</b><br/>X: (B, 30, 6)"]
    B_A["<b>[Block A]</b><br/>Adaptive Graph Learning<br/>Learnable Matrix + Node Embeddings"]
    B_B["<b>[Block B]</b><br/>Multi-Hop Spatial GNN<br/>n_hops=2 + GAT Attention"]
    B_C["<b>[Block C]</b><br/>Temporal BiGRU &amp; Attention<br/>2-Layer BiGRU + Multi-Head Attn"]
    B_D["<b>[Block D]</b><br/>Multi-Branch Feature Extractor<br/>Stats + Multi-Scale Conv1D + Cross-Stk"]
    B_F["<b>[Block F]</b><br/>Deep Fusion &amp; Gated Residual Head"]

    B_IN --> B_A
    B_A -->|"Adjacency Matrix A"| B_B
    B_B -->|"Spatial Embeddings"| B_C
    B_B --> B_D
    B_IN -.->|"Residual"| B_F
    B_C -->|"Temporal Vectors"| B_F
    B_D -->|"Auxiliary Features"| B_F
  end

  subgraph S3["<b>3. Prediction &amp; Evaluation Pipeline</b>"]
    direction LR
    C1["<b>Model Predictions</b><br/>y_scaled (N, 6)"]
    C2["<b>Inverse Transform</b><br/>MinMaxScaler"]
    C3["<b>Performance Evaluation</b><br/>Huber Loss, MAE, RMSE, MAPE"]
    C4["<b>Visualization &amp; Analysis</b><br/>Actual vs Predicted &amp; Loss Curves"]
    C1 --> C2 --> C3 --> C4
  end

  A5 -->|"X_train / X_test"| B_IN
  B_F --> C1
`;

const MICROSERVICES_CODE = `---
config:
  theme: base
  themeVariables:
    fontFamily: 'Inter, sans-serif'
    fontSize: '14px'
    primaryColor: '#ffffff'
    primaryTextColor: '#0f172a'
    primaryBorderColor: '#334155'
    lineColor: '#64748b'
  flowchart:
    nodeSpacing: 36
    rankSpacing: 44
    curve: basis
    padding: 14
    layout: dagre
---
flowchart LR
  subgraph Edge["Edge & Ingress"]
    Client(["Web / Mobile Clients"])
    CDN["Global CDN / WAF"]
    GW["API Gateway & Rate Limiter"]
    Client --> CDN --> GW
  end

  subgraph Services["Core Microservices"]
    Auth["Auth & Identity Service"]
    Orders["Order Orchestrator"]
    Billing["Billing & Payments"]
    Notify["Notification Worker"]
  end

  subgraph Data["Messaging & Storage"]
    Kafka{{"Apache Kafka Event Bus"}}
    Redis[("Redis Cluster")]
    PG[("PostgreSQL Primary")]
    S3[("Object Storage")]
  end

  GW --> Auth
  GW --> Orders
  GW --> Billing
  Auth --> Redis
  Orders --> PG
  Orders --> Kafka
  Billing --> PG
  Kafka --> Billing
  Kafka --> Notify
  Billing --> S3

  style GW fill:#fdf2f8,stroke:#e0095f,color:#831843
  style Kafka fill:#eff6ff,stroke:#2563eb,color:#1e3a8a
  style PG fill:#ecfdf5,stroke:#059669,color:#064e3b
`;

const OAUTH_CODE = `---
config:
  theme: base
  themeVariables:
    fontFamily: 'Inter, sans-serif'
    fontSize: '14px'
    primaryColor: '#fdf2f8'
    primaryTextColor: '#1e1b2e'
    primaryBorderColor: '#e0095f'
    lineColor: '#475569'
---
sequenceDiagram
  autonumber
  actor User as End User
  participant App as SPA Client
  participant Auth as Identity Provider
  participant API as Protected API

  User->>App: Click "Sign In"
  App->>Auth: POST /api/auth/login (email, password)
  Auth-->>App: 200 OK { token (JWT), user }
  App->>API: GET /api/workspace (Bearer JWT)
  API-->>App: 200 OK { folders, diagrams }
`;

export async function seedStarterWorkspaceForUser(
  client: PoolClient,
  userId: string
): Promise<string> {
  const now = Date.now();
  const folders = [
    { id: 'personal', name: 'Personal files', createdAt: now },
    { id: 'architecture', name: 'System Architecture', createdAt: now },
    { id: 'research', name: 'Research & ML', createdAt: now },
  ];

  for (const folder of folders) {
    await client.query(
      `INSERT INTO folders (id, user_id, name, created_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, id) DO NOTHING`,
      [folder.id, userId, folder.name, folder.createdAt]
    );
  }

  const primaryId = 'diag-ml-pipeline';
  const starterDiagrams = [
    {
      id: primaryId,
      folderId: 'personal',
      title: 'Data Pipeline for GNN-BiGRU',
      code: DEFAULT_PIPELINE_CODE,
      notes:
        '## Hybrid Spatio-Temporal GNN-BiGRU Pipeline\n\n- **Stage 1**: Data ingestion, cleaning, MinMaxScaler normalization, sliding window.\n- **Stage 2**: Adaptive graph learning + Multi-Hop Spatial GNN + BiGRU + Deep Fusion.\n- **Stage 3**: Inverse transform & evaluation metrics (Huber, MAE, RMSE, MAPE).',
      favorite: true,
      versions: [
        {
          id: 'ver-init-1',
          timestamp: now,
          label: 'Initial 3-Stage Pipeline',
          code: DEFAULT_PIPELINE_CODE,
          isManual: true,
        },
      ],
      createdAt: now - 3600_000 * 2,
      updatedAt: now,
    },
    {
      id: 'diag-microservices',
      folderId: 'architecture',
      title: 'Cloud Microservices Architecture',
      code: MICROSERVICES_CODE,
      notes: 'Production topology for API Gateway, Kafka event bus, and storage tier.',
      favorite: false,
      versions: [],
      createdAt: now - 3600_000 * 12,
      updatedAt: now - 3600_000 * 2,
    },
    {
      id: 'diag-oauth',
      folderId: 'architecture',
      title: 'JWT Auth Sequence Flow',
      code: OAUTH_CODE,
      notes: 'Authentication handshake between Frontend SPA and Express PostgreSQL Backend.',
      favorite: true,
      versions: [],
      createdAt: now - 3600_000 * 24,
      updatedAt: now - 3600_000 * 4,
    },
  ];

  for (const d of starterDiagrams) {
    await client.query(
      `INSERT INTO diagrams (
         id, user_id, folder_id, title, code, notes, favorite, locked,
         placement_mode, manual_offsets, edge_adjustments, sticky_notes,
         versions, comments, created_at, updated_at
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,false,'auto','{}'::jsonb,'{}'::jsonb,'[]'::jsonb,$8::jsonb,'[]'::jsonb,$9,$10)
       ON CONFLICT (user_id, id) DO NOTHING`,
      [
        d.id,
        userId,
        d.folderId,
        d.title,
        d.code,
        d.notes,
        d.favorite,
        JSON.stringify(d.versions),
        d.createdAt,
        d.updatedAt,
      ]
    );
  }

  await client.query(`UPDATE users SET active_diagram_id = $1 WHERE id = $2`, [
    primaryId,
    userId,
  ]);

  return primaryId;
}
