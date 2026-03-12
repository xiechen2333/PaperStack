import React, { useState, useEffect, useMemo, useRef, useDeferredValue, useCallback, Suspense } from 'react';
import localforage from 'localforage';
import {
    ChevronRight, ChevronDown, BookOpen, ExternalLink, Search, Trash2, Edit3,
    X, PlusCircle, Save, Lightbulb, Target, Zap, Scale,
    Folder, Globe, Clock, Book, CheckCircle2, AlertCircle, Star,
    Settings, CornerDownRight, Download, Upload, FolderInput, ArrowUp, ArrowDown,
    Hash, Calendar, Loader2, FolderOpen, Circle,
    PanelLeftClose, PanelLeftOpen, History, Heart, AlertTriangle, ListFilter,
    FileText, Moon, Sun
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

// --- 懒加载 Markdown 组件 ---
const MarkdownView = React.lazy(() => import('./components/MarkdownView'));

// 配置 localforage
localforage.config({
    name: 'ResearchHubDB',
    storeName: 'research_data'
});

// --- 常量定义 ---
const THEME = {
    bg: 'bg-slate-50 dark:bg-slate-950',
    text: {
        main: 'text-slate-900 dark:text-slate-100',
    },
};

// --- 组件: SidebarItem (侧边栏单项 - 性能优化版) ---
const SidebarItem = React.memo(({ category, depth, hasChildren, isActive, isExpanded, count, isManageMode, onToggle, onSelect, onManageAction }) => {
    const getLevelStyle = (d) => {
        if (d === 0) return {
            icon: <Folder size={18} className={isActive ? "fill-blue-100 text-blue-600 dark:text-blue-400" : "fill-slate-100 text-slate-400 dark:text-slate-500"} />,
            textClass: "text-[15px] font-semibold text-slate-800 dark:text-slate-100",
            containerClass: "py-2.5 mb-1"
        };
        if (d === 1) return {
            icon: <FolderOpen size={16} />,
            textClass: "text-[14px] font-medium text-slate-700 dark:text-slate-200",
            containerClass: "py-2 mb-0.5"
        };
        if (d === 2) return {
            icon: <Hash size={14} className="opacity-70" />,
            textClass: "text-[14px] font-normal text-slate-600 dark:text-slate-300",
            containerClass: "py-1.5"
        };
        return {
            icon: <Circle size={6} className="fill-current opacity-40" />,
            textClass: "text-[13px] text-slate-500 dark:text-slate-400",
            containerClass: "py-1.5"
        };
    };
    const style = getLevelStyle(depth);

    return (
        <div className="select-none relative px-2">
            <div
                className={`
            flex items-center px-3 rounded-lg transition-all duration-200 group cursor-pointer 
            ${style.containerClass} 
            ${isActive
                        ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100'
                        : 'hover:bg-slate-100 text-slate-600 active:scale-[0.99]'} 
            ${isManageMode ? 'pr-1' : ''} 
          `}
                onClick={(e) => { e.stopPropagation(); onSelect(category.id); }}
            >
                <div
                    className={`
                w-5 h-5 flex items-center justify-center rounded mr-1.5 transition-all flex-shrink-0 
                ${hasChildren ? 'hover:bg-slate-200 text-slate-400 hover:text-slate-600' : 'opacity-0 pointer-events-none'}
            `}
                    onClick={(e) => { e.stopPropagation(); onToggle(category.id); }}
                >
                    {isExpanded ? <ChevronDown size={14} strokeWidth={2.5} /> : <ChevronRight size={14} strokeWidth={2.5} />}
                </div>

                <div className={`mr-2.5 flex-shrink-0 transition-colors ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-500 dark:group-hover:text-slate-300'}`}>
                    {style.icon}
                </div>

                <span className={`truncate flex-1 leading-snug ${style.textClass}`}>{category.name}</span>

                {!isManageMode && count.total > 0 && (
                    <div className={`text-[11px] px-2 h-5 flex items-center justify-center rounded-full ml-2 font-medium transition-colors ${isActive ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'}`}>
                        {hasChildren && count.self > 0 ? `${count.self}/${count.total}` : count.total}
                    </div>
                )}

                {isManageMode && (
                    <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button onClick={(e) => { e.stopPropagation(); onManageAction('moveUp', category.id); }} className="p-1.5 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700" title="上移" > <ArrowUp size={14} /> </button>
                        <button onClick={(e) => { e.stopPropagation(); onManageAction('moveDown', category.id); }} className="p-1.5 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700 mr-1" title="下移" > <ArrowDown size={14} /> </button>
                        <button onClick={(e) => { e.stopPropagation(); onManageAction('add', category.id); }} className="p-1.5 rounded hover:bg-emerald-100 text-slate-400 hover:text-emerald-600" title="添加子分类" ><PlusCircle size={14} /></button>
                    </div>
                )}
            </div>
        </div>
    );
}, (prev, next) => {
    // 性能优化：只比较必要的 props，避免过度渲染
    return (
        prev.category.id === next.category.id &&
        prev.category.name === next.category.name &&
        prev.depth === next.depth &&
        prev.isActive === next.isActive &&
        prev.isExpanded === next.isExpanded &&
        prev.isManageMode === next.isManageMode &&
        prev.count.total === next.count.total &&
        prev.hasChildren === next.hasChildren
    );
});

// --- 组件: SidebarTree (递归树) ---
const SidebarTree = React.memo(({ categories, parentId = null, depth = 0, activeCategoryId, expandedFolders, isManageMode, countsMap, onToggle, onSelect, onManageAction }) => {
    const children = categories.filter(c => c.parentId === parentId);
    if (children.length === 0) return null;
    return (
        <div className="relative">
            {children.map((cat, index) => {
                const hasChildren = categories.some(c => c.parentId === cat.id);
                const isExpanded = expandedFolders.includes(cat.id);
                const count = countsMap[cat.id] || { self: 0, total: 0 };
                return (
                    <div key={cat.id} className="relative">
                        {depth > 0 && (
                            <>
                                <div className="absolute border-l border-slate-200" style={{ left: '16px', top: '0', height: index === children.length - 1 ? '20px' : '100%', width: '1px' }} />
                                <div className="absolute border-t border-slate-200" style={{ left: '16px', top: '20px', width: '10px', height: '1px' }} />
                            </>
                        )}

                        <div className={depth > 0 ? "pl-2" : ""}>
                            <SidebarItem category={cat} depth={depth} hasChildren={hasChildren} isActive={activeCategoryId === cat.id} isExpanded={isExpanded} count={count} isManageMode={isManageMode} onToggle={onToggle} onSelect={onSelect} onManageAction={onManageAction} />
                        </div>

                        {hasChildren && isExpanded && (
                            <div className="ml-4 relative">
                                <SidebarTree categories={categories} parentId={cat.id} depth={depth + 1} activeCategoryId={activeCategoryId} expandedFolders={expandedFolders} isManageMode={isManageMode} countsMap={countsMap} onToggle={onToggle} onSelect={onSelect} onManageAction={onManageAction} />
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
});

// --- 组件: ManagementToolbar ---
const ManagementToolbar = ({ onManageAction, categoryId }) => {
    return (
        <div className="flex items-center gap-1 ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white shadow-sm border border-slate-200 rounded-md p-1">
            <button onClick={(e) => { e.stopPropagation(); onManageAction('edit', categoryId); }} className="p-1.5 rounded hover:bg-blue-50 text-slate-500 hover:text-blue-600 transition-colors" title="重命名" > <Edit3 size={15} /> </button>
            <button onClick={(e) => { e.stopPropagation(); onManageAction('moveCategory', categoryId); }} className="p-1.5 rounded hover:bg-violet-50 text-slate-500 hover:text-violet-600 transition-colors" title="移动文件夹" > <FolderInput size={15} /> </button>
            <button onClick={(e) => { e.stopPropagation(); onManageAction('delete', categoryId); }} className="p-1.5 rounded hover:bg-red-50 text-slate-500 hover:text-red-600 transition-colors" title="删除" > <Trash2 size={15} /> </button>
        </div>
    );
};

// --- 主组件: App ---
const App = () => {
    // 数据状态
    const [categories, setCategories] = useState([]);
    const [papers, setPapers] = useState([]);
    const [isDataLoaded, setIsDataLoaded] = useState(false);

    // UI 状态
    const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [lastBackupTime, setLastBackupTime] = useState(null);
    const [now, setNow] = useState(Date.now());
    const [readingHistory, setReadingHistory] = useState([]);
    const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
    const [activeCategoryId, setActiveCategoryId] = useState(null);
    const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
    const [showAllPapers, setShowAllPapers] = useState(false);
    const [activeTag, setActiveTag] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const deferredSearchQuery = useDeferredValue(searchQuery);
    const [sortConfig, setSortConfig] = useState({ key: 'default', direction: '' });
    const [expandedFolders, setExpandedFolders] = useState(['1', '2']);
    const [expandedPaperIds, setExpandedPaperIds] = useState([]);
    const [expandedSectionIds, setExpandedSectionIds] = useState([]);
    const [isManageMode, setIsManageMode] = useState(false);
    const [showTopButton, setShowTopButton] = useState(false);

    // --- 性能优化状态: 分页显示 ---
    const [displayLimit, setDisplayLimit] = useState(20);

    // 模态框状态
    const [isAddingPaper, setIsAddingPaper] = useState(false);
    const [editingPaper, setEditingPaper] = useState(null);
    const [categoryModal, setCategoryModal] = useState({ isOpen: false, parentId: null, editId: null, initialName: '' });
    const [newCategoryName, setNewCategoryName] = useState('');
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, type: null, id: null, title: '' });
    const [deleteCountdown, setDeleteCountdown] = useState(0);
    const [starModal, setStarModal] = useState({ isOpen: false, paperId: null, currentNote: '' });
    const [moveModal, setMoveModal] = useState({ isOpen: false, paperId: null });
    const [moveCategoryModal, setMoveCategoryModal] = useState({ isOpen: false, categoryId: null });

    const fileInputRef = useRef(null);
    const mainContentRef = useRef(null);
    // 默认数据
    const defaultCategories = useMemo(() => [
        { id: '1', name: '人工智能核心 (Core AI)', parentId: null },
        { id: '2', name: '深度学习架构 (DL Architectures)', parentId: '1' },
        { id: '3', name: '注意力机制 (Attention)', parentId: '2' },
    ], []);
    const defaultPapers = useMemo(() => [
        {
            id: 'p1', categoryId: '3', title: 'Attention Is All You Need', venue: 'NeurIPS 2017', link: 'https://arxiv.org/abs/1706.03762', year: '2017',
            problem: 'RNN/CNN 难以并行计算。\n\n**核心公式：**\n$$ Attention(Q, K, V) = softmax(\\frac{QK^T}{\\sqrt{d_k}})V $$',
            method: '提出 Transformer 架构。',
            results: 'WMT-14 SOTA。', thoughts: 'LLM 基石。',
            status: 'read', isStarred: true, starNote: '必读经典',
            rating: 10, ratedDate: new Date().toISOString(), tags: ['Machine Learning']
        }
    ], []);

    // 初始化定时器与主题同步
    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDarkMode]);

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 3600000);
        return () => clearInterval(timer);
    }, []);
    // --- 新增：切换视图时自动回到顶部 ---
    useEffect(() => {
        if (mainContentRef.current) {
            // 使用 behavior: 'auto' 可以瞬间跳回顶部，觉得突兀可以改成 'smooth'
            mainContentRef.current.scrollTo({ top: 0, behavior: 'auto' });
        }
    }, [activeCategoryId, showFavoritesOnly, showAllPapers, searchQuery, activeTag]);

    // 初始化数据加载 - 优化为并行加载 (Promise.all)
    useEffect(() => {
        const initData = async () => {
            try {
                // 性能优化：并行读取所有数据
                const [dbCats, dbPapers, dbHistory, dbBackupTime] = await Promise.all([
                    localforage.getItem('research_categories'),
                    localforage.getItem('research_papers'),
                    localforage.getItem('research_history'),
                    localforage.getItem('last_backup_timestamp')
                ]);

                if (dbCats && Array.isArray(dbCats)) {
                    setCategories(dbCats);
                    setPapers(dbPapers || []);
                    if (dbHistory) setReadingHistory(dbHistory);
                    if (dbBackupTime) setLastBackupTime(parseInt(dbBackupTime));
                } else {
                    const oldCats = localStorage.getItem('research_categories');
                    const oldPapers = localStorage.getItem('research_papers');
                    if (oldCats) {
                        const parsedCats = JSON.parse(oldCats);
                        const parsedPapers = oldPapers ? JSON.parse(oldPapers) : [];
                        setCategories(parsedCats);
                        setPapers(parsedPapers);
                        await Promise.all([
                            localforage.setItem('research_categories', parsedCats),
                            localforage.setItem('research_papers', parsedPapers)
                        ]);
                    } else {
                        setCategories(defaultCategories);
                        setPapers(defaultPapers);
                    }
                }
            } catch (err) {
                console.error("Data load error:", err);
            } finally {
                setIsDataLoaded(true);
            }
        };
        initData();
    }, [defaultCategories, defaultPapers]);

    // 数据持久化监听
    useEffect(() => { if (isDataLoaded) localforage.setItem('research_categories', categories).catch(console.error); }, [categories, isDataLoaded]);
    useEffect(() => { if (isDataLoaded) localforage.setItem('research_papers', papers).catch(console.error); }, [papers, isDataLoaded]);
    useEffect(() => { if (isDataLoaded) localforage.setItem('research_history', readingHistory).catch(console.error); }, [readingHistory, isDataLoaded]);

    useEffect(() => {
        if (isDataLoaded && categories.length > 0 && expandedSectionIds.length === 0) {
            // 1. 找到没有父亲的根节点
            const rootIds = categories.filter(c => !c.parentId).map(c => c.id);

            // 2. 只告诉界面：“请展开这几个根节点”
            setExpandedSectionIds(rootIds);
            setExpandedFolders(prev => [...new Set([...prev, ...rootIds])]);
        }
    }, [isDataLoaded, categories, expandedSectionIds.length]);

    // 统计逻辑
    const categoryCountsMap = useMemo(() => {
        const counts = {};
        const directCounts = {};
        categories.forEach(c => { counts[c.id] = { self: 0, total: 0 }; directCounts[c.id] = 0; });
        papers.forEach(p => { if (directCounts[p.categoryId] !== undefined) directCounts[p.categoryId]++; });
        const getRecursiveTotal = (id) => {
            let total = directCounts[id] || 0;
            const children = categories.filter(c => c.parentId === id);
            children.forEach(child => { total += getRecursiveTotal(child.id); });
            counts[id] = { self: directCounts[id] || 0, total };
            return total;
        };
        categories.filter(c => !c.parentId).forEach(c => getRecursiveTotal(c.id));
        return counts;
    }, [papers, categories]);

    // 备份状态逻辑
    const backupStatus = useMemo(() => {
        if (!lastBackupTime) return { label: '从未备份', color: 'bg-red-50 text-red-700 border-red-200', icon: <AlertTriangle size={13} />, severity: 'high' };
        const diffMs = now - lastBackupTime;
        const hours = diffMs / (1000 * 60 * 60);
        const days = Math.floor(hours / 24);

        let label = '';
        if (hours < 1) label = '< 1 小时前';
        else if (hours < 24) label = `${Math.floor(hours)} 小时前`;
        else label = `${days} 天前`;

        if (hours < 24) return { label: label + ' 备份', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle2 size={13} />, severity: 'safe' };
        if (hours < 72) return { label: label + ' 备份', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: <AlertCircle size={13} />, severity: 'warn' };
        return { label: `严重: ${label} 备份`, color: 'bg-red-50 text-red-700 border-red-200', icon: <AlertTriangle size={13} />, severity: 'danger' };
    }, [lastBackupTime, now]);

    const starredCount = useMemo(() => papers.filter(p => p.isStarred).length, [papers]);
    const getCategoryName = useCallback((id) => categories.find(c => c.id === id)?.name || 'Unknown', [categories]);

    // --- 核心排序逻辑 ---
    const sortPapers = useCallback((paperList) => {
        if (sortConfig.key === 'default') return paperList;

        return [...paperList].sort((a, b) => {
            if (sortConfig.key === 'ratedDate') {
                const dateA = a.ratedDate ? new Date(a.ratedDate).getTime() : null;
                const dateB = b.ratedDate ? new Date(b.ratedDate).getTime() : null;
                if (!dateA && !dateB) return 0;
                if (!dateA) return 1;
                if (!dateB) return -1;
                if (dateA < dateB) return sortConfig.direction === 'asc' ? -1 : 1;
                if (dateA > dateB) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            }

            let valA, valB;
            switch (sortConfig.key) {
                case 'year': valA = parseInt(a.year || '0'); valB = parseInt(b.year || '0'); break;
                case 'title': valA = a.title.toLowerCase(); valB = b.title.toLowerCase(); break;
                default: return 0;
            }
            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [sortConfig]);

    // 操作处理函数
    const handleSortChange = (key) => {
        setSortConfig(prev => {
            if (prev.key === key) {
                if (prev.direction === 'desc') return { key, direction: 'asc' };
                if (prev.direction === 'asc') return { key: 'default', direction: '' };
            }
            return { key, direction: 'desc' };
        });
    };

    const handleExportJSON = async () => {
        const currentTime = Date.now();
        const dataToSave = {
            version: "2.1",
            timestamp: new Date(currentTime).toISOString(),
            categories,
            papers
        };
        const blob = new Blob([JSON.stringify(dataToSave, null, 2)], { type: 'application/json' });
        const link = document.createElement("a");
        link.setAttribute("href", URL.createObjectURL(blob));
        link.setAttribute("download", `research_hub_backup_${new Date().toISOString().slice(0, 10)}.json`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setLastBackupTime(currentTime);
        await localforage.setItem('last_backup_timestamp', currentTime);
    };

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        if (file.size > 50 * 1024 * 1024) { alert("文件过大 (超过50MB)，请勿上传。"); event.target.value = ''; return; }
        const reader = new FileReader();
        reader.onload = (e) => processJSON(e.target.result);
        reader.readAsText(file);
        event.target.value = '';
    };

    const processJSON = async (jsonText) => {
        try {
            const data = JSON.parse(jsonText);
            if (!Array.isArray(data.categories) || !Array.isArray(data.papers)) { toast.error("备份格式错误。"); return; }
            toast((t) => (
                <div className="flex flex-col gap-3">
                    <p className="font-bold text-slate-800">确认恢复备份？</p>
                    <p className="text-sm text-slate-600">覆盖当前 {categories.length} 个分类和 {papers.length} 篇文献。此操作不可逆。</p>
                    <div className="flex gap-2 justify-end mt-2">
                        <button onClick={() => toast.dismiss(t.id)} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-md text-sm font-medium hover:bg-slate-200">取消</button>
                        <button onClick={async () => {
                            toast.dismiss(t.id);
                            setCategories(data.categories);
                            setPapers(data.papers);
                            await localforage.setItem('research_categories', data.categories);
                            await localforage.setItem('research_papers', data.papers);
                            toast.success(`✅ 成功恢复！`);
                        }} className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">确认覆盖</button>
                    </div>
                </div>
            ), { duration: Infinity, id: 'restore-confirm' });
        } catch { toast.error('解析失败，请检查文件。'); }
    };

    const toggleFolder = useCallback((id) => { setExpandedFolders(prev => prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]); }, []);

    const updateHistory = useCallback((paperId) => {
        setReadingHistory(prev => {
            const newHistory = [paperId, ...prev.filter(id => id !== paperId)].slice(0, 10);
            return newHistory;
        });
    }, []);

    const togglePaper = useCallback((id) => {
        setExpandedPaperIds(prev => {
            if (prev.includes(id)) {
                return prev.filter(pId => pId !== id);
            }
            updateHistory(id);
            return [...prev, id];
        });
    }, [updateHistory]);

    const toggleSection = (id) => { setExpandedSectionIds(prev => prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]); };

    const handleCategorySelect = useCallback((id) => {
        setActiveCategoryId(id);
        setShowFavoritesOnly(false);
        setShowAllPapers(false);
        setExpandedPaperIds([]);
        setDisplayLimit(20); // 性能优化：重置分页
    }, []);

    const handleAllPapersClick = useCallback(() => {
        setActiveCategoryId(null);
        setShowFavoritesOnly(false);
        setShowAllPapers(true);
        setSearchQuery('');
        setExpandedPaperIds([]);
        setDisplayLimit(20); // 性能优化：重置分页
    }, []);

    const handleHistoryClick = (paperId) => {
        const paper = papers.find(p => p.id === paperId);
        if (!paper) {
            setReadingHistory(prev => prev.filter(id => id !== paperId));
            return;
        }

        updateHistory(paperId);

        setShowFavoritesOnly(false);
        setShowAllPapers(false);
        setSearchQuery('');

        setActiveCategoryId(paper.categoryId);
        setExpandedPaperIds([paperId]);
        setDisplayLimit(20); // 性能优化：重置分页

        const parents = [];
        let currentId = paper.categoryId;
        while (currentId) {
            const cat = categories.find(c => c.id === currentId);
            if (cat && cat.parentId) {
                parents.push(cat.parentId);
                currentId = cat.parentId;
            } else {
                break;
            }
        }
        setExpandedFolders(prev => [...new Set([...prev, ...parents])]);
        setExpandedSectionIds(prev => [...new Set([...prev, paper.categoryId])]);

        setTimeout(() => {
            const element = document.getElementById(`paper-card-${paperId}`);
            if (element) {
                const container = element.closest('.overflow-y-auto');
                if (container) {
                    const elementRect = element.getBoundingClientRect();
                    const containerRect = container.getBoundingClientRect();
                    const currentScroll = container.scrollTop;
                    const offsetTop = 24;
                    const targetTop = currentScroll + (elementRect.top - containerRect.top) - offsetTop;
                    container.scrollTo({ top: targetTop, behavior: 'smooth' });
                } else {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        }, 100);
    };

    const handleSaveCategory = () => {
        if (!newCategoryName.trim()) return;
        const newId = categoryModal.editId || Date.now().toString();
        if (categoryModal.editId) {
            setCategories(prev => prev.map(c => c.id === newId ? { ...c, name: newCategoryName.trim() } : c));
        } else {
            setCategories(prev => [...prev, { id: newId, name: newCategoryName.trim(), parentId: categoryModal.parentId }]);
            setExpandedSectionIds(prev => [...prev, newId]);
            if (categoryModal.parentId) setExpandedFolders(prev => [...new Set([...prev, categoryModal.parentId])]);
        }
        setCategoryModal({ isOpen: false, parentId: null, editId: null, initialName: '' }); setNewCategoryName('');
    };

    const handleManageAction = useCallback((action, id) => {
        const cat = categories.find(c => c.id === id);
        if (!cat) return;
        if (action === 'moveUp' || action === 'moveDown') {
            setCategories(prev => {
                const idx = prev.findIndex(c => c.id === id);
                if (idx < 0) return prev;
                const targetIdx = action === 'moveUp'
                    ? prev.findLastIndex((c, i) => i < idx && c.parentId === cat.parentId)
                    : prev.findIndex((c, i) => i > idx && c.parentId === cat.parentId);
                if (targetIdx !== -1) {
                    const next = [...prev];
                    [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
                    return next;
                }
                return prev;
            });
        }
        if (action === 'add') { setCategoryModal({ isOpen: true, parentId: id, editId: null, initialName: '' }); setNewCategoryName(''); }
        if (action === 'edit') { setCategoryModal({ isOpen: true, parentId: null, editId: id, initialName: cat.name }); setNewCategoryName(cat.name); }
        if (action === 'delete') {
            setDeleteModal({ isOpen: true, type: 'category', id: id, title: cat.name });
            setDeleteCountdown(3);
        }
        if (action === 'moveCategory') { setMoveCategoryModal({ isOpen: true, categoryId: id }); }
    }, [categories]);

    const handleConfirmDelete = () => {
        const { type, id } = deleteModal;
        if (type === 'category') {
            const getIds = (root) => [root, ...categories.filter(c => c.parentId === root).flatMap(c => getIds(c.id))];
            const ids = getIds(id);
            setCategories(prev => prev.filter(c => !ids.includes(c.id)));
            if (ids.includes(activeCategoryId)) setActiveCategoryId(null);
        } else {
            setPapers(prev => prev.filter(p => p.id !== id));
        }
        setDeleteModal({ isOpen: false, type: null, id: null, title: '' });
    };

    const handleStarClick = (paperId, isStarred) => {
        if (isStarred) setPapers(prev => prev.map(p => p.id === paperId ? { ...p, isStarred: false, starNote: '' } : p));
        else setStarModal({ isOpen: true, paperId, currentNote: '' });
    };

    const saveStarNote = (note) => {
        setPapers(prev => prev.map(p => p.id === starModal.paperId ? { ...p, isStarred: true, starNote: note } : p));
        setStarModal({ isOpen: false, paperId: null, currentNote: '' });
    };

    // --- 标签汇总 ---
    const allTagsMap = useMemo(() => {
        const map = {};
        papers.forEach(p => {
            if (Array.isArray(p.tags)) {
                p.tags.forEach(t => { map[t] = (map[t] || 0) + 1; });
            }
        });
        return Object.entries(map).sort((a, b) => b[1] - a[1]);
    }, [papers]);

    // --- 过滤与排序 ---
    const filteredFlatPapers = useMemo(() => {
        let res = papers;
        // 1. 过滤
        if (showFavoritesOnly) res = res.filter(p => p.isStarred);
        if (activeTag) res = res.filter(p => p.tags && p.tags.includes(activeTag));
        if (deferredSearchQuery) {
            const q = deferredSearchQuery.toLowerCase();
            res = res.filter(p => p.title.toLowerCase().includes(q) || p.venue.toLowerCase().includes(q) || p.starNote?.toLowerCase().includes(q) || (p.tags && p.tags.some(t => t.toLowerCase().includes(q))));
        }
        // 2. 排序
        return sortPapers(res);
    }, [papers, showFavoritesOnly, activeTag, deferredSearchQuery, sortPapers]);

    // --- 说明导览状态 ---
    const [showWelcome, setShowWelcome] = useState(false);

    useEffect(() => {
        // 检查是否是第一次进入
        const checkFirstTime = async () => {
            const hasSeen = await localforage.getItem('hasSeenWelcomeV1');
            if (!hasSeen) {
                setShowWelcome(true);
            }
        };
        if (isDataLoaded) checkFirstTime();
    }, [isDataLoaded]);

    const handleCloseWelcome = async () => {
        setShowWelcome(false);
        await localforage.setItem('hasSeenWelcomeV1', true);
    };

    // --- 早退: 极简加载 (避免骨架屏导致 Sidebar 布局突变闪烁) ---
    if (!isDataLoaded) {
        return (
            <div className={`flex flex-col items-center justify-center w-screen h-screen ${THEME.bg} text-slate-400 gap-3`}>
                <Loader2 className="animate-spin text-blue-500" size={32} />
                <p className="text-sm font-medium">正在加载知识库...</p>
            </div>
        );
    }

    // --- 辅助渲染函数 ---
    const getAllDescendantIds = (rootId) => {
        let ids = [rootId];
        const children = categories.filter(c => c.parentId === rootId);
        children.forEach(child => {
            ids = [...ids, ...getAllDescendantIds(child.id)];
        });
        return ids;
    };

    const renderMoveCategoryModalTree = (parentId = null, depth = 0, excludeIds = []) => {
        const children = categories.filter(c => c.parentId === parentId);
        if (!children.length) return null;
        return children.map(cat => {
            if (excludeIds.includes(cat.id)) return null;
            return (
                <div key={cat.id}>
                    <button
                        onClick={() => {
                            setCategories(prev => prev.map(c => c.id === moveCategoryModal.categoryId ? { ...c, parentId: cat.id } : c));
                            setMoveCategoryModal({ isOpen: false, categoryId: null });
                        }}
                        className="w-full text-left py-2 rounded-lg hover:bg-slate-100 text-sm font-medium text-slate-700 flex items-center gap-2 transition-colors relative"
                        style={{ paddingLeft: `${depth * 20 + 12}px` }}
                    >
                        {depth > 0 && <CornerDownRight size={14} className="text-slate-300 absolute" style={{ left: `${depth * 20 - 10}px` }} />}
                        <Folder size={16} className={depth === 0 ? "text-blue-500" : "text-slate-400"} /> <span className="truncate">{cat.name}</span>
                    </button>
                    {renderMoveCategoryModalTree(cat.id, depth + 1, excludeIds)}
                </div>
            );
        });
    };

    const renderMoveModalTree = (parentId = null, depth = 0) => {
        const children = categories.filter(c => c.parentId === parentId);
        if (!children.length) return null;
        return children.map(cat => (
            <div key={cat.id}>
                <button onClick={() => {
                    if (moveModal.paperId) setPapers(prev => prev.map(p => p.id === moveModal.paperId ? { ...p, categoryId: cat.id } : p));
                    setMoveModal({ isOpen: false, paperId: null });
                }} className="w-full text-left py-2 rounded-lg hover:bg-slate-100 text-sm font-medium text-slate-700 flex items-center gap-2 transition-colors relative" style={{ paddingLeft: `${depth * 20 + 12}px` }}>
                    {depth > 0 && <CornerDownRight size={14} className="text-slate-300 absolute" style={{ left: `${depth * 20 - 10}px` }} />}
                    <Folder size={16} className={depth === 0 ? "text-blue-500" : "text-slate-400"} /> <span className="truncate">{cat.name}</span>
                </button>
                {renderMoveModalTree(cat.id, depth + 1)}
            </div>
        ));
    };

    // 递归渲染分类块 (优化版: 仅直接列表进行分页，避免递归深坑)
    const renderCategoryBlock = (categoryId, depth = 0) => {
        const cat = categories.find(c => c.id === categoryId);
        if (!cat) return null;

        const paperList = papers.filter(p => p.categoryId === categoryId);
        const directPapers = sortPapers(paperList);

        const children = categories.filter(c => c.parentId === categoryId);
        const isExpanded = expandedSectionIds.includes(categoryId);
        const count = categoryCountsMap[categoryId] || { total: 0 };

        const getHeaderStyle = (d) => {
            if (d === 0) return {
                wrapper: "mb-4 mt-8 pb-3 border-b border-slate-200 dark:border-slate-800",
                icon: <Folder className="text-blue-600 dark:text-blue-400 mr-2.5" size={22} />,
                text: "text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight",
                arrow: 22
            };
            if (d === 1) return {
                wrapper: "mb-3 mt-6 ml-1",
                icon: <FolderOpen className="text-slate-500 dark:text-slate-400 mr-2" size={18} />,
                text: "text-lg font-semibold text-slate-800 dark:text-slate-200",
                arrow: 18
            };
            if (d === 2) return {
                wrapper: "mb-2 mt-4 ml-3 pl-3 border-l-2 border-slate-200 dark:border-slate-800",
                icon: <Hash className="text-slate-400 dark:text-slate-500 mr-2" size={16} />,
                text: "text-base font-medium text-slate-700 dark:text-slate-300",
                arrow: 16
            };
            return {
                wrapper: "mb-2 mt-2 ml-5 flex items-center opacity-80",
                icon: <Circle className="text-slate-300 dark:text-slate-600 mr-2 fill-current" size={8} />,
                text: "text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider",
                arrow: 14
            };
        };

        const style = getHeaderStyle(depth);

        return (
            <div key={categoryId} className="animate-in fade-in duration-300">
                <div className={`cursor-pointer group select-none flex items-center justify-between transition-colors hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg px-2 -ml-2 ${style.wrapper}`} onClick={() => toggleSection(categoryId)}>
                    <div className="flex items-center">
                        <div className={`mr-1 transition-transform duration-200 ${isExpanded ? 'rotate-0 text-slate-400' : '-rotate-90 text-slate-300'}`}> <ChevronDown size={style.arrow} /> </div>
                        {style.icon}
                        <h3 className={style.text}>
                            {cat.name}
                            <span className="ml-2 text-[11px] font-normal text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full align-middle relative -top-0.5 border border-slate-200 dark:border-slate-700">{count.total}</span>
                        </h3>
                    </div>
                    {isManageMode && <ManagementToolbar onManageAction={handleManageAction} categoryId={cat.id} />}
                </div>
                {isExpanded && (
                    <div className="">
                        {directPapers.length > 0 && (
                            <div className="grid grid-cols-1 gap-5 mb-6">
                                {/* 性能优化: 文件夹视图虽然不强制全局分页，但超过50篇也需要限制，这里为了简洁暂不加Folder内分页，因为一般文件夹内不会有太多 */}
                                {directPapers.map(p => (
                                    <CompactPaperCard
                                        key={p.id}
                                        paper={p}
                                        isManageMode={isManageMode}
                                        isExpanded={expandedPaperIds.includes(p.id)}
                                        onToggle={() => togglePaper(p.id)}
                                        onStarClick={() => handleStarClick(p.id, p.isStarred)}
                                        onEdit={() => {
                                            updateHistory(p.id);
                                            setEditingPaper(p);
                                            setIsAddingPaper(true);
                                        }}
                                        onDelete={() => {
                                            setDeleteModal({ isOpen: true, type: 'paper', id: p.id, title: p.title });
                                            setDeleteCountdown(1);
                                        }}
                                        onMove={() => setMoveModal({ isOpen: true, paperId: p.id })}
                                    />
                                ))}
                            </div>
                        )}
                        <div className={depth >= 0 ? "pl-3" : ""}> {children.map(c => renderCategoryBlock(c.id, depth + 1))} </div>
                    </div>
                )}
            </div>
        );
    };


    return (
        <div className={`flex h-screen ${THEME.bg} ${THEME.text.main} font-sans overflow-hidden antialiased`}>
            <Toaster position="top-right" toastOptions={{ duration: 3000, style: { fontSize: '14px', borderRadius: '10px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' } }} />
            {/* 侧边栏 */}
            <div className={`${isSidebarOpen ? 'w-80 translate-x-0' : 'w-0 -translate-x-full opacity-0'} flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-300 ease-in-out shrink-0 overflow-hidden whitespace-nowrap shadow-[4px_0_24px_-12px_rgba(0,0,0,0.05)] z-20`}>
                <div className="p-5 border-b border-slate-50 dark:border-slate-800/50 flex items-center gap-3 min-w-[320px]">
                    <div 
                        onClick={() => setShowWelcome(true)}
                        className="bg-slate-800 text-white p-2.5 rounded-lg shadow-md cursor-pointer hover:bg-blue-600 transition-colors active:scale-95"
                        title="查看功能指南"
                    > 
                        <BookOpen size={22} strokeWidth={2.5} /> 
                    </div>
                    <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">PaperStack <span className="text-[11px] bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded ml-1 font-bold border border-blue-100 dark:border-blue-800/50">PRO</span></h1>
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar min-w-[320px]">
                    {!isManageMode && (
                        <>
                            <div className={`flex items-center px-3 py-2.5 mb-2 rounded-lg cursor-pointer text-[14px] font-medium transition-colors ${showAllPapers ? 'bg-slate-800 dark:bg-slate-700 text-white shadow-md' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`} onClick={() => { setShowAllPapers(true); setShowFavoritesOnly(false); setActiveCategoryId(null); setActiveTag(null); setExpandedPaperIds([]); setDisplayLimit(20); }} >
                                <Globe size={18} className={`mr-3 ${showAllPapers ? 'text-slate-300' : 'text-slate-400 dark:text-slate-500'}`} /> 全部文献 <span className={`ml-auto px-2 py-0.5 rounded-full text-[11px] font-bold ${showAllPapers ? 'bg-slate-700 dark:bg-slate-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>{papers.length}</span>
                            </div>
                            <div className={`flex items-center px-3 py-2.5 mb-2 rounded-lg cursor-pointer text-[14px] font-medium transition-colors ${showFavoritesOnly ? 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 ring-1 ring-rose-200/50 dark:ring-rose-800' : 'text-slate-600 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-700 dark:hover:text-rose-100'}`} onClick={() => { setActiveCategoryId(null); setShowFavoritesOnly(true); setShowAllPapers(false); setActiveTag(null); setExpandedPaperIds([]); setDisplayLimit(20); }} >
                                <Heart size={18} className={`mr-3 ${showFavoritesOnly ? 'text-rose-500 fill-rose-500' : 'text-slate-400 dark:text-slate-500'}`} /> 我的收藏 <span className={`ml-auto px-2 py-0.5 rounded-full text-[11px] font-bold ${showFavoritesOnly ? 'bg-rose-100/50 dark:bg-rose-900/50 text-rose-800 dark:text-rose-200' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>{starredCount}</span>
                            </div>

                            {readingHistory.length > 0 && (
                                <div className="mb-6 mt-6">
                                    <div
                                        className="px-3 text-[11px] font-bold text-slate-400 dark:text-slate-100 uppercase tracking-widest mb-2 flex items-center justify-between cursor-pointer hover:text-slate-600 dark:hover:text-white transition-colors"
                                        onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                                    >
                                        <div className="flex items-center gap-1">
                                            <History size={13} /> 最近阅读
                                        </div>
                                        <div className={`transition-transform duration-200 ${isHistoryExpanded ? 'rotate-0' : '-rotate-90'}`}>
                                            <ChevronDown size={13} />
                                        </div>
                                    </div>
                                    {isHistoryExpanded && (
                                        <div className="space-y-0.5 animate-in slide-in-from-top-1 duration-200 pl-1">
                                            {readingHistory.map(id => {
                                                const p = papers.find(paper => paper.id === id);
                                                if (!p) return null;
                                                return (
                                                    <div key={id} onClick={() => handleHistoryClick(id)} className="group flex items-center px-2 py-2 rounded-md cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mr-2.5 group-hover:bg-blue-500"></div>
                                                        <span className="text-[13px] text-slate-500 dark:text-slate-300 truncate font-medium group-hover:text-blue-700 dark:group-hover:text-blue-400">{p.title}</span>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* --- 标签库 --- */}
                            {allTagsMap.length > 0 && (
                                <div className="mb-4 mt-6">
                                    <div className="px-3 text-[11px] font-bold text-slate-400 dark:text-slate-100 uppercase tracking-widest mb-3 flex items-center justify-between">
                                        <div className="flex items-center gap-1"><Hash size={13} /> 个人标签库</div>
                                    </div>
                                    <div className="flex flex-wrap gap-2 px-3">
                                        {allTagsMap.map(([tag, count]) => (
                                            <button
                                                key={tag}
                                                onClick={() => { setActiveTag(activeTag === tag ? null : tag); setShowAllPapers(false); setShowFavoritesOnly(false); setActiveCategoryId(null); setDisplayLimit(20); }}
                                                className={`px-2.5 py-1 rounded-md text-[12px] font-medium transition-colors border ${activeTag === tag ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                                                title={`包含 "${tag}" 的文献`}
                                            >
                                                {tag} <span className={`ml-1 text-[10px] ${activeTag === tag ? 'text-blue-200' : 'text-slate-400 dark:text-slate-500'}`}>{count}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    <div className="my-4 px-3">
                        <div className="h-px bg-slate-100 dark:bg-slate-800 w-full"></div>
                    </div>

                    {isManageMode && <div className="bg-amber-50/50 border border-amber-200/50 rounded-lg p-3 mb-3 text-xs text-amber-700 font-medium flex items-center gap-2"> <AlertTriangle size={14} /> 管理模式已开启</div>}
                    <div className="pl-0">
                        <SidebarTree categories={categories} parentId={null} activeCategoryId={activeCategoryId} expandedFolders={expandedFolders} isManageMode={isManageMode} countsMap={categoryCountsMap} onToggle={toggleFolder} onSelect={handleCategorySelect} onManageAction={handleManageAction} />
                    </div>
                    {isManageMode && (<button onClick={() => { setCategoryModal({ isOpen: true, parentId: null, editId: null, initialName: '' }); setNewCategoryName(''); }} className="w-full mt-4 flex items-center justify-center gap-1.5 bg-white text-slate-500 border border-dashed border-slate-300 hover:border-blue-400 hover:text-blue-600 py-3 rounded-lg text-[13px] font-bold transition-all" > <PlusCircle size={15} /> 新建顶级分类 </button>)}
                </div>
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/50 min-w-[320px]">
                    <input type="file" accept=".json" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                    {isManageMode ? (
                        <div className="flex flex-col gap-3 animate-in slide-in-from-bottom-2">
                            <div className="flex gap-2">
                                <button onClick={handleExportJSON} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold bg-white text-slate-600 border border-slate-200 hover:bg-blue-50 hover:border-blue-100 shadow-sm" title="备份" > <Download size={14} /> 备份 </button>
                                <button onClick={() => fileInputRef.current.click()} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold bg-white text-slate-600 border border-slate-200 hover:bg-blue-50 hover:border-blue-100 shadow-sm" title="恢复" > <Upload size={14} /> 恢复 </button>
                            </div>
                            <button onClick={() => setIsManageMode(false)} className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-xs font-bold bg-slate-900 text-white shadow-md hover:bg-slate-800 transition-colors" > <CheckCircle2 size={16} /> 完成 </button>
                        </div>
                    ) : (
                        <div className="flex gap-2">
                            <button onClick={() => setIsManageMode(true)} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-[13px] font-bold bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 hover:text-slate-700 transition-colors" > <Settings size={16} /> 管理模式 </button>
                            <button onClick={() => setIsDarkMode(!isDarkMode)} className="w-[46px] flex items-center justify-center shrink-0 rounded-lg bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 border border-slate-200 dark:border-slate-700 transition-colors" title="切换深浅色"> {isDarkMode ? <Sun size={17} /> : <Moon size={17} />} </button>
                        </div>
                    )}
                </div>
            </div>

            {/* 主内容区域 */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 relative">
                <div className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md flex items-center justify-between px-8 shrink-0 z-10 gap-5 sticky top-0">
                    <div className="flex items-center gap-4 flex-1">
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 transition-colors mr-1">
                            {isSidebarOpen ? <PanelLeftClose size={22} /> : <PanelLeftOpen size={22} />}
                        </button>
                        <div className="relative flex-1 max-w-lg group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-300 group-focus-within:text-blue-500 transition-colors" size={18} />
                            <input className="w-full pl-10 pr-4 py-2.5 bg-slate-100/50 dark:bg-slate-800/50 border-transparent dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 border dark:border-slate-700/50 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 rounded-lg outline-none text-[15px] transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500" placeholder="搜索文献..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setDisplayLimit(20); /* 搜索时重置分页 */ }} />
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                    <div className={`flex items-center text-xs font-medium mr-1 whitespace-nowrap transition-all ${isSidebarOpen ? 'hidden xl:flex' : 'hidden md:flex'}`}>
                        <div onClick={handleExportJSON} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border cursor-pointer transition-all hover:shadow-sm ${backupStatus.color}`}>
                            {backupStatus.icon} <span className="font-semibold">{backupStatus.label}</span>
                        </div>
                    </div>

                        {/* 恢复的排序按钮组 */}
                        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                            <button
                                onClick={() => handleSortChange('year')}
                                className={`p-2 rounded-md transition-all flex items-center gap-1 ${sortConfig.key === 'year' ? 'bg-white dark:bg-slate-700 shadow text-blue-600 dark:text-blue-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                                title="按年份排序"
                            >
                                <Calendar size={16} />
                                {sortConfig.key === 'year' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                            </button>
                            <div className="w-px h-4 bg-slate-200 dark:bg-slate-600 mx-1"></div>
                            <button
                                onClick={() => handleSortChange('ratedDate')}
                                className={`p-2 rounded-md transition-all flex items-center gap-1 ${sortConfig.key === 'ratedDate' ? 'bg-white dark:bg-slate-700 shadow text-amber-500' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                                title="按评分时间排序"
                            >
                                <Star size={16} />
                                {sortConfig.key === 'ratedDate' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                            </button>
                        </div>

                        <button onClick={() => { setEditingPaper(null); setIsAddingPaper(true); }} className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-lg text-[14px] font-bold shadow-lg shadow-slate-900/10 whitespace-nowrap transition-all active:scale-95"> <PlusCircle size={18} /> <span>新文献</span> </button>
                    </div>
                </div>

                <div 
                    ref={mainContentRef} 
                    onScroll={(e) => setShowTopButton(e.target.scrollTop > 500)}
                    className="flex-1 overflow-y-auto p-10 custom-scrollbar pb-32"
                >
                    <div className="mb-10 flex items-end justify-between group">
                        <div>
                            <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3 tracking-tight">
                                {searchQuery ? <> <Search size={28} className="text-blue-600 dark:text-blue-400" /> 搜索: "{searchQuery}" </> :
                                    showFavoritesOnly ? <> <Heart size={28} className="text-rose-500 fill-rose-500" /> 我收藏的文献 </> :
                                        showAllPapers ? <> <ListFilter size={28} className="text-blue-600 dark:text-blue-400" /> 全部文献列表 </> :
                                            activeTag ? <> <Hash size={28} className="text-blue-600 dark:text-blue-400" /> {activeTag} </> :
                                                activeCategoryId ? <> <Folder size={28} className="text-blue-600 dark:text-blue-400" /> {getCategoryName(activeCategoryId)} </> :
                                                    <> <Globe size={28} className="text-slate-700 dark:text-slate-200" /> 知识库概览 </>}
                            </h2>
                            <p className="text-slate-500 dark:text-slate-300 text-base mt-2 ml-1 font-medium"> {searchQuery || showFavoritesOnly || showAllPapers || activeTag ? `共 ${filteredFlatPapers.length} 篇` : '您的个人知识库'} </p>
                        </div>
                        {isManageMode && activeCategoryId && <ManagementToolbar onManageAction={handleManageAction} categoryId={activeCategoryId} />}
                    </div>

                    {searchQuery || showFavoritesOnly || showAllPapers || activeTag ? (
                        <div className="grid grid-cols-1 gap-5">
                            {/* 性能优化核心：只渲染前 displayLimit 个元素 (Virtualization/Pagination) */}
                            {filteredFlatPapers.slice(0, displayLimit).map(p => (
                                <CompactPaperCard
                                    key={p.id} paper={p} isManageMode={isManageMode} isExpanded={expandedPaperIds.includes(p.id)} onToggle={() => togglePaper(p.id)}
                                    onStarClick={() => handleStarClick(p.id, p.isStarred)} onEdit={() => { updateHistory(p.id); setEditingPaper(p); setIsAddingPaper(true); }} onDelete={() => { setDeleteModal({ isOpen: true, type: 'paper', id: p.id, title: p.title }); setDeleteCountdown(1); }} onMove={() => setMoveModal({ isOpen: true, paperId: p.id })}
                                />
                            ))}
                            {/* 性能优化：简单的加载更多触发器，避免一次性渲染DOM爆炸 */}
                            {filteredFlatPapers.length > displayLimit && (
                                <div className="text-center pt-4 pb-8">
                                    <button
                                        onClick={() => setDisplayLimit(prev => prev + 20)}
                                        className="text-slate-400 hover:text-slate-600 text-sm font-bold bg-slate-100 hover:bg-slate-200 px-6 py-3 rounded-full transition-colors"
                                    >
                                        加载更多 ({filteredFlatPapers.length - displayLimit} 篇剩余)
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-10">
                            {activeCategoryId ? (() => {
                                const direct = sortPapers(papers.filter(p => p.categoryId === activeCategoryId));
                                const children = categories.filter(c => c.parentId === activeCategoryId);
                                return (
                                    <div>
                                        {direct.length > 0 && (
                                            <div className="grid grid-cols-1 gap-5 mb-10">
                                                {direct.map(p => (
                                                    <CompactPaperCard
                                                        key={p.id}
                                                        paper={p}
                                                        isManageMode={isManageMode}
                                                        isExpanded={expandedPaperIds.includes(p.id)}
                                                        onToggle={() => togglePaper(p.id)}
                                                        onStarClick={() => handleStarClick(p.id, p.isStarred)}
                                                        onEdit={() => { updateHistory(p.id); setEditingPaper(p); setIsAddingPaper(true); }}
                                                        onDelete={() => { setDeleteModal({ isOpen: true, type: 'paper', id: p.id, title: p.title }); setDeleteCountdown(1); }}
                                                        onMove={() => setMoveModal({ isOpen: true, paperId: p.id })}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                        {children.map(c => renderCategoryBlock(c.id, 0))}
                                        {direct.length === 0 && children.length === 0 && <div className="text-center py-16 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-[15px]">空文件夹</div>}
                                    </div>
                                );
                            })() : categories.filter(c => !c.parentId).map(c => renderCategoryBlock(c.id, 0))}
                        </div>
                    )}
                </div>

                {/* 返回顶部按钮 */}
                <button
                    onClick={() => mainContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
                    className={`absolute bottom-8 right-8 p-3 rounded-full bg-slate-900 text-white shadow-2xl shadow-slate-900/20 hover:bg-blue-600 hover:scale-110 active:scale-95 transition-all duration-300 z-40 flex items-center justify-center ${showTopButton ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}
                    title="返回顶部"
                >
                    <ArrowUp size={22} strokeWidth={2.5} />
                </button>
            </div>

            {/* 移动文件夹 Modal */}
            {moveCategoryModal.isOpen && (
                <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-sm rounded-xl shadow-2xl p-6 flex flex-col max-h-[80vh] border border-slate-100">
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><FolderInput size={20} className="text-violet-600" /> 移动文件夹</h3>
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {renderMoveCategoryModalTree(null, 0, getAllDescendantIds(moveCategoryModal.categoryId))}
                        </div>
                        <button onClick={() => setMoveCategoryModal({ isOpen: false, categoryId: null })} className="mt-4 w-full py-2 bg-slate-100 rounded text-sm font-bold text-slate-600">取消</button>
                    </div>
                </div>
            )}

            {/* 移动文献 Modal */}
            {moveModal.isOpen && (
                <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-sm rounded-xl shadow-2xl p-6 flex flex-col max-h-[80vh] border border-slate-100">
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><FolderInput size={20} className="text-blue-600" /> 移动文献</h3>
                        <div className="flex-1 overflow-y-auto custom-scrollbar"> {renderMoveModalTree(null, 0)} </div>
                        <button onClick={() => setMoveModal({ isOpen: false, paperId: null })} className="mt-4 w-full py-2 bg-slate-100 rounded text-sm font-bold text-slate-600">取消</button>
                    </div>
                </div>
            )}

            {/* 分类编辑 Modal */}
            {categoryModal.isOpen && (
                <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-sm rounded-xl shadow-2xl p-6 border border-slate-100">
                        <input autoFocus className="w-full px-4 py-3 border border-slate-200 rounded-lg outline-none mb-6 text-sm" placeholder="名称..." value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSaveCategory()} />
                        <div className="flex justify-end gap-3">
                            <button onClick={() => { setCategoryModal({ isOpen: false, parentId: null, editId: null, initialName: '' }); setNewCategoryName(''); }} className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-lg">取消</button>
                            <button onClick={handleSaveCategory} className="px-5 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 shadow-md">保存</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 删除确认 Modal */}
            {deleteModal.isOpen && (
                <div className="fixed inset-0 bg-red-900/10 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-xs rounded-xl shadow-2xl p-6 border border-red-50">
                        <h3 className="text-lg font-bold text-red-600 mb-3 flex items-center gap-2"> <AlertCircle size={20} /> 确认删除? </h3>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setDeleteModal({ isOpen: false })} className="px-4 py-2 text-sm font-bold text-slate-500">取消</button>
                            <button onClick={() => { if (deleteCountdown > 1) setDeleteCountdown(prev => prev - 1); else handleConfirmDelete(); }} className={`px-4 py-2 text-white text-sm font-bold rounded-lg ${deleteCountdown > 1 ? 'bg-red-300' : 'bg-red-600'}`}>{deleteCountdown > 1 ? `删除 (${deleteCountdown})` : '确认删除'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 收藏备注 Modal */}
            {starModal.isOpen && (
                <div className="fixed inset-0 bg-rose-900/10 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-sm rounded-xl shadow-2xl p-6 border border-rose-100">
                        <textarea autoFocus rows={3} className="w-full px-4 py-3 bg-rose-50/50 border border-rose-200 rounded-lg outline-none mb-6 text-sm" value={starModal.currentNote} onChange={(e) => setStarModal({ ...starModal, currentNote: e.target.value })} />
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setStarModal({ isOpen: false })} className="px-4 py-2 text-sm font-bold text-slate-500">取消</button>
                            <button onClick={() => saveStarNote(starModal.currentNote)} className="px-4 py-2 bg-rose-500 text-white text-sm font-bold rounded-lg">确定</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 论文编辑全屏 Modal */}
            {isAddingPaper && (
                <ExpertPaperModal
                    paper={editingPaper}
                    onClose={() => { setIsAddingPaper(false); setEditingPaper(null); }}
                    onSave={(d) => {
                        if (editingPaper) setPapers(p => p.map(x => x.id === editingPaper.id ? { ...d, id: x.id } : x));
                        // 修改为：新数据在前，旧数据在后 (...p)
                        else setPapers(p => [{ ...d, id: Date.now().toString(), categoryId: activeCategoryId || categories[0]?.id || '' }, ...p]);
                        
                        // 建议同时滚动到顶部，确保用户看到新添加的项目
                        if (mainContentRef.current) mainContentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                        
                        setIsAddingPaper(false);
                        setEditingPaper(null);
                    }}
                    categoryName={categories.find(c => c.id === activeCategoryId)?.name || "未分类"}
                />
            )}

            {/* 欢迎导览 Modal */}
            {showWelcome && <WelcomeModal onClose={handleCloseWelcome} />}
        </div>
    );
};

// --- 组件: WelcomeModal (欢迎导览) ---
const WelcomeModal = ({ onClose }) => {
    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col md:flex-row max-h-[90vh]">
                <div className="bg-blue-600 p-10 text-white flex flex-col justify-between md:w-56 shrink-0 font-sans">
                    <div>
                        <div className="bg-white/20 w-12 h-12 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
                            <BookOpen size={28} />
                        </div>
                        <h2 className="text-2xl font-black tracking-tight leading-tight">欢迎使用<br/>PaperStack</h2>
                    </div>
                    <div className="text-blue-100/60 text-xs font-bold uppercase tracking-widest mt-10">AI Powered Insight</div>
                </div>
                <div className="flex-1 p-10 overflow-y-auto custom-scrollbar bg-slate-50/30 dark:bg-slate-900/30">
                    <div className="space-y-8">
                        <section>
                            <h3 className="text-slate-900 dark:text-slate-100 font-bold flex items-center gap-2 mb-3">
                                <Zap size={18} className="text-amber-500" /> 工具定位与初衷
                            </h3>
                            <p className="text-slate-600 dark:text-slate-300 text-[15px] leading-relaxed">
                                PaperStack 不是替代 Zotero 的文献管理器，而是其<b>最佳辅助</b>——帮你把阅读灵感、打分和思绪，转化为清晰的记录。
                            </p>
                        </section>

                        <section>
                            <h3 className="text-slate-900 dark:text-slate-100 font-bold flex items-center gap-2 mb-3">
                                <Lightbulb size={18} className="text-blue-500" /> 💡 推荐工作流 (最省力方案)
                            </h3>
                            <div className="bg-white dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50 shadow-sm">
                                <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                                    读完论文后，向 AI 索取一份 Markdown 核心总结。
                                    <b>一键粘贴进来</b>，配上评分和 Ideas，记录从此不再是负担。
                                </p>
                            </div>
                        </section>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 bg-white dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50 shadow-sm">
                                <div className="text-blue-600 dark:text-blue-400 font-bold text-xs uppercase mb-1 flex items-center gap-1.5"><Star size={12} /> 追踪不遗忘</div>
                                <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">记录评分与读完时间，永远清楚最近看了什么。</p>
                            </div>
                            <div className="p-4 bg-white dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50 shadow-sm">
                                <div className="text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase mb-1 flex items-center gap-1.5"><Globe size={12} /> 个人隐私</div>
                                <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">数据仅存本地浏览器。请养成定时<b>导出备份 (JSON)</b> 的好习惯。</p>
                            </div>
                        </div>

                        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-6">
                            <a 
                                href="https://github.com/xiechen2333/PaperStack/blob/main/README.md" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 dark:text-blue-400 text-sm font-bold flex items-center gap-1.5 hover:underline decoration-2 underline-offset-4"
                            >
                                <ExternalLink size={16} /> 查看完整 GitHub 文档
                            </a>
                            <button 
                                onClick={onClose}
                                className="w-full sm:w-auto px-10 py-3.5 bg-slate-900 dark:bg-blue-600 text-white font-black rounded-2xl hover:bg-slate-800 dark:hover:bg-blue-500 transition-all shadow-xl shadow-blue-500/10 active:scale-95"
                            >
                                我知道了，开始使用
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- 组件: CompactPaperCard (交互终极版 - 性能优化) ---
const CompactPaperCard = React.memo(({ paper, isManageMode, isExpanded, onToggle, onStarClick, onEdit, onDelete, onMove }) => {
    const [isCollapsing, setIsCollapsing] = React.useState(false);
    const cardRef = React.useRef(null);
    // 曾经展开过才触发收起时的自动对齐，避免首次渲染的误触发
    const hasBeenExpanded = React.useRef(false);

    React.useEffect(() => {
        if (isExpanded) {
            hasBeenExpanded.current = true;
        } else if (hasBeenExpanded.current) {
            // 收起时，将卡片顶部平滑滚动回视野
            cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [isExpanded]);

    const statusConfig = {
        'todo': { color: 'text-slate-500 bg-slate-100 border-slate-200', icon: <Clock size={14} />, label: '待读' },
        'reading': { color: 'text-amber-700 bg-amber-50 border-amber-200/50', icon: <Book size={14} />, label: '读中' },
        'read': { color: 'text-emerald-700 bg-emerald-50 border-emerald-200/50', icon: <CheckCircle2 size={14} />, label: '已读' }
    };
    const currentStatus = statusConfig[paper.status || 'todo'];
    const hasContent = (c) => c && c.length > 5;

    const handleToggle = (e) => {
        if (isExpanded) {
            setIsCollapsing(true);
        } else {
            setIsCollapsing(false);
        }
        onToggle(e);
    };

    const handleMouseLeave = () => {
        if (isCollapsing) {
            setIsCollapsing(false);
        }
    };

    return (
        <div
            ref={cardRef}
            id={`paper-card-${paper.id}`}
            onMouseLeave={handleMouseLeave}
            style={{
                boxShadow: isExpanded
                    ? '8px 14px 24px -6px rgba(0, 0, 0, 0.25), 0 4px 8px -4px rgba(0, 0, 0, 0.10)'
                    : undefined
            }}
            className={`
            bg-white dark:bg-slate-900 rounded-xl border relative
            scroll-mt-24
            transition-all duration-500 ease-out
            ${isExpanded
                    ? 'border-blue-500/40 ring-1 ring-blue-500/10 z-10 dark:border-blue-900/50'
                    : isCollapsing
                        ? 'border-slate-200 dark:border-slate-800/80 shadow-sm z-0'
                        : 'border-slate-200 shadow-sm hover:border-blue-500 hover:ring-1 hover:ring-blue-500 hover:shadow-md z-0 dark:border-slate-800/80 dark:hover:border-blue-500/50'
                }
        `}
        >
            {paper.isStarred && paper.starNote && (
                <div className="bg-rose-50/60 border-b border-rose-100 px-6 py-2.5 flex items-center gap-2 text-[13px] font-medium text-rose-800 rounded-t-xl">
                    <Heart size={14} className="fill-rose-500 text-rose-500" /> <span className="font-bold">备注:</span> {paper.starNote}
                </div>
            )}

            <div className="p-6 cursor-pointer flex items-start gap-5 group" onClick={handleToggle}>
                <div className={`mt-1.5 w-7 h-7 flex items-center justify-center rounded-full transition-all duration-500 ease-out ${isExpanded ? 'bg-blue-100 text-blue-600 rotate-90' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}>
                    <ChevronRight size={16} strokeWidth={2.5} />
                </div>

                <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-start justify-between gap-6">
                        <h3 className={`text-[17px] font-bold leading-relaxed tracking-tight truncate pr-2 transition-colors duration-500 ${isExpanded ? 'text-blue-700 dark:text-blue-400' : 'text-slate-800 dark:text-slate-200'}`}> {paper.title} </h3>
                        {!isExpanded && (
                            <div className="flex items-center gap-1.5 flex-shrink-0 mt-2 animate-in fade-in duration-500">
                                <StatusDot filled={hasContent(paper.problem)} color="bg-rose-400" />
                                <StatusDot filled={hasContent(paper.method)} color="bg-blue-400" />
                                <StatusDot filled={hasContent(paper.results)} color="bg-emerald-400" />
                                <StatusDot filled={hasContent(paper.thoughts)} color="bg-amber-400" />
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2.5 mt-3 flex-wrap">
                        <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-bold border ${currentStatus.color.replace('bg-slate-100', 'bg-slate-100 dark:bg-slate-800/60').replace('bg-amber-50', 'bg-amber-50 dark:bg-amber-900/20').replace('bg-emerald-50', 'bg-emerald-50 dark:bg-emerald-900/20')}`}> {currentStatus.icon} {currentStatus.label} </span>
                        <span className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-3 py-1 rounded-full text-[12px] font-semibold border border-slate-200 dark:border-slate-700"> {paper.venue || 'Source'} {paper.year} </span>

                        {paper.rating > 0 && (
                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] border border-amber-200/50 dark:border-amber-900/30 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 font-bold" title={`打分时间: ${paper.ratedDate ? paper.ratedDate.split('T')[0] : ''}`}>
                                <Star size={12} className="fill-amber-500 text-amber-500" />
                                <span>{paper.rating}</span>
                            </div>
                        )}

                        {Array.isArray(paper.tags) && paper.tags.length > 0 && (
                            <div className="flex items-center gap-1.5 ml-1 flex-wrap">
                                {paper.tags.map(tag => (
                                    <span key={tag} className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50/80 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/50 outline-none">
                                        <Hash size={10} strokeWidth={3} /> {tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className={`flex items-start justify-end gap-1 flex-shrink-0 mt-1 transition-all duration-500 ${isExpanded ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    {!isManageMode && (
                        <button onClick={(e) => { e.stopPropagation(); onStarClick(); }} className={`p-2 rounded-lg hover:bg-rose-50 transition-colors ${paper.isStarred ? 'text-rose-500' : 'text-slate-300 hover:text-rose-500'}`} title="收藏">
                            <Heart size={18} className={paper.isStarred ? "fill-rose-500" : ""} />
                        </button>
                    )}
                    {paper.link ? (
                        <a
                            href={paper.link}
                            target="_blank"
                            rel="noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="p-2 text-slate-300 hover:text-blue-500 rounded-lg hover:bg-blue-50 transition-colors"
                            title="打开链接"
                        >
                            <ExternalLink size={18} />
                        </a>
                    ) : (
                        <div className="p-2 text-slate-200 cursor-not-allowed" title="暂无链接">
                            <ExternalLink size={18} />
                        </div>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-2 text-slate-300 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"><Edit3 size={18} /></button>
                    {isManageMode && (
                        <>
                            <button onClick={(e) => { e.stopPropagation(); onMove(); }} className="p-2 text-blue-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 bg-blue-50/30"> <FolderInput size={18} /> </button>
                            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-2 text-rose-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 bg-rose-50/30 ml-1"> <Trash2 size={18} /> </button>
                        </>
                    )}
                </div>
            </div>

            {isExpanded && (
                <div className="px-6 pb-6 pt-2 animate-in slide-in-from-top-2 duration-500">
                    <div className="grid grid-cols-1 gap-4 pl-0 border-t border-slate-100/50 pt-4 mt-2">
                        <CompactSection icon={<Target size={16} />} title="论文概览" color="rose" content={paper.problem} />
                        <CompactSection icon={<Zap size={16} />} title="核心方法" color="blue" content={paper.method} />
                        <CompactSection icon={<Scale size={16} />} title="实验结果" color="emerald" content={paper.results} />
                        <CompactSection icon={<Lightbulb size={16} />} title="思考启发" color="amber" content={paper.thoughts} />
                    </div>
                </div>
            )}
        </div>
    );
});

const StatusDot = ({ filled, color }) => (<div className={`w-2.5 h-2.5 rounded-full ${filled ? color : 'bg-slate-200'}`} />);

// --- 组件: CompactSection (交互终极版 - 紧凑型回滚) ---
const CompactSection = ({ icon, title, color, content }) => {
    const [isOpen, setIsOpen] = useState(true);
    const sectionRef = useRef(null);
    const hasContent = content && content.trim().length > 5;
    const colors = {
        rose: { border: 'border-l-rose-400', icon: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/20' },
        blue: { border: 'border-l-blue-400', icon: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
        emerald: { border: 'border-l-emerald-400', icon: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
        amber: { border: 'border-l-amber-400', icon: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    };
    const theme = colors[color];
    const emptyStyle = 'bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 border-dashed opacity-70';
    const activeStyle = `bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 border-l-4 ${theme.border} shadow-sm`;

    // 收起子栏目时，将该栏目标题滚动回视野，避免内容消失后视图错位
    useEffect(() => {
        if (!isOpen && hasContent) {
            sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [isOpen, hasContent]);

    const handleDoubleClick = (e) => {
        if (hasContent) {
            e.stopPropagation();
            setIsOpen(prev => !prev);
        }
    };

    const handleLeftClick = (e) => {
        if (!hasContent) return;
        e.stopPropagation();
        setIsOpen(prev => !prev);
    };

    return (
        <div
            ref={sectionRef}
            className={`rounded-lg transition-all duration-300 overflow-hidden relative scroll-mt-20 ${hasContent ? activeStyle : emptyStyle}`}
            onDoubleClick={handleDoubleClick}
        >
            {hasContent && isOpen && (
                <div
                    className="absolute left-0 top-0 bottom-0 w-6 z-20 cursor-pointer hover:bg-black/5 transition-colors"
                    title="单击收起"
                    onClick={handleLeftClick}
                />
            )}

            <div className="flex items-center gap-3 px-5 py-3 select-none relative z-10">
                <div
                    className={`p-1.5 rounded-md transition-transform 
                  ${hasContent
                            ? 'cursor-pointer hover:brightness-95 active:scale-95'
                            : 'bg-slate-200 cursor-not-allowed'
                        }
                  ${hasContent ? theme.bg : ''}
              `}
                    onClick={handleLeftClick}
                >
                    {React.cloneElement(icon, { size: 16, className: hasContent ? theme.icon : 'text-slate-400' })}
                </div>

                <span className={`font-bold text-[15px] tracking-tight flex-1 py-1 ${hasContent ? 'text-slate-800 dark:text-slate-100 cursor-default' : 'text-slate-400 dark:text-slate-500'}`}>
                    {title}
                </span>

                {hasContent && (
                    <div className={`transition-transform duration-200 ${isOpen ? 'rotate-0' : '-rotate-90'} text-slate-300 dark:text-slate-500 pointer-events-none`}>
                        <ChevronDown size={16} />
                    </div>
                )}
            </div>

            {hasContent && isOpen && (
                <div className="px-5 pb-5 pt-1 pl-[3.8rem] animate-in fade-in duration-300 relative z-10">
                    <Suspense fallback={<div className="text-xs text-slate-400 flex items-center gap-1"><Loader2 className="animate-spin" size={10} /> Loading...</div>}>
                        <MarkdownView content={content} />
                    </Suspense>
                </div>
            )}
        </div>
    );
};

// --- 组件: ExpertPaperModal (编辑/新增弹窗) ---
const ExpertPaperModal = ({ paper, onClose, onSave }) => {
    const defaultState = { title: '', venue: '', year: new Date().getFullYear().toString(), link: '', problem: '', method: '', results: '', thoughts: '', status: 'todo', starNote: '', isStarred: false, rating: 0, ratedDate: null, tags: [] };
    const [d, setD] = useState({ ...defaultState, ...(paper || {}) });
    const initialData = useRef(JSON.stringify({ ...defaultState, ...(paper || {}) }));
    const hasChanges = () => JSON.stringify(d) !== initialData.current;
    const [tagInput, setTagInput] = useState('');

    const handleSafeClose = () => { 
        if (hasChanges()) { 
            toast((t) => (
                <div className="flex flex-col gap-3">
                    <p className="font-bold text-red-600">放弃未保存的修改？</p>
                    <p className="text-sm text-slate-600">当前有未保存的内容，确定要放弃并关闭吗？</p>
                    <div className="flex gap-2 justify-end mt-2">
                        <button onClick={() => toast.dismiss(t.id)} className="px-3 py-1.5 bg-slate-100 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-200">继续编辑</button>
                        <button onClick={() => { toast.dismiss(t.id); onClose(); }} className="px-3 py-1.5 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700">放弃修改</button>
                    </div>
                </div>
            ), { duration: Infinity, id: 'close-confirm' });
        } else {
            onClose(); 
            toast.dismiss('close-confirm');
        }
    };
    const handleRating = (score) => { const newRating = d.rating === score ? 0 : score; setD({ ...d, rating: newRating, ratedDate: newRating > 0 ? new Date().toISOString() : null }); };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <div className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
                <div className="px-10 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900/50 shrink-0">
                    <div className="flex items-center gap-6">
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2"><FileText size={24} className="text-blue-600 dark:text-blue-400" /> {paper ? '编辑笔记' : '录入新文献'}</h2>
                        <button onClick={() => setD({ ...d, isStarred: !d.isStarred })} className={`p-2 rounded-full transition-colors ${d.isStarred ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`} title="切换收藏"> <Heart size={20} fill={d.isStarred ? "currentColor" : "none"} /> </button>
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                            {['todo', 'reading', 'read'].map(s => (
                                <button key={s} onClick={() => setD({ ...d, status: s })} className={`px-5 py-2 rounded-md text-xs font-bold uppercase transition-all ${d.status === s ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}>{s}</button>
                            ))}
                        </div>
                    </div>
                    <button onClick={handleSafeClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X size={26} className="text-slate-400 dark:text-slate-500" /></button>
                </div>
                <div className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-slate-900/50 p-10 custom-scrollbar">
                    <div className="max-w-4xl mx-auto space-y-8">
                        <div className="bg-white dark:bg-slate-800/60 p-8 rounded-xl border border-slate-200 dark:border-slate-700/50 shadow-sm space-y-6">
                            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-700/40 p-4 rounded-lg border border-slate-100 dark:border-slate-600/40 mb-2">
                                <div className="flex items-center gap-2"> <span className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">个人评分</span> {d.rating > 0 && d.ratedDate && <span className="text-xs font-medium text-slate-400 dark:text-slate-500"> • {new Date(d.ratedDate).toLocaleDateString()}</span>} </div>
                                <div className="flex items-center gap-1">
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                                        <button key={star} onClick={() => handleRating(star)} className={`p-1 transition-all hover:scale-110 ${star <= d.rating ? 'text-amber-400' : 'text-slate-200 dark:text-slate-700 hover:text-amber-200'}`}> <Star size={24} fill={star <= d.rating ? "currentColor" : "none"} /> </button>
                                    ))}
                                    <span className="ml-3 w-8 text-center font-bold text-2xl text-slate-700 dark:text-slate-200">{d.rating > 0 ? d.rating : '-'}</span>
                                </div>
                            </div>
                            
                            <div className="flex flex-col gap-2 relative">
                                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider ml-1 flex items-center gap-1"><Hash size={13} /> 文献标签</label>
                                <div className="flex flex-wrap items-center gap-2 p-3 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50 rounded-xl min-h-[50px] focus-within:ring-4 focus-within:ring-blue-500/10 focus-within:border-blue-500 transition-all">
                                    {(d.tags || []).map(tag => (
                                        <span key={tag} className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[13px] font-bold rounded-lg border border-blue-100 dark:border-blue-800/50 group">
                                            {tag}
                                            <button onClick={() => setD({...d, tags: d.tags.filter(t => t !== tag)})} className="text-blue-400 dark:text-blue-500 hover:text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded-full p-0.5 transition-colors" title="移除标签"><X size={14} /></button>
                                        </span>
                                    ))}
                                    <input 
                                        type="text" 
                                        value={tagInput}
                                        onChange={(e) => setTagInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                const newTag = tagInput.trim();
                                                if (newTag && !(d.tags || []).includes(newTag)) {
                                                    setD({...d, tags: [...(d.tags || []), newTag]});
                                                    setTagInput('');
                                                }
                                            }
                                        }}
                                        placeholder="输入新标签并按回车..." 
                                        className="flex-1 bg-transparent min-w-[140px] outline-none text-[15px] font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-550 ml-1"
                                    />
                                </div>
                            </div>

                            {d.isStarred && (
                                <div className="animate-in slide-in-from-top-2 mb-2">
                                    <label className="text-xs font-bold text-rose-500 mb-1 block flex items-center gap-1"><Heart size={12} className="fill-current" /> 收藏备注</label>
                                    <input type="text" className="w-full px-5 py-3 bg-rose-50 border border-rose-200 rounded-lg focus:ring-2 focus:ring-rose-500/20 outline-none text-[15px] text-rose-900 font-medium placeholder-rose-900/30 transition-all" placeholder="为什么收藏这篇论文..." value={d.starNote || ''} onChange={(e) => setD({ ...d, starNote: e.target.value })} />
                                </div>
                            )}
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider ml-1">标题</label>
                                <input autoFocus type="text" className="w-full px-5 py-4 bg-white dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600/50 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-bold text-slate-900 dark:text-slate-100 text-xl shadow-sm transition-all" placeholder="论文标题..." value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                <div className="space-y-1"> <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider ml-1">会议/来源</label> <input type="text" className="w-full px-5 py-3 bg-white dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600/50 rounded-lg outline-none text-[15px] dark:text-slate-200 focus:border-blue-500 transition-colors" placeholder="e.g. NeurIPS" value={d.venue} onChange={(e) => setD({ ...d, venue: e.target.value })} /> </div>
                                <div className="space-y-1"> <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider ml-1">年份</label> <input type="text" className="w-full px-5 py-3 bg-white dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600/50 rounded-lg outline-none text-[15px] dark:text-slate-200 focus:border-blue-500 transition-colors" placeholder="e.g. 2024" value={d.year} onChange={(e) => setD({ ...d, year: e.target.value })} /> </div>
                                <div className="space-y-1"> <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider ml-1">链接</label> <input type="text" placeholder="https://..." className="w-full px-5 py-3 bg-white dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600/50 rounded-lg outline-none text-[15px] focus:border-blue-500 transition-colors text-blue-600 dark:text-blue-400" value={d.link} onChange={(e) => setD({ ...d, link: e.target.value })} /> </div>
                            </div>
                        </div>
                        <div className="space-y-8">
                            <InputBlock label="论文概览 (Abstract)" icon={<Target size={18} />} color="rose" value={d.problem} onChange={v => setD({ ...d, problem: v })} placeholder="摘要与论文速递" />
                            <InputBlock label="核心方法 (Method)" icon={<Zap size={18} />} color="blue" value={d.method} onChange={v => setD({ ...d, method: v })} placeholder="主要方法与技术细节" />
                            <InputBlock label="实验结果 (Results)" icon={<Scale size={18} />} color="emerald" value={d.results} onChange={v => setD({ ...d, results: v })} placeholder="实验结果和优缺点" />
                            <InputBlock label="思考启发 (Thoughts)" icon={<Lightbulb size={18} />} color="amber" value={d.thoughts} onChange={v => setD({ ...d, thoughts: v })} placeholder="总结、局限性与未来展望" />
                        </div>
                        
                        <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 text-xs px-2">
                            <History size={14} /> <span>所有更改将在点击“保存笔记”后同步至本地数据库</span>
                        </div>
                    </div>
                </div>
                <div className="p-6 border-t border-slate-100 dark:border-slate-700/50 bg-white dark:bg-slate-900 flex justify-end gap-3 shrink-0 z-20">
                    <button onClick={handleSafeClose} className="px-6 py-2.5 rounded-lg text-[15px] font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">取消</button>
                    <button onClick={() => onSave(d)} className="px-8 py-2.5 bg-slate-900 dark:bg-blue-600 text-white rounded-lg text-[15px] font-bold hover:bg-black dark:hover:bg-blue-500 shadow-lg shadow-slate-200 flex items-center gap-2 transition-transform active:scale-95"><Save size={18} /> 保存笔记</button>
                </div>
            </div>
        </div>
    );
};

// --- 组件: InputBlock (输入框封装) ---
const InputBlock = ({ label, icon, color, value, onChange, placeholder }) => {
    const colors = { rose: 'text-rose-500 focus:border-rose-500 focus:ring-rose-500/10', blue: 'text-blue-500 focus:border-blue-500 focus:ring-blue-500/10', emerald: 'text-emerald-500 focus:border-emerald-500 focus:ring-emerald-500/10', amber: 'text-amber-500 focus:border-amber-500 focus:ring-amber-500/10' };
    return (
        <div>
            <label className={`flex items-center gap-2 text-sm font-bold mb-3 ${colors[color].split(' ')[0]}`}><span>{icon}</span> {label}</label>
            <textarea rows={6} placeholder={placeholder} className={`w-full px-5 py-4 bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/50 rounded-xl outline-none transition-all text-[15px] leading-relaxed text-slate-700 dark:text-slate-200 placeholder-slate-300 dark:placeholder-slate-500 shadow-sm focus:ring-4 font-mono ${colors[color]}`} value={value} onChange={(e) => onChange(e.target.value)} />
        </div>
    );
};

export default App;