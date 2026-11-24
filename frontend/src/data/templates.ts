import type { DiagramDocument, DiagramFolder, DiagramTemplate } from '../types';

export const DEFAULT_PIPELINE_CODE = `---
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

export const DIAGRAM_TEMPLATES: DiagramTemplate[] = [
  {
    id: 'tpl-ml-pipeline',
    title: 'Data Pipeline & ML Architecture',
    category: 'Architecture',
    badge: 'Featured',
    description: 'Publication-ready 3-stage ML pipeline with subgraphs, tensor shapes, and residual skip connections.',
    code: DEFAULT_PIPELINE_CODE,
  },
  {
    id: 'tpl-microservices',
    title: 'Cloud Microservices & Event Bus',
    category: 'Architecture',
    badge: 'Pro',
    description: 'Modern cloud-native backend with API Gateway, Kafka event bus, Redis cache, and polyglot databases.',
    code: `---
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
`,
  },
  {
    id: 'tpl-oauth-sequence',
    title: 'OAuth 2.0 + PKCE Auth Flow',
    category: 'Sequence',
    badge: 'Popular',
    description: 'Detailed authentication sequence with PKCE code verifier, JWT issuance, and refresh token rotation.',
    code: `---
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
  App->>App: Generate code_verifier & code_challenge (S256)
  App->>Auth: GET /authorize (client_id, code_challenge, state)
  Auth-->>User: Render Login + MFA Prompt
  User->>Auth: Submit Credentials + Passkey
  Auth-->>App: 302 Redirect (?code=AUTH_CODE&state=...)

  rect rgb(248, 250, 252)
    Note over App,Auth: Token Exchange (PKCE Verified)
    App->>Auth: POST /oauth/token (code, code_verifier)
    Auth->>Auth: Verify SHA256(code_verifier) == code_challenge
    Auth-->>App: 200 OK { access_token (JWT), refresh_token }
  end

  App->>API: GET /v1/workspace (Bearer access_token)
  API->>API: Validate JWT signature & scopes
  API-->>App: 200 OK Workspace JSON
`,
  },
  {
    id: 'tpl-ecommerce-er',
    title: 'SaaS & E-Commerce ER Schema',
    category: 'Database',
    badge: 'SQL Ready',
    description: 'Normalized relational schema with Users, Workspaces, Subscriptions, Orders, Line Items, and Products.',
    code: `---
config:
  theme: base
  themeVariables:
    fontFamily: 'Inter, sans-serif'
    fontSize: '14px'
    primaryColor: '#ffffff'
    primaryTextColor: '#0f172a'
    primaryBorderColor: '#334155'
    lineColor: '#64748b'
