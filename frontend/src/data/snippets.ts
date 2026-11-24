import type { SnippetItem } from '../types';

export const CODE_SNIPPETS: SnippetItem[] = [
  {
    id: 'snip-node-rect',
    label: 'Rectangle Node',
    category: 'Flowchart',
    description: 'Standard process box',
    code: '  N1["Process Step"]',
  },
  {
    id: 'snip-node-rounded',
    label: 'Rounded Node',
    category: 'Flowchart',
    description: 'Soft rounded box',
    code: '  N2("Rounded Step")',
  },
  {
    id: 'snip-node-decision',
    label: 'Decision Diamond',
    category: 'Flowchart',
    description: 'Conditional branching',
    code: '  D1{"Condition?"}\n  D1 -->|Yes| YesNode["Proceed"]\n  D1 -->|No| NoNode["Fallback"]',
  },
  {
    id: 'snip-node-db',
    label: 'Database Cylinder',
    category: 'Flowchart',
    description: 'Storage / DB node',
    code: '  DB[("Database")]',
  },
  {
    id: 'snip-subgraph',
    label: 'Subgraph Group',
    category: 'Flowchart',
    description: 'Grouped container with direction',
    code: '  subgraph Group1["<b>Module Group</b>"]\n    direction TB\n    G1["Step A"] --> G2["Step B"]\n  end',
  },
  {
    id: 'snip-edge-dotted',
    label: 'Dotted Labeled Link',
    category: 'Flowchart',
    description: 'Dashed arrow with label',
    code: '  A -.->|"Async Event"| B',
  },
  {
    id: 'snip-classdef',
    label: 'Custom Class Style',
    category: 'Styling',
    description: 'Reusable classDef highlight',
    code: '  classDef accent fill:#fdf2f8,stroke:#e0095f,stroke-width:2px,color:#831843\n  class A1 accent',
  },
  {
    id: 'snip-style-node',
    label: 'Inline Node Style',
    category: 'Styling',
    description: 'Direct fill & border styling',
    code: '  style A1 fill:#eff6ff,stroke:#2563eb,stroke-width:2px,color:#1e3a8a',
  },
  {
    id: 'snip-seq-alt',
    label: 'Sequence Alt/Else',
    category: 'Sequence',
    description: 'Conditional sequence block',
    code: '  alt Success\n    API-->>Client: 200 OK\n  else Error\n    API-->>Client: 400 Bad Request\n  end',
  },
  {
    id: 'snip-seq-loop',
    label: 'Sequence Loop',
    category: 'Sequence',
    description: 'Retry or polling loop',
    code: '  loop Every 5 seconds\n    Client->>Server: Heartbeat Ping\n    Server-->>Client: Pong\n  end',
  },
  {
    id: 'snip-er-entity',
    label: 'ER Table Entity',
    category: 'Database',
    description: 'Table with PK & FK columns',
    code: '  TABLE_NAME {\n    uuid id PK\n    uuid parent_id FK\n    string name\n    timestamp created_at\n  }',
  },
  {
    id: 'snip-frontmatter-elk',
    label: 'ELK Frontmatter Preset',
    category: 'Config',
    description: 'Switch diagram to ELK adaptive layout',
    code: `---\nconfig:\n  theme: base\n  layout: elk\n  flowchart:\n    nodeSpacing: 35\n    rankSpacing: 45\n    curve: basis\n---`,
  },
];

export interface QuickShapeItem {
  id: string;
  label: string;
  syntaxPreview: string;
  snippet: (nodeId: string) => string;
}

export const QUICK_SHAPES: QuickShapeItem[] = [
  {
    id: 'rect',
    label: 'Rectangle',
    syntaxPreview: 'A["Label"]',
    snippet: (id) => `  ${id}["New Process"]`,
  },
  {
    id: 'rounded',
    label: 'Rounded',
    syntaxPreview: 'A("Label")',
    snippet: (id) => `  ${id}("Rounded Step")`,
  },
  {
    id: 'stadium',
    label: 'Stadium / Pill',
    syntaxPreview: 'A(["Start"])',
    snippet: (id) => `  ${id}(["Start / End"])`,
  },
  {
    id: 'diamond',
    label: 'Decision',
    syntaxPreview: 'A{"Check?"}',
    snippet: (id) => `  ${id}{"Decision?"}`,
  },
  {
    id: 'cylinder',
    label: 'Database',
    syntaxPreview: 'A[("DB")]',
    snippet: (id) => `  ${id}[("Database")]`,
  },
  {
    id: 'hexagon',
    label: 'Prepare / Hex',
    syntaxPreview: 'A{{"Queue"}}',
    snippet: (id) => `  ${id}{{"Event Bus"}}`,
  },
  {
    id: 'circle',
    label: 'Circle',
    syntaxPreview: 'A(("Hub"))',
    snippet: (id) => `  ${id}(("Hub"))`,
  },
  {
    id: 'subroutine',
    label: 'Subroutine',
    syntaxPreview: 'A[["Service"]]',
    snippet: (id) => `  ${id}[["Microservice"]]`,
  },
  {
    id: 'parallelogram',
    label: 'Input / Output',
    syntaxPreview: 'A[/"Data"/]',
    snippet: (id) => `  ${id}[/"Input / Output"/]`,
  },
  {
    id: 'subgraph',
    label: 'Subgraph Container',
    syntaxPreview: 'subgraph ... end',
    snippet: (id) => `  subgraph ${id}["<b>New Group</b>"]\n    direction TB\n    ${id}_1["Node 1"] --> ${id}_2["Node 2"]\n  end`,
  },
];

