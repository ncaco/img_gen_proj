/**
 * 카드 확정 상태 확인 유틸리티
 */
import type { Node, Edge } from '@xyflow/react';
import type { CardConfirmNodeData } from '../components/CardConfirmNode';

/**
 * 플로우에서 카드가 확정되었는지 확인
 * @param nodes 모든 노드 목록
 * @param edges 모든 엣지 목록
 * @returns 카드가 확정되었으면 true, 아니면 false
 */
export function isCardConfirmed(nodes: Node[], edges: Edge[]): boolean {
  // CardConfirmNode 찾기
  const confirmNode = nodes.find((n) => n.type === 'cardConfirm');
  if (!confirmNode) return false;

  const confirmData = confirmNode.data as CardConfirmNodeData;
  // savedCardSn이 있고, 카드가 존재하는지 확인
  return confirmData.savedCardSn !== null && confirmData.savedCardSn !== undefined;
}

/**
 * 특정 노드가 확정된 카드와 연결되어 있는지 확인
 * @param nodeId 확인할 노드 ID
 * @param nodes 모든 노드 목록
 * @param edges 모든 엣지 목록
 * @returns 확정된 카드와 연결되어 있으면 true, 아니면 false
 */
export function isNodeConnectedToConfirmedCard(
  nodeId: string,
  nodes: Node[],
  edges: Edge[]
): boolean {
  // 카드가 확정되지 않았으면 false
  if (!isCardConfirmed(nodes, edges)) return false;

  // CardConfirmNode 찾기
  const confirmNode = nodes.find((n) => n.type === 'cardConfirm');
  if (!confirmNode) return false;

  // CardConfirmNode에 연결된 노드들 찾기
  const confirmIncomingEdges = edges.filter((e) => e.target === confirmNode.id);
  const connectedNodeIds = new Set<string>();

  // 직접 연결된 노드들
  confirmIncomingEdges.forEach((edge) => {
    connectedNodeIds.add(edge.source);
  });

  // 간접 연결된 노드들도 찾기 (예: CardOptionNode -> CardPreviewNode -> CardConfirmNode)
  const findConnectedNodes = (nodeId: string, visited: Set<string>) => {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    // 이 노드에서 나가는 엣지 찾기
    const outgoingEdges = edges.filter((e) => e.source === nodeId);
    outgoingEdges.forEach((edge) => {
      connectedNodeIds.add(edge.target);
      findConnectedNodes(edge.target, visited);
    });

    // 이 노드로 들어오는 엣지 찾기
    const incomingEdges = edges.filter((e) => e.target === nodeId);
    incomingEdges.forEach((edge) => {
      connectedNodeIds.add(edge.source);
      findConnectedNodes(edge.source, visited);
    });
  };

  // CardConfirmNode에 직접 연결된 노드들부터 시작하여 연결된 모든 노드 찾기
  confirmIncomingEdges.forEach((edge) => {
    const visited = new Set<string>();
    findConnectedNodes(edge.source, visited);
  });

  return connectedNodeIds.has(nodeId);
}
