const API_BASE = 'http://localhost:5050';

export interface KnowledgeNode {
  id: string;
  branchId: string;
  label: string;
  sublabel?: string;
  weight: number; // 0-1, controls node size
  source?: 'static' | 'memory' | 'note' | 'obsidian';
}

export interface KnowledgeBranch {
  id: string;
  label: string;
  color: string;
  gradientEnd: string;
  angle: number; // degrees from top (0 = up, clockwise)
  nodes: KnowledgeNode[];
}

export interface KnowledgeGraph {
  centerLabel: string;
  centerSublabel: string;
  branches: KnowledgeBranch[];
}

// Static branch definitions — always shown as the backbone
const STATIC_BRANCHES: KnowledgeBranch[] = [
  {
    id: 'memory',
    label: '기억·개념',
    color: '#8b5cf6',
    gradientEnd: '#6d28d9',
    angle: -40,
    nodes: [
      { id: 'm1', branchId: 'memory', label: '주요 프레임워크', sublabel: 'React, Next.js', weight: 0.8, source: 'static' },
      { id: 'm2', branchId: 'memory', label: '아키텍처 패턴', sublabel: 'Clean Architecture', weight: 0.7, source: 'static' },
      { id: 'm3', branchId: 'memory', label: '도메인 지식', sublabel: 'AI Product Design', weight: 0.9, source: 'static' },
      { id: 'm4', branchId: 'memory', label: 'Spring, Kotlin, C#', weight: 0.6, source: 'static' },
    ],
  },
  {
    id: 'tech',
    label: '기술·역량',
    color: '#06b6d4',
    gradientEnd: '#0e7490',
    angle: 30,
    nodes: [
      { id: 't1', branchId: 'tech', label: 'AWS 클라우드 인프라', weight: 0.85, source: 'static' },
      { id: 't2', branchId: 'tech', label: 'LLM Integration', sublabel: 'GPT, Claude, Ollama', weight: 0.9, source: 'static' },
      { id: 't3', branchId: 'tech', label: 'AI Agent 설계', weight: 0.95, source: 'static' },
      { id: 't4', branchId: 'tech', label: 'DevOps, Docker', weight: 0.65, source: 'static' },
    ],
  },
  {
    id: 'project',
    label: '프로젝트',
    color: '#f59e0b',
    gradientEnd: '#d97706',
    angle: 95,
    nodes: [
      { id: 'p1', branchId: 'project', label: 'AIVIS 개인비서', sublabel: '현재 진행중', weight: 1.0, source: 'static' },
      { id: 'p2', branchId: 'project', label: 'AI 에이전트 플랫폼', weight: 0.75, source: 'static' },
      { id: 'p3', branchId: 'project', label: '기업 자동화 솔루션', weight: 0.7, source: 'static' },
      { id: 'p4', branchId: 'project', label: '글로벌 SaaS 론칭', weight: 0.6, source: 'static' },
    ],
  },
  {
    id: 'role',
    label: '역할·직책',
    color: '#ec4899',
    gradientEnd: '#be185d',
    angle: 155,
    nodes: [
      { id: 'r1', branchId: 'role', label: 'CEO & 창업자', weight: 1.0, source: 'static' },
      { id: 'r2', branchId: 'role', label: '프로덕트 오너', weight: 0.85, source: 'static' },
      { id: 'r3', branchId: 'role', label: 'AI 연구원', weight: 0.8, source: 'static' },
      { id: 'r4', branchId: 'role', label: '풀스택 개발자', weight: 0.7, source: 'static' },
    ],
  },
  {
    id: 'learning',
    label: '학습 콘텐츠 AI',
    color: '#3b82f6',
    gradientEnd: '#1d4ed8',
    angle: 215,
    nodes: [
      { id: 'l1', branchId: 'learning', label: 'AI·에이전트 트렌드', weight: 0.9, source: 'static' },
      { id: 'l2', branchId: 'learning', label: '논문 리딩', sublabel: 'Transformer, RAG', weight: 0.8, source: 'static' },
      { id: 'l3', branchId: 'learning', label: '제품 전략 학습', weight: 0.75, source: 'static' },
      { id: 'l4', branchId: 'learning', label: '글로벌 콘텐츠 (AI)', weight: 0.65, source: 'static' },
    ],
  },
  {
    id: 'global',
    label: '글로벌 국제 (외국어)',
    color: '#10b981',
    gradientEnd: '#065f46',
    angle: 275,
    nodes: [
      { id: 'g1', branchId: 'global', label: '영어 비즈니스 커뮤니케이션', weight: 0.8, source: 'static' },
      { id: 'g2', branchId: 'global', label: '글로벌 시장 조사', weight: 0.75, source: 'static' },
      { id: 'g3', branchId: 'global', label: '해외 네트워킹', weight: 0.65, source: 'static' },
      { id: 'g4', branchId: 'global', label: '일본어 비즈니스 (초급)', weight: 0.5, source: 'static' },
    ],
  },
];

interface DynamicNode {
  id: string;
  branch: string;
  label: string;
  sublabel?: string | null;
  source: string;
  weight: number;
}

export class KnowledgeRepository {
  getGraph(): KnowledgeGraph {
    return {
      centerLabel: '최치융 연구원',
      centerSublabel: 'AI Product Builder',
      branches: STATIC_BRANCHES.map(b => ({ ...b, nodes: [...b.nodes] })),
    };
  }

  async getGraphWithDynamicData(): Promise<KnowledgeGraph> {
    const base = this.getGraph();
    try {
      const res = await fetch(`${API_BASE}/api/knowledge/graph`);
      if (!res.ok) return base;
      const json = await res.json();
      const dynamicNodes: DynamicNode[] = json.data ?? [];
      if (dynamicNodes.length === 0) return base;

      // Merge dynamic nodes into the matching branch (deduplicated by label)
      const merged = base.branches.map(branch => {
        const dynamic = dynamicNodes
          .filter(n => n.branch === branch.id)
          .filter(n => !branch.nodes.some(existing => existing.label === n.label))
          .map<KnowledgeNode>(n => ({
            id: n.id,
            branchId: branch.id,
            label: n.label,
            sublabel: n.sublabel ?? undefined,
            weight: Math.min(0.85, n.weight),
            source: n.source as KnowledgeNode['source'],
          }));
        return { ...branch, nodes: [...branch.nodes, ...dynamic] };
      });

      return { ...base, branches: merged };
    } catch {
      return base;
    }
  }

  getBranch(id: string): KnowledgeBranch | undefined {
    return STATIC_BRANCHES.find(b => b.id === id);
  }
}

export const knowledgeService = new KnowledgeRepository();
