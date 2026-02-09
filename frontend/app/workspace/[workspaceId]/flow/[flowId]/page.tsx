'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ReactFlow,
  Background,
  Controls,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  useStore,
  useReactFlow,
  type Connection,
  type NodeChange,
  type EdgeChange,
  type Node,
  type Edge,
  type NodeTypes,
  getNodesBounds,
  getViewport,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { getFlow, updateFlow } from '@/app/lib/workspace';
import { getStoredToken } from '@/app/lib/auth';
import { fetchLoreMapping } from '@/app/lib/flow';
import { InputParamsNode, type InputParamsNodeData } from '../components/InputParamsNode';
import { NameInputNode } from '../components/NameInputNode';
import { GenderSelectNode } from '../components/GenderSelectNode';
import { AttributeSelectNode } from '../components/AttributeSelectNode';
import { ClassSelectNode } from '../components/ClassSelectNode';
import { OptionLabelNode } from '../components/OptionLabelNode';
import { LoreResultNode, LORE_NODE_ID, type LoreResultNodeData } from '../components/LoreResultNode';
import { PromptTextareaNode } from '../components/PromptTextareaNode';
import { CharacterConfigNode, CHARACTER_CONFIG_NODE_ID, type CharacterConfigNodeData } from '../components/CharacterConfigNode';
import { CategorySelectNode, CATEGORY_SELECT_NODE_ID, type CategorySelectNodeData } from '../components/CategorySelectNode';
import { CategoryOptionsProvider, useCategoryOptions, type CategoryOptions } from '../context/CategoryOptionsContext';
import EncyclopediaSidebar from '../components/EncyclopediaSidebar';
import FlowSidebar from '../components/FlowSidebar';
import { CharacterBoxNode, type CharacterBoxNodeData } from '../components/CharacterBoxNode';
import { CardOptionNode, type CardOptionNodeData } from '../components/CardOptionNode';
import { CardPreviewNode, type CardPreviewNodeData } from '../components/CardPreviewNode';
import { PromptBoxNode, type PromptBoxNodeData } from '../components/PromptBoxNode';
import { GeneratedImageNode, type GeneratedImageNodeData } from '../components/GeneratedImageNode';
import { CardConfirmNode, type CardConfirmNodeData } from '../components/CardConfirmNode';
import ConfirmModal from '@/app/components/ConfirmModal';
import { isCardConfirmed, isNodeConnectedToConfirmedCard } from '../utils/cardConfirm';

const nodeTypes = {
  inputParams: InputParamsNode,
  nameInput: NameInputNode,
  genderSelect: GenderSelectNode,
  attributeSelect: AttributeSelectNode,
  classSelect: ClassSelectNode,
  optionLabel: OptionLabelNode,
  loreResult: LoreResultNode,
  promptTextarea: PromptTextareaNode,
  characterConfig: CharacterConfigNode,
  categorySelect: CategorySelectNode,
  characterBox: CharacterBoxNode,
  cardOption: CardOptionNode,
  cardPreview: CardPreviewNode,
  promptBox: PromptBoxNode,
  generatedImage: GeneratedImageNode,
  cardConfirm: CardConfirmNode,
} as NodeTypes;

/** 기존 단일 입력 노드 (호환용) */
const defaultInputParamsNode: Node<InputParamsNodeData> = {
  id: 'input-params-1',
  type: 'inputParams',
  position: { x: 120, y: 120 },
  data: { 이름: '', 성별: '', 클래스: '', 속성: '' },
};

const edgeStyle = { stroke: '#ffffff', strokeWidth: 1.5 };