export interface ArchitectureBlockItem {
  id: string;
  label: string;
  category: 'Cloud' | 'Data' | 'AI/ML';
  code: (id: string) => string;
}

export const CLOUD_BLOCKS: ArchitectureBlockItem[] = [
  {
    id: 'api-gw',
    label: 'API Gateway',
    category: 'Cloud',
    code: (id) => `  ${id}["<b>API Gateway</b><br/>REST / GraphQL Ingress"]`,
  },
  {
    id: 'k8s',
    label: 'Kubernetes Cluster',
    category: 'Cloud',
    code: (id) =>
      `  subgraph ${id}["<b>Kubernetes Cluster</b>"]\n    direction LR\n    ${id}_POD1["Service Pod A"]\n    ${id}_POD2["Service Pod B"]\n  end`,
  },
  {
    id: 'cache',
    label: 'Redis Cache',
    category: 'Data',
    code: (id) => `  ${id}[("<b>Redis Cache</b><br/>In-Memory KV")]`,
  },
  {
    id: 'kafka',
    label: 'Kafka Queue',
    category: 'Data',
    code: (id) => `  ${id}{{"<b>Apache Kafka</b><br/>Event Streaming"}}`,
  },
  {
    id: 'warehouse',
    label: 'Data Warehouse',
    category: 'Data',
    code: (id) => `  ${id}[("<b>Data Warehouse</b><br/>Analytics / OLAP")]`,
  },
  {
    id: 'ml-block',
    label: 'Neural Network Block',
    category: 'AI/ML',
    code: (id) => `  ${id}["<b>Transformer / GNN Layer</b><br/>Multi-Head Attention + Norm"]`,
  },
  {
    id: 'etl',
    label: 'ETL Preprocessing',
    category: 'AI/ML',
    code: (id) =>
      `  subgraph ${id}["<b>ETL Pipeline</b>"]\n    direction LR\n    ${id}_E["Extract"] --> ${id}_T["Transform"] --> ${id}_L["Load"]\n  end`,
  },
];

export interface DocSection {
  id: string;
  title: string;
  summary: string;
  syntax: string;
  tips: string[];
}

export const MERMAID_DOCS_SECTIONS: DocSection[] = [
  {
    id: 'doc-frontmatter',
    title: 'YAML Frontmatter Configuration',
    summary: 'Control themes, custom color palettes, typography, spacing, edge curves, and layout engines cleanly at the top of your diagram.',
    syntax: `---
config:
  theme: base
  look: classic # or handDrawn
  layout: dagre # or elk
  themeVariables:
    primaryColor: '#ffffff'
    primaryTextColor: '#111111'
    primaryBorderColor: '#333333'
    lineColor: '#333333'
  flowchart:
    nodeSpacing: 30
    rankSpacing: 35
    curve: basis
    padding: 14
---`,
    tips: [
      'Use theme: base whenever customizing themeVariables.',
      'Switch layout: elk for complex dense graphs with fewer edge crossings.',
      'Set look: handDrawn for whiteboard / sketch-style presentations.',
    ],
  },
  {
    id: 'doc-flowchart',
    title: 'Flowcharts & Subgraphs',
    summary: 'Build directed graphs in LR, TB, RL, or BT directions with rich node shapes, HTML labels, and nested subgraphs.',
    syntax: `flowchart LR
  A["<b>Bold Title</b><br/>Subtitle"] -->|"Edge Label"| B{"Decision?"}
  B -->|Yes| C(["Success"])
  B -.->|Retry| A
  subgraph Group["Container"]
    direction TB
    C --> D[("Database")]
  end`,
    tips: [
      'Always wrap labels containing special characters (parentheses, colons, slashes) in double quotes.',
      'Use &amp; instead of raw & inside HTML labels like <b>A &amp; B</b>.',
      'Use direction LR or TB inside any subgraph independently.',
    ],
  },
  {
    id: 'doc-sequence',
    title: 'Sequence Diagrams',
    summary: 'Document API calls, auth handshakes, async messaging, loops, and conditional alt/else branches.',
    syntax: `sequenceDiagram
  autonumber
  actor User
  participant Web as Web App
  participant API
  User->>Web: Click Export
  Web->>API: POST /export
  API-->>Web: 200 OK (Binary Stream)`,
    tips: [
      '->> draws solid arrow, -->> draws dashed reply arrow.',
      'Add autonumber at the top to number every interaction automatically.',
      'Use rect rgb(248, 250, 252) ... end to highlight logical phases.',
    ],
  },
  {
    id: 'doc-er',
    title: 'Entity Relationship (ER) Diagrams',
    summary: 'Model relational database schemas with cardinality markers, primary/foreign keys, and column types.',
    syntax: `erDiagram
  CUSTOMER ||--o{ ORDER : places
  ORDER ||--|{ LINE_ITEM : contains
  CUSTOMER {
    uuid id PK
    string email UK
  }`,
    tips: [
      '||--o{ means one-to-zero-or-more; ||--|{ means one-to-one-or-more.',
      'Mark attributes with PK, FK, or UK after the column name.',
    ],
  },
  {
    id: 'doc-styling',
    title: 'Node Styling & ClassDefs',
    summary: 'Highlight specific nodes or groups with inline style rules or reusable classDef declarations.',
    syntax: `flowchart LR
  A["Primary"] --> B["Warning"]
  classDef rose fill:#fdf2f8,stroke:#e0095f,stroke-width:2px,color:#831843
  class A rose
  style B fill:#fffbeb,stroke:#d97706,stroke-dasharray:5 5`,
    tips: [
      'In Visual & Code mode, click any node on the canvas to style it visually without typing CSS!',
      'Attach a class inline using A["Node"]:::rose.',
    ],
  },
];
