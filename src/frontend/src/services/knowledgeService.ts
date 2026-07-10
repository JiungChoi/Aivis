import { apiFetch } from './apiClient';

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
    color: '#a855f7',
    angle: -40,
    nodes: [
      { id: 'm1', branchId: 'memory', label: '주요 프레임워크', sublabel: 'React, Spring, Kotlin, C#', weight: 0.85, source: 'static' },
      { id: 'm2', branchId: 'memory', label: '아키텍처 패턴', sublabel: 'Clean Architecture', weight: 0.75, source: 'static' },
      { id: 'm3', branchId: 'memory', label: '도메인 지식', sublabel: 'AI Product Design', weight: 0.9, source: 'static' },
    ],
  },
  {
    id: 'tech',
    label: '기술·역량',
    color: '#22d3ee',
    angle: 30,
    nodes: [
      { id: 't1', branchId: 'tech', label: 'AWS 클라우드 인프라', weight: 0.85, source: 'static' },
      { id: 't2', branchId: 'tech', label: 'LLM Integration', sublabel: 'GPT, Claude, Ollama', weight: 0.95, source: 'static' },
      { id: 't3', branchId: 'tech', label: 'AI Agent 설계', weight: 1.0, source: 'static' },
      { id: 't4', branchId: 'tech', label: 'DevOps, Docker', weight: 0.65, source: 'static' },
    ],
  },
  {
    id: 'project',
    label: '프로젝트',
    color: '#fb923c',
    angle: 100,
    nodes: [
      { id: 'p1', branchId: 'project', label: 'AIVIS 개인비서', sublabel: '현재 진행중', weight: 1.0, source: 'static' },
      { id: 'p2', branchId: 'project', label: 'AI 에이전트 플랫폼', weight: 0.75, source: 'static' },
      { id: 'p3', branchId: 'project', label: '기업 자동화 솔루션', weight: 0.7, source: 'static' },
      { id: 'p4', branchId: 'project', label: '글로벌 SaaS 론칭', weight: 0.6, source: 'static' },
    ],
  },
  {
    id: 'life',
    label: '라이프 & 개인',
    color: '#f472b6',
    angle: 155,
    nodes: [
      { id: 'lf1', branchId: 'life', label: '운동 관리', sublabel: 'Gym, 헬스', weight: 0.7, source: 'static' },
      { id: 'lf2', branchId: 'life', label: '신혼 생활 입문', weight: 0.85, source: 'static' },
      { id: 'lf3', branchId: 'life', label: '교제관계', sublabel: '가족, 친구, 동료', weight: 0.8, source: 'static' },
      { id: 'lf4', branchId: 'life', label: '자기계발', sublabel: '독서, 명상', weight: 0.65, source: 'static' },
    ],
  },
  {
    id: 'learning',
    label: '기술 & 학습',
    color: '#60a5fa',
    angle: 218,
    nodes: [
      { id: 'l1', branchId: 'learning', label: 'AI·에이전트 트렌드', weight: 0.9, source: 'static' },
      { id: 'l2', branchId: 'learning', label: '논문 리딩', sublabel: 'Transformer, RAG', weight: 0.8, source: 'static' },
      { id: 'l3', branchId: 'learning', label: 'Backend & Linux', sublabel: 'Spring, Docker', weight: 0.75, source: 'static' },
      { id: 'l4', branchId: 'learning', label: '제품 전략 학습', weight: 0.7, source: 'static' },
    ],
  },
  {
    id: 'global',
    label: '글로벌·외국어',
    color: '#34d399',
    angle: 278,
    nodes: [
      { id: 'g1', branchId: 'global', label: '영어 비즈니스', sublabel: 'Communication', weight: 0.8, source: 'static' },
      { id: 'g2', branchId: 'global', label: '글로벌 시장 조사', weight: 0.75, source: 'static' },
      { id: 'g3', branchId: 'global', label: '해외 네트워킹', weight: 0.65, source: 'static' },
      { id: 'g4', branchId: 'global', label: '일본어 비즈니스', sublabel: '초급', weight: 0.5, source: 'static' },
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
    try {
      const saved = JSON.parse(localStorage.getItem('aivis_user_profile') || '{}');
      const name = (saved.name as string) || '최지웅';
      const role = (saved.role as string) || '연구원';
      const sublabel = (saved.jobTitle as string) || 'AI Product Builder / PM';
      return {
        centerLabel: `${name} ${role}`,
        centerSublabel: sublabel,
        branches: STATIC_BRANCHES.map(b => ({ ...b, nodes: [...b.nodes] })),
      };
    } catch {
      return {
        centerLabel: '최지웅 연구원',
        centerSublabel: 'AI Product Builder / PM',
        branches: STATIC_BRANCHES.map(b => ({ ...b, nodes: [...b.nodes] })),
      };
    }
  }

  async getGraphWithDynamicData(): Promise<KnowledgeGraph> {
    const base = this.getGraph();
    try {
      const res = await apiFetch('/api/knowledge/graph');
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