/** 캐릭터 설정 → 세계관설정, 성별·속성·클래스는 별도 노드 */
function buildDefaultFlowGraph(_options: CategoryOptions): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const CONFIG_X = 80;
  const CONFIG_Y = 60;
  const CONFIG_NODE_WIDTH = 280;
  const LORE_GAP = 24;
  const LORE_X = CONFIG_X + CONFIG_NODE_WIDTH + LORE_GAP;
  const CATEGORY_OFFSET_Y = 220; // 캐릭터 설정 아래에 배치

  nodes.push({
    id: CHARACTER_CONFIG_NODE_ID,
    type: 'characterConfig',
    position: { x: CONFIG_X, y: CONFIG_Y },
    data: {} as CharacterConfigNodeData,
  });

  nodes.push({
    id: LORE_NODE_ID,
    type: 'loreResult',
    position: { x: LORE_X, y: CONFIG_Y },
    data: {} as LoreResultNodeData,
  });
  edges.push({
    id: `e-${CHARACTER_CONFIG_NODE_ID}-${LORE_NODE_ID}`,
    source: CHARACTER_CONFIG_NODE_ID,
    sourceHandle: 'to-lore',
    target: LORE_NODE_ID,
    style: edgeStyle,
  });

  nodes.push({
    id: CATEGORY_SELECT_NODE_ID,
    type: 'categorySelect',
    position: { x: CONFIG_X, y: CONFIG_Y + CATEGORY_OFFSET_Y },
    data: {} as CategorySelectNodeData,
  });
  edges.push({
    id: `e-${LORE_NODE_ID}-${CATEGORY_SELECT_NODE_ID}`,
    source: LORE_NODE_ID,
    sourceHandle: 'to-prompt',
    target: CATEGORY_SELECT_NODE_ID,
    style: edgeStyle,
  });

  return { nodes, edges };
}

/** 플로우 생성 시 기본 카드 생성 노드들 생성 */
function buildDefaultCardFlowGraph(): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const START_X = 100;
  const START_Y = 200;
  const NODE_GAP = 350; // 노드 간 간격
  const PREVIEW_OFFSET_X = 150; // 카드미리보기 오른쪽 이동량
  const PROMPT_OFFSET_X = 150; // 프롬프트박스 오른쪽 이동량
  const PROMPT_OFFSET_Y = 600; // 프롬프트박스 아래쪽 추가 이동량
  const IMAGE_OFFSET_X = 400; // 생성이미지첨부 오른쪽 이동량
  const CONFIRM_OFFSET_X = 600; // 카드확정 오른쪽 이동량

  // 1. 캐릭터박스
  const characterBoxId = 'characterBox-1';
  nodes.push({
    id: characterBoxId,
    type: 'characterBox',
    position: { x: START_X, y: START_Y },
    data: {
      characterId: null,
      gender: '',
      attribute: '',
      type: '',
      flowCardId: null,
    } as CharacterBoxNodeData,
  });

  // 2. 카드옵션박스
  const cardOptionId = 'cardOption-1';
  nodes.push({
    id: cardOptionId,
    type: 'cardOption',
    position: { x: START_X + NODE_GAP, y: START_Y },
    data: {
      flowCardId: null,
      characterId: null,
      gender: '',
      attribute: '',
      type: '',
      cardName: '',
      rarity: '',
      attack: '',
      health: '',
      noblePhantasm1Name: '',
      noblePhantasm1TrueName: '',
      noblePhantasm2Name: '',
      noblePhantasm2TrueName: '',
      flavorText: '',
      cardNumber: '',
      series: '',
    } as CardOptionNodeData,
  });

  // 3. 카드 미리보기박스 (위쪽, 더 오른쪽)
  const cardPreviewId = 'cardPreview-1';
  nodes.push({
    id: cardPreviewId,
    type: 'cardPreview',
    position: { x: START_X + NODE_GAP * 2 + PREVIEW_OFFSET_X, y: START_Y },
    data: {
      flowCardId: null,
      imageUrl: null,
      cardName: '',
      type: '',
      attribute: '',
      rarity: '',
      attack: '',
      health: '',
      noblePhantasm1: { name: '', description: '' },
      noblePhantasm2: { name: '', description: '' },
      flavorText: '',
      cardNumber: '',
      series: '',
      prompt: null,
      negativePrompt: null,
    } as CardPreviewNodeData,
  });

  // 4. 프롬프트박스 (아래쪽, 더 오른쪽, 더 아래쪽)
  const promptBoxId = 'promptBox-1';
  nodes.push({
    id: promptBoxId,
    type: 'promptBox',
    position: { x: START_X + NODE_GAP * 2 + PROMPT_OFFSET_X, y: START_Y + 300 + PROMPT_OFFSET_Y },
    data: {
      prompt: null,
      negativePrompt: null,
    } as PromptBoxNodeData,
  });

  // 5. 생성이미지첨부박스 (더 오른쪽)
  const generatedImageId = 'generatedImage-1';
  nodes.push({
    id: generatedImageId,
    type: 'generatedImage',
    position: { x: START_X + NODE_GAP * 3 + IMAGE_OFFSET_X, y: START_Y },
    data: {
      flowCardId: null,
      imageUrl: null,
      sourceNodeId: null,
      localImageUrl: null,
    } as GeneratedImageNodeData,
  });

  // 6. 카드확정박스 (더 오른쪽)
  const cardConfirmId = 'cardConfirm-1';
  nodes.push({
    id: cardConfirmId,
    type: 'cardConfirm',
    position: { x: START_X + NODE_GAP * 4 + CONFIRM_OFFSET_X, y: START_Y },
    data: {
      cardData: null,
      imageUrl: null,
      prompt: null,
      sourceNodeId: null,
      previewImageUrl: null,
      cardPreviewNodeId: null,
    } as CardConfirmNodeData,
  });

  // 연결 설정
  // 캐릭터박스 → 카드옵션박스
  edges.push({
    id: `e-${characterBoxId}-${cardOptionId}`,
    source: characterBoxId,
    target: cardOptionId,
    style: edgeStyle,
  });

  // 카드옵션박스 → 프롬프트박스
  edges.push({
    id: `e-${cardOptionId}-${promptBoxId}`,
    source: cardOptionId,
    target: promptBoxId,
    style: edgeStyle,
  });

  // 카드옵션박스 → 카드미리보기박스
  edges.push({
    id: `e-${cardOptionId}-${cardPreviewId}`,
    source: cardOptionId,
    target: cardPreviewId,
    style: edgeStyle,
  });

  // 프롬프트박스 → 생성이미지 첨부박스
  edges.push({
    id: `e-${promptBoxId}-${generatedImageId}`,
    source: promptBoxId,
    sourceHandle: 'prompt',
    target: generatedImageId,
    style: edgeStyle,
  });

  // 카드미리보기박스 → 생성이미지 첨부박스
  edges.push({
    id: `e-${cardPreviewId}-${generatedImageId}`,
    source: cardPreviewId,
    sourceHandle: 'prompt',
    target: generatedImageId,
    style: edgeStyle,
  });

  // 생성이미지 첨부박스 → 카드확정박스
  edges.push({
    id: `e-${generatedImageId}-${cardConfirmId}`,
    source: generatedImageId,
    target: cardConfirmId,
    style: edgeStyle,
  });

  return { nodes, edges };
}

