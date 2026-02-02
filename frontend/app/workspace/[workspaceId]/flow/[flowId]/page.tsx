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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { getFlow, updateFlow } from '@/app/lib/workspace';
import { getStoredToken } from '@/app/lib/auth';
import { InputParamsNode, type InputParamsNodeData } from '../components/InputParamsNode';
import { NameInputNode, type NameInputNodeData } from '../components/NameInputNode';
import { GenderSelectNode } from '../components/GenderSelectNode';
import { AttributeSelectNode } from '../components/AttributeSelectNode';
import { ClassSelectNode } from '../components/ClassSelectNode';
import { OptionLabelNode, type OptionLabelNodeData } from '../components/OptionLabelNode';
import { LoreResultNode, LORE_NODE_ID, type LoreResultNodeData } from '../components/LoreResultNode';
import { CategoryOptionsProvider, useCategoryOptions, type CategoryOptions } from '../context/CategoryOptionsContext';

const nodeTypes = {
  inputParams: InputParamsNode,
  nameInput: NameInputNode,
  genderSelect: GenderSelectNode,
  attributeSelect: AttributeSelectNode,
  classSelect: ClassSelectNode,
  optionLabel: OptionLabelNode,
  loreResult: LoreResultNode,
} as NodeTypes;

/** 기존 단일 입력 노드 (호환용) */
const defaultInputParamsNode: Node<InputParamsNodeData> = {
  id: 'input-params-1',
  type: 'inputParams',
  position: { x: 120, y: 120 },
  data: { 이름: '', 성별: '', 클래스: '', 속성: '' },
};

const edgeStyle = { stroke: '#ffffff', strokeWidth: 1.5 };

/** 카테고리 기반 기본 그래프: 1 이름 → 2 성별 → 6 속성 → (2뎁스별 3뎁스) 클래스 노드들 */
function buildDefaultFlowGraph(options: CategoryOptions): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const genderList = options.gender ?? [];
  const attributeList = options.attribute ?? [];
  const classTree = options.classTree ?? [];

  const LAYOUT_OFFSET_Y = 160;
  const ATTR_ROW_Y = 180 + LAYOUT_OFFSET_Y;
  const ATTR_GAP_X = 118;
  const attrStartX = 80;
  const OPTION_NODE_WIDTH = 100;
  const attrCount = Math.max(1, attributeList.length);
  const attrEndX = attrStartX + (attrCount - 1) * ATTR_GAP_X + OPTION_NODE_WIDTH;
  const CLASS_COL_X = attrEndX + 24;
  const GENDER_CORNER_X = attrStartX;
  const GENDER_GAP_X = 150;
  const genderCenterX =
    genderList.length > 0
      ? GENDER_CORNER_X + (genderList.length - 1) * GENDER_GAP_X / 2
      : GENDER_CORNER_X;
  const NAME_NODE_WIDTH = 180;
  const nameX = Math.round(genderCenterX - NAME_NODE_WIDTH / 2);
  const nameY = -95;
  const GENDER_ROW_Y = 20 + LAYOUT_OFFSET_Y;
  const NAME_ID = 'name-1';
  const NAME_NODE_UI_WIDTH = 220;
  const LORE_NODE_GAP_X = 24;
  nodes.push({
    id: NAME_ID,
    type: 'nameInput',
    position: { x: nameX, y: nameY },
    data: { 이름: '' } as NameInputNodeData,
  });
  nodes.push({
    id: LORE_NODE_ID,
    type: 'loreResult',
    position: { x: nameX + NAME_NODE_UI_WIDTH + LORE_NODE_GAP_X, y: nameY },
    data: {} as LoreResultNodeData,
  });
  edges.push({
    id: `e-${NAME_ID}-${LORE_NODE_ID}`,
    source: NAME_ID,
    sourceHandle: 'to-lore',
    target: LORE_NODE_ID,
    style: edgeStyle,
  });

  const genderIds: string[] = [];
  genderList.forEach((label, i) => {
    const id = `gender-${i}`;
    genderIds.push(id);
    nodes.push({
      id,
      type: 'optionLabel',
      position: { x: GENDER_CORNER_X + i * GENDER_GAP_X, y: GENDER_ROW_Y },
      data: { label, kind: 'gender' } as OptionLabelNodeData,
    });
    edges.push({ id: `e-${NAME_ID}-${id}`, source: NAME_ID, target: id, style: edgeStyle });
  });

  const attrIds: string[] = [];
  attributeList.forEach((label, i) => {
    const id = `attr-${i}`;
    attrIds.push(id);
    nodes.push({
      id,
      type: 'optionLabel',
      position: { x: attrStartX + i * ATTR_GAP_X, y: ATTR_ROW_Y },
      data: { label, kind: 'attribute' } as OptionLabelNodeData,
    });
    genderIds.forEach((gId) => edges.push({ id: `e-${gId}-${id}`, source: gId, target: id, style: edgeStyle }));
  });

  const classNodes: { id: string; twoName: string; threeName: string }[] = [];
  const CLASS_ROW_Y_START = 268 + LAYOUT_OFFSET_Y;
  const CLASS_GAP_Y = 44;
  classTree.forEach((two, i) => {
    (two.children ?? []).forEach((three, j) => {
      const id = `class-${i}-${j}`;
      const idx = classNodes.length;
      classNodes.push({ id, twoName: two.name, threeName: three.name });
      nodes.push({
        id,
        type: 'optionLabel',
        position: {
          x: CLASS_COL_X,
          y: CLASS_ROW_Y_START + idx * CLASS_GAP_Y,
        },
        data: {
          label: three.name,
          kind: 'class',
          parentLabel: two.name,
        } as OptionLabelNodeData,
      });
    });
  });
  attrIds.forEach((aId) => {
    classNodes.forEach((c) => {
      edges.push({ id: `e-${aId}-${c.id}`, source: aId, target: c.id, style: edgeStyle });
    });
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
          setNodes([]);
          setEdges([]);
          setFlowNeedsInitialGraph(true);
          builtWithOptions.current = false;
        }
      })
      .catch(() => setError('플로우를 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, [workspaceId, flowId, router, setNodes, setEdges]);

  useEffect(() => {
    if (!flowNeedsInitialGraph) return;
    const hasOptions = (options.gender?.length ?? 0) > 0 || (options.attribute?.length ?? 0) > 0;
    if (nodes.length > 0 && builtWithOptions.current) return;
    if (nodes.length > 0 && !hasOptions) return;
    const { nodes: builtNodes, edges: builtEdges } = buildDefaultFlowGraph(options);
    if (builtNodes.length === 0) return;
    setNodes(builtNodes);
    setEdges(builtEdges);
    if (hasOptions) {
      setFlowNeedsInitialGraph(false);
      builtWithOptions.current = true;
    }
  }, [flowNeedsInitialGraph, options.gender, options.attribute, options.classTree, nodes.length, setNodes, setEdges]);

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
          setFlowNeedsInitialGraph(true);
          builtWithOptions.current = false;
        }
      })
      .catch(() => setError('플로우를 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
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
        </div>
      </div>
      <div className="h-full w-full bg-[#0c0c0f] flex-1 min-h-0">
        <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
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
