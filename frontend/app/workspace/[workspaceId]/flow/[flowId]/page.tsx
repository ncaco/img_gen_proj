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
  type Connection,
  type NodeChange,
  type EdgeChange,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { getFlow, updateFlow } from '@/app/lib/workspace';
import { getStoredToken } from '@/app/lib/auth';

const defaultNodes: Node[] = [];
const defaultEdges: Edge[] = [];

function FlowEditorInner() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = Number(params.workspaceId);
  const flowId = Number(params.flowId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flowName, setFlowName] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [nodes, setNodes] = useNodesState(defaultNodes);
  const [edges, setEdges] = useEdgesState(defaultEdges);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        }
        if (data?.edges?.length) {
          setEdges(data.edges as Edge[]);
        }
      })
      .catch(() => setError('플로우를 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, [workspaceId, flowId, router, setNodes, setEdges]);

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
        } else {
          setNodes([]);
        }
        if (data?.edges?.length) {
          setEdges(data.edges as Edge[]);
        } else {
          setEdges([]);
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
        fitView
        className="bg-[#0c0c0f]"
      >
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
      <FlowEditorInner />
    </div>
  );
}