---
erDiagram
  USERS ||--o{ WORKSPACES : owns
  USERS ||--o{ ORDERS : places
  WORKSPACES ||--|| SUBSCRIPTIONS : has
  ORDERS ||--|{ ORDER_ITEMS : contains
  PRODUCTS ||--o{ ORDER_ITEMS : referenced_in
  CATEGORIES ||--o{ PRODUCTS : classifies

  USERS {
    uuid id PK
    string email UK
    string full_name
    string role
    timestamp created_at
  }

  WORKSPACES {
    uuid id PK
    uuid owner_id FK
    string slug UK
    string plan_tier
  }

  SUBSCRIPTIONS {
    uuid id PK
    uuid workspace_id FK
    string stripe_sub_id UK
    string status
    timestamp current_period_end
  }

  ORDERS {
    uuid id PK
    uuid user_id FK
    decimal total_amount
    string currency
    string status
    timestamp placed_at
  }

  ORDER_ITEMS {
    uuid id PK
    uuid order_id FK
    uuid product_id FK
    int quantity
    decimal unit_price
  }

  PRODUCTS {
    uuid id PK
    uuid category_id FK
    string sku UK
    string title
    decimal price
    int stock_qty
  }

  CATEGORIES {
    uuid id PK
    string name
    string slug UK
  }
`,
  },
  {
    id: 'tpl-flowchart-decision',
    title: 'CI/CD Release Pipeline',
    category: 'Flowchart',
    description: 'Automated build, test, security scan, canary rollout, and auto-rollback decision workflow.',
    code: `---
config:
  theme: base
  themeVariables:
    fontFamily: 'Inter, sans-serif'
    fontSize: '14px'
    primaryColor: '#ffffff'
    primaryTextColor: '#0f172a'
    primaryBorderColor: '#334155'
    lineColor: '#475569'
  flowchart:
    nodeSpacing: 32
    rankSpacing: 40
    curve: basis
    padding: 12
    layout: dagre
---
flowchart TD
  Start(["Git Push / PR Merge"]) --> Lint["Lint & Type Check"]
  Lint --> Tests["Unit & Integration Tests"]
  Tests --> Scan["SAST & Container Security Scan"]
  Scan --> Pass{"All Checks Green?"}

  Pass -->|No| NotifyFail["Notify Slack & Block Merge"]
  Pass -->|Yes| Build["Build Signed Docker Image"]
  Build --> Staging["Deploy to Staging"]
  Staging --> E2E["Run Playwright E2E Suite"]
  E2E --> Approve{"QA Sign-Off?"}

  Approve -->|Changes Needed| NotifyFail
  Approve -->|Approved| Canary["Canary Rollout (10% Traffic)"]
  Canary --> Metrics{"Error Rate < 0.1%?"}
  Metrics -->|No| Rollback["Instant Auto-Rollback"]
  Metrics -->|Yes| Prod["Full Production Rollout (100%)"]
  Prod --> Done(["Release Tag & Changelog Published"])

  style Start fill:#eff6ff,stroke:#2563eb,color:#1e3a8a
  style Done fill:#ecfdf5,stroke:#059669,color:#064e3b
  style Rollback fill:#fff1f2,stroke:#e11d48,color:#881337
`,
  },
  {
    id: 'tpl-state-machine',
    title: 'Order Fulfillment State Machine',
    category: 'Software',
    description: 'Composite state diagram covering payment validation, warehouse picking, shipping, and returns.',
    code: `---
config:
  theme: base
  themeVariables:
    fontFamily: 'Inter, sans-serif'
    fontSize: '14px'
    primaryColor: '#ffffff'
    primaryTextColor: '#0f172a'
    primaryBorderColor: '#334155'
    lineColor: '#475569'
---
stateDiagram-v2
  [*] --> Draft
  Draft --> PendingPayment : Checkout Submitted
  PendingPayment --> PaymentFailed : Declined / Timeout
  PaymentFailed --> PendingPayment : Retry Payment
  PaymentFailed --> Cancelled : Expire (24h)
  PendingPayment --> Paid : Webhook Confirmed

  state Fulfillment {
    [*] --> Picking
    Picking --> Packed : QC Verified
    Packed --> HandedToCarrier : Label Scanned
  }

  Paid --> Fulfillment : Dispatch to Warehouse
  Fulfillment --> InTransit : Carrier Pickup
  InTransit --> Delivered : Proof of Delivery
  Delivered --> ReturnRequested : Within 14 Days
  ReturnRequested --> Refunded : Item Inspected
  Delivered --> [*]
  Cancelled --> [*]
  Refunded --> [*]
`,
  },
  {
    id: 'tpl-class-diagram',
    title: 'Clean Architecture Class Model',
    category: 'Software',
    description: 'Domain-driven design class diagram with interfaces, entities, value objects, and repositories.',
    code: `---
config:
  theme: base
  themeVariables:
    fontFamily: 'Inter, sans-serif'
    fontSize: '14px'
    primaryColor: '#ffffff'
    primaryTextColor: '#0f172a'
    primaryBorderColor: '#334155'
    lineColor: '#475569'
---
classDiagram
  class DiagramController {
    -DiagramService service
    +create(req) Response
    +exportSvg(id) Stream
    +restoreVersion(id, verId) Response
  }

  class DiagramService {
    -IDiagramRepository repo
    -EventBus bus
    +saveDiagram(dto) Diagram
    +createSnapshot(id, label) Version
  }

  class IDiagramRepository {
    <<interface>>
    +findById(id) Diagram
    +save(diagram) void
    +delete(id) void
  }

  class PostgresDiagramRepo {
    -Pool db
    +findById(id) Diagram
    +save(diagram) void
    +delete(id) void
  }

  class Diagram {
    +UUID id
    +String title
    +String sourceCode
    +Boolean locked
    +addVersion(label) Version
  }

  class Version {
    +UUID id
    +DateTime createdAt
    +String snapshotCode
  }

  DiagramController --> DiagramService
  DiagramService --> IDiagramRepository
  PostgresDiagramRepo ..|> IDiagramRepository
  Diagram "1" *-- "many" Version : tracks
`,
  },
  {
    id: 'tpl-gantt',
    title: 'Product Launch Gantt Roadmap',
    category: 'Planning',
    badge: 'PM',
    description: 'Multi-phase launch schedule with milestones, dependencies, and critical path markers.',
    code: `---
config:
  theme: base
  themeVariables:
    fontFamily: 'Inter, sans-serif'
    fontSize: '14px'
    primaryColor: '#fdf2f8'
    primaryTextColor: '#0f172a'
    primaryBorderColor: '#e0095f'
    lineColor: '#64748b'
---
gantt
  title Q1–Q2 Platform Release Roadmap
  dateFormat YYYY-MM-DD
  axisFormat %b %d

  section Discovery & Design
    User Research & Specs       :done, des1, 2026-01-05, 14d
    Design System & Wireframes  :done, des2, after des1, 12d
    Architecture Sign-off       :milestone, m1, after des2, 0d

  section Core Engineering
    Graph Engine & ELK Layout   :active, dev1, after des2, 21d
    CodeMirror & Frontmatter    :active, dev2, after des2, 18d
    Export Studio (PNG/SVG/PDF) :dev3, after dev1, 12d
    Version History & Diffs     :dev4, after dev2, 10d

  section Quality & Launch
    Load & Cross-Browser QA     :crit, qa1, after dev3, 10d
    Security Audit              :crit, qa2, after dev4, 7d
    Public v2.0 Launch          :milestone, m2, after qa1, 0d
`,
  },
  {
    id: 'tpl-mindmap',
    title: 'Product Strategy Mindmap',
    category: 'Planning',
    description: 'Hierarchical mindmap organizing product pillars, technical stack, growth channels, and KPIs.',
    code: `---
config:
  theme: default
---
mindmap
  root((Mermaid Studio Pro))
    Authoring Experience
      CodeMirror 6 Editor
      Live Auto-Update
      Frontmatter Visual Sync
      Reusable Snippets
    Visual Canvas
      Infinite Pan & Zoom
      Dagre & ELK Layouts
      Hand-Drawn Mode
      Node Style Inspector
    Collaboration
      Version History & Diffs
      Pinned Canvas Comments
      Instant Share Links
      Presentation Mode
    Export Studio
      Ultra-HD PNG (up to 8x)
      Standalone Vector SVG
      Print-Ready PDF
      Markdown & Embed Code
`,
  },
  {
    id: 'tpl-architecture-beta',
    title: 'Cloud Architecture (Beta Icons)',
    category: 'Architecture',
    badge: 'v11',
    description: 'Native Mermaid v11 architecture-beta diagram with cloud groups, disks, databases, and servers.',
    code: `architecture-beta
  group vpc(cloud)[Production VPC]

  service lb(internet)[Load Balancer] in vpc
  service api(server)[API Cluster] in vpc
  service worker(server)[Async Workers] in vpc
  service db(database)[Primary Postgres] in vpc
  service cache(disk)[Redis Cache] in vpc
  service storage(disk)[S3 Media Bucket] in vpc

  lb:R -- L:api
  api:R -- L:db
  api:B -- T:cache
  api:T -- B:worker
  worker:R -- L:storage
`,
  },
  {
    id: 'tpl-gitgraph',
    title: 'GitFlow Branching Strategy',
    category: 'Software',
    description: 'Clean Git commit graph showing main, develop, feature branches, hotfix, and release tags.',
    code: `---
config:
  theme: base
  themeVariables:
    fontFamily: 'Inter, sans-serif'
    fontSize: '14px'
    primaryColor: '#eff6ff'
    primaryTextColor: '#0f172a'
    primaryBorderColor: '#2563eb'
---
gitGraph
  commit id: "init" tag: "v1.0.0"
  branch develop
  checkout develop
  commit id: "setup-ci"
  branch feature/elk-layout
  checkout feature/elk-layout
  commit id: "add-elk"
  commit id: "tune-spacing"
  checkout develop
  merge feature/elk-layout
  branch feature/export-pdf
  checkout feature/export-pdf
  commit id: "pdf-engine"
  checkout main
  branch hotfix/svg-font
  commit id: "fix-svg-font"
  checkout main
  merge hotfix/svg-font tag: "v1.0.1"
  checkout develop
  merge hotfix/svg-font
  merge feature/export-pdf
  checkout main
  merge develop tag: "v1.1.0"
`,
  },
  {
    id: 'tpl-timeline',
    title: 'Company & Product Timeline',
    category: 'Planning',
    description: 'Chronological milestone timeline grouped by quarter or year.',
    code: `timeline
  title Platform Evolution Timeline
  2024 Q1 : Foundation & Prototype
          : First Mermaid Parser Integration
  2024 Q3 : Visual Styling & Themes
          : Custom Frontmatter Engine
  2025 Q1 : ELK Adaptive Layout
          : Ultra-HD Export Pipeline
  2026 Q1 : Workspace Pro Suite
          : Unlimited History, Comments & Live Share
`,
  },
  {
    id: 'tpl-quadrant',
    title: 'Feature Priority Quadrant',
    category: 'Charts & Data',
    description: 'Impact vs. Effort prioritization matrix for product and engineering roadmaps.',
    code: `quadrantChart
  title Feature Impact vs Engineering Effort
  x-axis Low Effort --> High Effort
  y-axis Low Impact --> High Impact
  quadrant-1 Strategic Bets
  quadrant-2 Quick Wins
  quadrant-3 Fill-Ins
  quadrant-4 Re-evaluate
  ELK Layout: [0.32, 0.88]
  8x PNG Export: [0.22, 0.82]
  Theme Studio: [0.38, 0.78]
  Version Diffs: [0.58, 0.84]
  Real-Time Sync: [0.85, 0.90]
  Custom Fonts: [0.25, 0.42]
  Legacy Importer: [0.75, 0.28]
`,
  },
  {
    id: 'tpl-xychart',
    title: 'Revenue & Latency XY Chart',
    category: 'Charts & Data',
    description: 'Combined bar and line chart showing monthly growth metrics.',
    code: `xychart-beta
  title "Monthly Active Workspaces & Render Throughput"
  x-axis [Jan, Feb, Mar, Apr, May, Jun, Jul, Aug]
  y-axis "Active Workspaces (k)" 0 --> 120
  bar [24, 35, 48, 56, 72, 85, 98, 112]
  line [20, 31, 44, 52, 68, 82, 95, 110]
`,
  },
  {
    id: 'tpl-pie',
    title: 'Infrastructure Cost Breakdown',
    category: 'Charts & Data',
    description: 'Clean proportional pie chart for executive reports and dashboards.',
    code: `pie showData
  title Cloud Monthly Infrastructure Spend (%)
  "Compute & Kubernetes" : 44
  "Managed Databases" : 26
  "CDN & Egress" : 14
  "Observability & Logs" : 10
  "Object Storage" : 6
`,
  },
  {
    id: 'tpl-kanban',
    title: 'Sprint Kanban Board',
    category: 'Planning',
    badge: 'v11',
    description: 'Native Mermaid Kanban board tracking backlog, in-progress, review, and shipped tasks.',
    code: `kanban
  Backlog
    id1[Keyboard Shortcuts Cheatsheet]
    id2[Custom Font Uploader]
  In Progress
    id3[Visual Node Style Inspector]
    id4[Ultra-HD 8x PNG Export]
  Review
    id5[ELK Hierarchical Layout]
  Done
    id6[CodeMirror 6 Syntax Highlighter]
    id7[Version History & Diff Viewer]
`,
  },
];

export function createInitialWorkspaceData(): {
  folders: DiagramFolder[];
  diagrams: DiagramDocument[];
} {
  const now = Date.now();
  const folders: DiagramFolder[] = [
    { id: 'personal', name: 'Personal files', createdAt: now },
    { id: 'architecture', name: 'System Architecture', createdAt: now },
    { id: 'research', name: 'Research & ML', createdAt: now },
  ];

  const diagrams: DiagramDocument[] = [
    {
      id: 'diag-ml-pipeline',
      title: 'Data Pipeline for GNN-BiGRU',
      folderId: 'personal',
      code: DEFAULT_PIPELINE_CODE,
      notes:
        '## Hybrid Spatio-Temporal GNN-BiGRU Pipeline\n\n- **Stage 1**: Fetches 5 Indonesian bank stocks + IHSG via Yahoo Finance, aligns dates, scales with `MinMaxScaler`, and slices sliding windows (`seq_len = 30`).\n- **Stage 2**: Combines adaptive adjacency graph learning, multi-hop GAT spatial blocks, 2-layer BiGRU temporal attention, and multi-scale Conv1D auxiliary features.\n- **Stage 3**: Evaluates predictions with Huber Loss, MAE, RMSE, and MAPE.',
      favorite: true,
      locked: false,
      createdAt: now - 3600_000 * 6,
      updatedAt: now - 60_000 * 5,
      versions: [
        {
          id: 'ver-init-1',
          timestamp: now - 3600_000 * 2,
          label: 'Initial 3-Stage Pipeline',
          code: DEFAULT_PIPELINE_CODE,
          isManual: true,
        },
      ],
      comments: [
        {
          id: 'cmt-1',
          author: 'Lead Architect',
          text: 'Check residual connection from Input Tensor directly into Block F — looks super clear with dotted styling.',
          createdAt: now - 1800_000,
          resolved: false,
          replies: [],
        },
      ],
      stickyNotes: [],
    },
    {
      id: 'diag-microservices',
      title: 'Cloud Microservices Architecture',
      folderId: 'architecture',
      code: DIAGRAM_TEMPLATES[1].code,
      notes: 'Production topology for API Gateway, Kafka event bus, and storage tier.',
      favorite: false,
      locked: false,
      createdAt: now - 3600_000 * 24,
      updatedAt: now - 3600_000 * 4,
      versions: [
        {
          id: 'ver-ms-1',
          timestamp: now - 3600_000 * 4,
          label: 'v1.0 Cloud Topology',
          code: DIAGRAM_TEMPLATES[1].code,
          isManual: true,
        },
      ],
      comments: [],
      stickyNotes: [],
    },
    {
      id: 'diag-oauth',
      title: 'OAuth 2.0 PKCE Sequence',
      folderId: 'architecture',
      code: DIAGRAM_TEMPLATES[2].code,
      notes: 'Security review diagram for SPA + PKCE login flow.',
      favorite: true,
      locked: false,
      createdAt: now - 3600_000 * 48,
      updatedAt: now - 3600_000 * 12,
      versions: [],
      comments: [],
      stickyNotes: [],
    },
    {
      id: 'diag-er',
      title: 'SaaS E-Commerce ER Schema',
      folderId: 'personal',
      code: DIAGRAM_TEMPLATES[3].code,
      notes: 'Core PostgreSQL relational tables for billing & orders.',
      favorite: false,
      locked: false,
      createdAt: now - 3600_000 * 72,
      updatedAt: now - 3600_000 * 20,
      versions: [],
      comments: [],
      stickyNotes: [],
    },
  ];

  return { folders, diagrams };
}