const defaultNodes: Node[] = [];
const defaultEdges: Edge[] = [];

/** 노드가 채워진 뒤 뷰를 그래프에 맞춤 (비동기 로드 대응) */
function FitViewOnNodesReady() {
  const nodeCount = useStore((s) => s.nodes.length);
  const { fitView } = useReactFlow();
  useEffect(() => {
    if (nodeCount === 0) return;
    const t = setTimeout(() => {
      fitView({ padding: 0.2, duration: 200 });
    }, 150);
    return () => clearTimeout(t);
  }, [nodeCount, fitView]);
  return null;
}

function FlowEditorInner() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = Number(params.workspaceId);
  const flowId = Number(params.flowId);
  const options = useCategoryOptions();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flowName, setFlowName] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [nodes, setNodes] = useNodesState(defaultNodes);
  const [edges, setEdges] = useEdgesState(defaultEdges);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [flowNeedsInitialGraph, setFlowNeedsInitialGraph] = useState(false);
  const builtWithOptions = useRef(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [flowSidebarOpen, setFlowSidebarOpen] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    if (Number.isNaN(workspaceId) || Number.isNaN(flowId)) return;
    const token = getStoredToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    getFlow(workspaceId, flowId)
      .then((flow) => {
        setFlowName(flow.name ?? '새 플로우');
        const data = flow.flowData;
        if (data?.nodes?.length) {
          setNodes(data.nodes as Node[]);
          setEdges(data.edges?.length ? (data.edges as Edge[]) : []);
          setFlowNeedsInitialGraph(false);
          builtWithOptions.current = true;
        } else {
          // 노드가 없으면 기본 카드 생성 노드들 생성
          const { nodes: defaultNodes, edges: defaultEdges } = buildDefaultCardFlowGraph();
          setNodes(defaultNodes);
          setEdges(defaultEdges);
          setFlowNeedsInitialGraph(false);
          builtWithOptions.current = true;
          // 기본 노드들을 서버에 저장
          updateFlow(workspaceId, flowId, {
            flowData: { nodes: defaultNodes, edges: defaultEdges },
          }).catch(() => {});
        }
      })
      .catch(() => setError('플로우를 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, [workspaceId, flowId, router, setNodes, setEdges]);

  // 초기 노드 생성 비활성화 - 빈 그래프로 시작
  // useEffect(() => {
  //   if (!flowNeedsInitialGraph) return;
  //   const hasOptions = (options.gender?.length ?? 0) > 0 || (options.attribute?.length ?? 0) > 0;
  //   if (nodes.length > 0 && builtWithOptions.current) return;
  //   if (nodes.length > 0 && !hasOptions) return;
  //   const { nodes: builtNodes, edges: builtEdges } = buildDefaultFlowGraph(options);
  //   if (builtNodes.length === 0) return;
  //   setNodes(builtNodes);
  //   setEdges(builtEdges);
  //   if (hasOptions) {
  //     setFlowNeedsInitialGraph(false);
  //     builtWithOptions.current = true;
  //   }
  // }, [flowNeedsInitialGraph, options.gender, options.attribute, options.classTree, nodes.length, setNodes, setEdges]);

  const saveTitle = useCallback(() => {
    const trimmed = titleInput.trim();
    if (trimmed && trimmed !== flowName) {
      setFlowName(trimmed);
      updateFlow(workspaceId, flowId, { name: trimmed }).catch(() => {});
    }
    setEditingTitle(false);
  }, [flowName, titleInput, workspaceId, flowId]);

  useEffect(() => {
    if (editingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [editingTitle]);

  const saveFlow = useCallback(
    (nodesToSave: Node[], edgesToSave: Edge[]) => {
      if (Number.isNaN(workspaceId) || Number.isNaN(flowId)) return;
      updateFlow(workspaceId, flowId, {
        flowData: { nodes: nodesToSave, edges: edgesToSave },
      }).catch(() => {});
    },
    [workspaceId, flowId]
  );

  useEffect(() => {
    if (loading) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveFlow(nodes, edges);
      saveTimeoutRef.current = null;
    }, 800);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [nodes, edges, loading, saveFlow]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [setNodes]
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [setEdges]
  );
  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  );

  // 노드 삭제 핸들러: 선택된 노드와 연결된 엣지 제거
  const onNodesDelete = useCallback(
    (deleted: Node[]) => {
      const deletedIds = new Set(deleted.map((n) => n.id));
      setNodes((nds) => nds.filter((n) => !deletedIds.has(n.id)));
      setEdges((eds) =>
        eds.filter((e) => !deletedIds.has(e.source) && !deletedIds.has(e.target))
      );
    },
    [setNodes, setEdges]
  );

  // 엣지(선) 삭제 핸들러: 선택된 엣지만 제거
  const onEdgesDelete = useCallback(
    (deleted: Edge[]) => {
      const deletedIds = new Set(deleted.map((e) => e.id));
      setEdges((eds) => eds.filter((e) => !deletedIds.has(e.id)));
    },
    [setEdges]
  );

  const handleRefresh = useCallback(() => {
    if (Number.isNaN(workspaceId) || Number.isNaN(flowId)) return;
    setLoading(true);
    getFlow(workspaceId, flowId)
      .then((flow) => {
        setFlowName(flow.name ?? '새 플로우');
        const data = flow.flowData;
        if (data?.nodes?.length) {
          setNodes(data.nodes as Node[]);
          setEdges(data.edges?.length ? (data.edges as Edge[]) : []);
          setFlowNeedsInitialGraph(false);
          builtWithOptions.current = true;
        } else {
          setNodes([]);
          setEdges([]);
          setFlowNeedsInitialGraph(false); // 초기 그래프 생성 비활성화
          builtWithOptions.current = false;
        }
      })
      .catch(() => setError('플로우를 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, [workspaceId, flowId, setNodes, setEdges]);

  const handleAddNode = useCallback(
    (type: string) => {
      // 기존 노드가 있으면 마지막 노드 옆에 추가, 없으면 중앙에 추가
      let position = { x: 400, y: 300 }; // 기본 중앙 위치
      
      if (nodes.length > 0) {
        // 마지막 노드의 위치를 기준으로 오른쪽에 추가
        const lastNode = nodes[nodes.length - 1];
        position = {
          x: lastNode.position.x + 350,
          y: lastNode.position.y,
        };
      }

      let newNode: Node;
      const nodeId = `${type}-${Date.now()}`;

      switch (type) {
        case 'characterBox':
          newNode = {
            id: nodeId,
            type: 'characterBox',
            position,
            data: {
              characterId: null,
              gender: '',
              attribute: '',
              type: '',
              flowCardId: null,
            } as CharacterBoxNodeData,
          };
          break;
        case 'cardOption':
          newNode = {
            id: nodeId,
            type: 'cardOption',
            position: { ...position, y: position.y + 250 },
            data: {
              flowCardId: null,
              characterId: null,
              gender: '',
              attribute: '',
              type: '',
              cardName: '',
              rarity: '',
              attack: '',
              health: '',
              noblePhantasm1Name: '',
              noblePhantasm1TrueName: '',
              noblePhantasm2Name: '',
              noblePhantasm2TrueName: '',
              flavorText: '',
              cardNumber: '',
              series: '',
            } as CardOptionNodeData,
          };
          break;
        case 'cardPreview':
          newNode = {
            id: nodeId,
            type: 'cardPreview',
            position: { ...position, y: position.y + 500 },
            data: {
              flowCardId: null,
              imageUrl: null,
              cardName: '',
              type: '',
              attribute: '',
              rarity: '',
              attack: '',
              health: '',
              noblePhantasm1: { name: '', description: '' },
              noblePhantasm2: { name: '', description: '' },
              flavorText: '',
              cardNumber: '',
              series: '',
              prompt: null,
              negativePrompt: null,
            } as CardPreviewNodeData,
          };
          break;
        case 'promptBox':
          newNode = {
            id: nodeId,
            type: 'promptBox',
            position: { ...position, y: position.y + 750 },
            data: {
              prompt: null,
              negativePrompt: null,
            } as PromptBoxNodeData,
          };
          break;
        case 'generatedImage':
          newNode = {
            id: nodeId,
            type: 'generatedImage',
            position: { ...position, y: position.y + 1000 },
            data: {
              flowCardId: null,
              imageUrl: null,
              sourceNodeId: null,
              localImageUrl: null,
            } as GeneratedImageNodeData,
          };
          break;
        case 'cardConfirm':
          newNode = {
            id: nodeId,
            type: 'cardConfirm',
            position: { ...position, y: position.y + 1250 },
            data: {
              cardData: null,
              imageUrl: null,
              prompt: null,
              sourceNodeId: null,
              previewImageUrl: null,
              cardPreviewNodeId: null,
            } as CardConfirmNodeData,
          };
          break;
        default:
          return;
      }

      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes, nodes]
  );

  const handleRegenerateCharacter = useCallback(async () => {
    const characterConfigNode = nodes.find((n) => n.id === CHARACTER_CONFIG_NODE_ID);
    if (!characterConfigNode) return;
    
    const data = characterConfigNode.data as CharacterConfigNodeData;
    const name = (data.이름 ?? '').trim();
    if (!name) {
      setNodes((nodes) =>
        nodes.map((n) =>
          n.id === LORE_NODE_ID
            ? { ...n, data: { ...n.data, loreError: '이름을 입력한 뒤 실행하세요.', loreMapping: null } }
            : n
        )
      );
      return;
    }
    
    setNodes((nodes) =>
      nodes.map((n) =>
        n.id === LORE_NODE_ID ? { ...n, data: { ...n.data, loreError: null } } : n
      )
    );
    
    try {
      const { data: loreData, characterId: newCharacterId } = await fetchLoreMapping({
        name,
        description: (data.설명 ?? '').trim(),
        characterId: data.characterId ?? undefined,
        flowId,
      });
      setNodes((nodes) =>
        nodes.map((n) => {
          if (n.id === LORE_NODE_ID) {
            return { ...n, data: { ...n.data, loreMapping: loreData, loreError: null } };
          }
          if (n.id === CHARACTER_CONFIG_NODE_ID) {
            return { ...n, data: { ...n.data, characterId: newCharacterId } as CharacterConfigNodeData };
          }
          return n;
        })
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : '세계관 분석에 실패했습니다.';
      setNodes((nodes) =>
        nodes.map((n) =>
          n.id === LORE_NODE_ID
            ? { ...n, data: { ...n.data, loreError: message, loreMapping: null } }
            : n
        )
      );
    }
  }, [nodes, flowId, setNodes]);

  const handleResetFlow = useCallback(() => {
    const { nodes: defaultNodes, edges: defaultEdges } = buildDefaultCardFlowGraph();
    setNodes(defaultNodes);
    setEdges(defaultEdges);
    setShowResetConfirm(false);
    if (!Number.isNaN(workspaceId) && !Number.isNaN(flowId)) {
      updateFlow(workspaceId, flowId, {
        flowData: { nodes: defaultNodes, edges: defaultEdges },
      }).catch(() => {});
    }
  }, [workspaceId, flowId, setNodes, setEdges]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-[#0c0c0f] text-white/70">
        <p>플로우 불러오는 중…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 bg-[#0c0c0f] text-white">
        <p className="text-red-400">{error}</p>
        <Link href="/workspace" className="text-sm text-white/80 hover:text-white">
          워크스페이스로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-2 border-b border-white/10 bg-[#0c0c0f]/95">
        {/* 플로우 사이드바 열기 버튼 (왼쪽) */}
        <button
          type="button"
          onClick={() => setFlowSidebarOpen(!flowSidebarOpen)}
          className="w-9 h-9 flex items-center justify-center rounded border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white transition-colors shrink-0"
          title="플로우 목록"
          aria-label="플로우 목록"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        {editingTitle ? (
          <input
            ref={titleInputRef}
            type="text"
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveTitle();
              if (e.key === 'Escape') {
                setTitleInput(flowName);
                setEditingTitle(false);
              }
            }}
            className="flex-1 min-w-0 rounded px-2 py-1 text-sm font-medium text-white bg-white/10 border border-white/20 focus:outline-none focus:ring-1 focus:ring-white/30"
          />
        ) : (
          <button
            type="button"
            onDoubleClick={() => {
              setTitleInput(flowName);
              setEditingTitle(true);
            }}
            className="text-sm font-medium text-white hover:bg-white/10 rounded px-2 py-1 -mx-2 transition-colors text-left flex-1 min-w-0 truncate"
            title="더블클릭하여 제목 수정"
          >
            {flowName || '새 플로우'}
          </button>
        )}
        <div className="flex items-center gap-1 shrink-0">
          <Link
            href="/workspace"
            className="w-9 h-9 flex items-center justify-center rounded border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white transition-colors"
            title="워크스페이스 목록"
            aria-label="워크스페이스 목록"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </Link>
          <button
            type="button"
            onClick={handleRefresh}
            className="w-9 h-9 flex items-center justify-center rounded border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white transition-colors"
            title="새로고침"
            aria-label="새로고침"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-9 h-9 flex items-center justify-center rounded border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white transition-colors"
            title="도감 사이드바"
            aria-label="도감 사이드바"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="w-9 h-9 flex items-center justify-center rounded border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white transition-colors"
            title="플로우 초기화"
            aria-label="플로우 초기화"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
      <div className="h-full w-full bg-[#0c0c0f] flex-1 min-h-0 relative">
        <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        nodeTypes={nodeTypes}
        zoomOnScroll
        defaultEdgeOptions={{
          style: { stroke: '#ffffff', strokeWidth: 1.5 },
          type: 'smoothstep',
        }}
        fitView
        className="bg-[#0c0c0f]"
      >
        <FitViewOnNodesReady />
        <Background variant={BackgroundVariant.Lines} gap={20} size={1} color="#333" />
        <Controls className="!bg-[#1a1a1f] !border-white/10 !rounded-lg" />
      </ReactFlow>
      </div>
      <FlowSidebar
        isOpen={flowSidebarOpen}
        onClose={() => setFlowSidebarOpen(false)}
        workspaceId={workspaceId}
        currentFlowId={flowId}
        onFlowSelect={(newFlowId) => {
          // 플로우 선택 시 페이지 리로드는 router.push에서 처리됨
        }}
      />
      <EncyclopediaSidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)}
        onUpdateNodes={(updater) => setNodes(updater)}
        nodes={nodes}
        flowId={flowId}
        onRegenerateCharacter={handleRegenerateCharacter}
      />
      <ConfirmModal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={handleResetFlow}
        title="플로우 초기화"
        message="모든 노드를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
        confirmText="초기화"
        cancelText="취소"
        variant="danger"
      />
    </>
  );
}

export default function FlowEditorPage() {
  return (
    <div className="fixed inset-0 top-14 z-40 flex flex-col bg-[#0c0c0f]">
      <CategoryOptionsProvider>
        <FlowEditorInner />
      </CategoryOptionsProvider>
    </div>
  );
}
