// 'use client';

// import { useEffect, useMemo, useState } from 'react';
// import Link from 'next/link';
// import { useParams } from 'next/navigation';
// import { ChevronLeft, FileText, FolderTree, Rocket } from 'lucide-react';

// import { workspaceApi, type WorkspaceItem, type WorkspaceSummary } from '@/services/workspaces';

// export default function DashboardWorkDetailPage() {
//   const params = useParams<{ id: string }>();
//   const workspaceId = params?.id ?? '';
//   const [workspace, setWorkspace] = useState<WorkspaceSummary | null>(null);
//   const [items, setItems] = useState<WorkspaceItem[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);

//   useEffect(() => {
//     if (!workspaceId) {
//       return;
//     }

//     let cancelled = false;

//     const run = async () => {
//       try {
//         const [workspaceDetail, workspaceItems] = await Promise.all([
//           workspaceApi.getWorkspace(workspaceId),
//           workspaceApi.listWorkspaceItems(workspaceId),
//         ]);

//         if (!cancelled) {
//           setWorkspace(workspaceDetail);
//           setItems(workspaceItems);
//           setError(null);
//         }
//       } catch (requestError) {
//         if (!cancelled) {
//           setError(requestError instanceof Error ? requestError.message : '工作区详情加载失败');
//         }
//       } finally {
//         if (!cancelled) {
//           setLoading(false);
//         }
//       }
//     };

//     void run();

//     return () => {
//       cancelled = true;
//     };
//   }, [workspaceId]);

//   const fileItems = useMemo(() => items.filter((item) => item.kind === 'file'), [items]);

//   if (loading) {
//     return (
//       <section className="px-4 py-6 sm:px-6 lg:px-8">
//         <div className="rounded-2xl border border-border bg-card/80 p-6 text-sm text-muted-foreground">
//           正在加载工作区详情...
//         </div>
//       </section>
//     );
//   }

//   if (error || !workspace) {
//     return (
//       <section className="px-4 py-6 sm:px-6 lg:px-8">
//         <div className="rounded-2xl border border-red-400/30 bg-red-400/10 p-6 text-sm text-red-300">
//           {error || '未找到工作区'}
//         </div>
//       </section>
//     );
//   }

//   return (
//     <section className="space-y-5 px-4 py-6 sm:px-6 lg:px-8">
//       <div className="flex items-center justify-between gap-3">
//         <Link
//           href="/dashboard/work"
//           className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border/80 bg-background px-3 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
//         >
//           <ChevronLeft className="size-3.5" />
//           返回工作区
//         </Link>
//         <Link
//           href={`/work/${workspace.id}`}
//           className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-transparent bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
//         >
//           进入创作
//           <Rocket className="size-3.5" />
//         </Link>
//       </div>

//       <article className="rounded-2xl border border-border bg-card/85 p-6 shadow-sm">
//         <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Workspace Detail</p>
//         <h1 className="mt-2 text-3xl font-semibold text-foreground">{workspace.name}</h1>
//         <p className="mt-2 text-sm text-muted-foreground">{workspace.description || '暂无描述'}</p>
//         <div className="mt-4 flex flex-wrap gap-2 text-xs">
//           <span className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-background px-2.5 py-1 text-muted-foreground">
//             <FolderTree className="size-3.5" />
//             {workspace.trackKey}
//           </span>
//           <span className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-background px-2.5 py-1 text-muted-foreground">
//             <FileText className="size-3.5" />
//             文件 {workspace.fileCount}
//           </span>
//         </div>
//       </article>

//       <article className="rounded-2xl border border-border bg-card/85 p-6 shadow-sm">
//         <h2 className="text-lg font-semibold text-foreground">文件列表预览</h2>
//         <p className="mt-1 text-sm text-muted-foreground">
//           点击“进入创作”后，左侧文件树会读取这里的数据库文件。
//         </p>
//         <div className="mt-4 max-h-80 space-y-2 overflow-y-auto">
//           {fileItems.length === 0 ? (
//             <p className="rounded-lg border border-dashed border-border/80 bg-background px-3 py-3 text-sm text-muted-foreground">
//               当前还没有文件，进入创作后可创建。
//             </p>
//           ) : (
//             fileItems.slice(0, 20).map((file) => (
//               <div
//                 key={file.id}
//                 className="rounded-lg border border-border/80 bg-background px-3 py-2 text-sm text-muted-foreground"
//               >
//                 {file.path}
//               </div>
//             ))
//           )}
//         </div>
//       </article>
//     </section>
//   );
// }
