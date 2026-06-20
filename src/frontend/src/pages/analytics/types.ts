import type { KnowledgeBranch, KnowledgeNode } from '../../services/knowledgeService';

export interface SelectedItem {
  type: 'branch' | 'node';
  branch: KnowledgeBranch;
  node?: KnowledgeNode;
}
