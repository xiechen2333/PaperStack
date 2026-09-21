import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Upload, X, Copy, Folder, FolderPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { buildImportPrompt, buildImportTemplate, categoryPathLabel, parsePaperList, planPaperImport } from '../lib/paperImport';

const control = 'rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm';

export default function PaperImportModal({ papers, categories, defaultCategoryId, onClose, onMerge }) {
    const dialog = useRef(null);
    const fileVersion = useRef(0);
    const [text, setText] = useState('');
    const [filename, setFilename] = useState('');
    const [fallbackId, setFallbackId] = useState(defaultCategoryId || '');
    const [reading, setReading] = useState(false);
    const [fileError, setFileError] = useState('');
    const [limit, setLimit] = useState(100);
    const [showPrompt, setShowPrompt] = useState(false);
    const [allowNewCategories, setAllowNewCategories] = useState(false);
    const prompt = useMemo(() => buildImportPrompt(categories, fallbackId), [categories, fallbackId]);
    useEffect(() => { dialog.current.showModal(); }, []);
    const preview = useMemo(() => {
        if (!text.trim()) return null;
        try { return planPaperImport(parsePaperList(text), papers, categories, fallbackId, { allowNewCategories }); }
        catch (error) { return { error: error.message }; }
    }, [text, papers, categories, fallbackId, allowNewCategories]);
    const invalid = preview?.results?.filter(r => r.status === 'invalid').length || 0;
    const duplicates = preview?.results?.filter(r => r.status === 'duplicate').length || 0;

    const readFile = async (event) => {
        const file = event.target.files[0];
        event.target.value = '';
        if (!file) return;
        const version = ++fileVersion.current;
        setText('');
        setFilename('');
        setFileError('');
        if (file.size > 5 * 1024 * 1024) { setReading(false); setFileError('清单不能超过 5MB，请拆分后上传。'); return; }
        setReading(true);
        try {
            const content = await file.text();
            if (version !== fileVersion.current) return;
            setText(content);
            setFilename(file.name);
            setLimit(100);
        } catch { if (version === fileVersion.current) setFileError('文件读取失败，请重新选择。'); }
        finally { if (version === fileVersion.current) setReading(false); }
    };

    const downloadTemplate = () => {
        const url = URL.createObjectURL(new Blob([JSON.stringify(buildImportTemplate(categories, fallbackId), null, 2)], { type: 'application/json;charset=utf-8' }));
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'paperstack_import_template.json';
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    return (
        <dialog ref={dialog} onCancel={onClose} aria-labelledby="import-title" className="m-auto w-[calc(100%-2rem)] max-w-4xl max-h-[90vh] rounded-2xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-2xl p-0 backdrop:bg-slate-950/50">
            <div className="flex flex-col max-h-[90vh]">
                <header className="flex items-start justify-between gap-4 p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800">
                    <div>
                        <h2 id="import-title" className="text-xl font-bold">批量导入文献</h2>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">上传 AI 整理的清单，预览后合并到知识库。重复项会跳过，保留已有笔记。</p>
                    </div>
                    <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="关闭批量导入"><X size={20} /></button>
                </header>
                <div className="overflow-y-auto p-5 sm:p-6 space-y-5">
                    <div className="rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 p-4">
                        <p className="font-semibold text-sm">1. 让 AI 按模板整理文献</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">提示词包含当前完整目录和分类说明，要求 AI 原样使用已有路径。导入时逐级核对名称和父子关系，默认禁止新建文件夹。无法判断分类的文献需由你指定默认分类。</p>
                        <div className="flex flex-wrap gap-2 mt-3">
                            <button type="button" className={`${control} flex items-center gap-2`} onClick={downloadTemplate}><Download size={15} />下载 JSON 模板</button>
                            <button type="button" className={`${control} flex items-center gap-2`} onClick={async () => {
                                try { await navigator.clipboard.writeText(prompt); toast.success('AI 提示词已复制，请填写研究方向'); }
                                catch { setShowPrompt(true); toast.error('无法自动复制，请在下方选中提示词复制'); }
                            }}><Copy size={15} />复制 AI 提示词</button>
                            <button type="button" className="text-sm text-blue-600 dark:text-blue-400 px-2" onClick={() => setShowPrompt(!showPrompt)}>{showPrompt ? '收起格式说明' : '查看格式说明'}</button>
                        </div>
                        {showPrompt && <textarea aria-label="AI 文献清单提示词" readOnly value={prompt} rows={10} className={`${control} w-full mt-3 font-mono`} />}
                    </div>
                    <section className="space-y-3">
                        <h3 className="font-semibold text-sm">2. 上传或粘贴清单</h3>
                        <div className="flex flex-wrap items-center gap-3">
                            <label className={`${control} cursor-pointer flex items-center gap-2 hover:border-blue-400`}><Upload size={16} />选择 JSON 文件<input aria-label="上传文献清单" type="file" accept=".json,application/json" className="sr-only" onChange={readFile} /></label>
                            <span className="text-xs text-slate-500 break-all">{reading ? '正在读取…' : filename || 'UTF-8 · 最大 5MB / 2000 篇'}</span>
                        </div>
                        {fileError && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{fileError}</p>}
                        <textarea aria-label="文献 JSON 清单" value={text} disabled={reading} onChange={e => { setText(e.target.value); setFilename(''); setFileError(''); setLimit(100); }} rows={6} placeholder={'{"papers": [{"title": "论文标题", "link": "https://doi.org/…", "categoryPath": []}]}'} className={`${control} w-full font-mono focus:outline-blue-500`} />
                    </section>
                    <section className="space-y-3 border-t border-slate-200 dark:border-slate-700 pt-5" aria-labelledby="import-rules-title">
                        <h3 id="import-rules-title" className="font-semibold text-sm">3. 设置分类规则</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="min-w-0 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-950/30 p-4 space-y-3">
                                <label htmlFor="import-default-category" className="flex items-center gap-2 font-semibold text-sm"><Folder size={18} className="text-blue-600 dark:text-blue-400 shrink-0" />未指定路径时加入</label>
                                <p id="import-default-help" className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">为没有分类路径的文献选择一个已有文件夹。路径拼错或不存在的条目仍会被拦截。</p>
                                <select id="import-default-category" aria-label="默认导入分类" aria-describedby="import-default-help" className={`${control} w-full min-w-0 focus:outline-blue-500`} value={fallbackId} onChange={e => setFallbackId(e.target.value)}>
                                    <option value="">请选择已有分类</option>
                                    {categories.map(c => <option key={c.id} value={c.id}>{categoryPathLabel(c.id, categories)}</option>)}
                                </select>
                                <p className="text-xs text-blue-700 dark:text-blue-300">未选择时，空路径条目不会导入。</p>
                            </div>
                            <div className={`min-w-0 rounded-xl border p-4 space-y-3 transition-colors ${allowNewCategories ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40'}`}>
                                <div className="flex items-center gap-2 font-semibold text-sm"><FolderPlus size={18} className="text-amber-600 dark:text-amber-400 shrink-0" />新文件夹策略<span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] whitespace-nowrap ${allowNewCategories ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>{allowNewCategories ? '本次已开启' : '默认关闭'}</span></div>
                                <p id="import-create-help" className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">默认只使用已有目录。确需扩充目录时，再允许按清单中的路径创建文件夹。</p>
                                <label className="flex items-start gap-2.5 text-sm font-medium cursor-pointer rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2.5"><input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-amber-600" aria-describedby="import-create-help" checked={allowNewCategories} onChange={e => setAllowNewCategories(e.target.checked)} /><span>允许新建文件夹<span className="block text-xs font-normal text-slate-500 dark:text-slate-400 mt-0.5">仅本次导入</span></span></label>
                                {allowNewCategories && <p className="text-xs text-amber-700 dark:text-amber-400">请先核对下方列出的待新建目录，再确认合并。</p>}
                            </div>
                        </div>
                    </section>
                    {preview?.error && <p role="alert" className="text-red-600 dark:text-red-400 text-sm">{preview.error}</p>}
                    {preview?.results && <section className="space-y-3" aria-label="导入预览">
                        <h3 className="font-semibold text-sm">4. 确认合并内容</h3>
                        <div className="flex flex-wrap gap-3 text-sm" aria-live="polite">
                            <span className="text-emerald-700 dark:text-emerald-400">新增 {preview.additions.length} 篇</span>
                            <span className="text-slate-500">重复 {duplicates} 篇</span>
                            <span className="text-red-600 dark:text-red-400">无效 {invalid} 项</span>
                            <span>新建 {preview.newCategories.length} 个文件夹</span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">按标题、DOI 或原文链接识别重复（含 arXiv 不同版本）。{invalid > 0 ? '无效项不会导入，可修正清单后重试，或仅合并有效新文献。' : '下方标为重复的条目不会修改知识库。'}</p>
                        {preview.newCategories.length > 0 && <p className="text-xs text-slate-500 break-words">将新建：{preview.newCategories.map(c => categoryPathLabel(c.id, [...categories, ...preview.newCategories])).join('；')}</p>}
                        <ol className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                            {preview.results.slice(0, limit).map(row => <li key={row.index} className="p-3 flex gap-3 text-sm">
                                <span className={`shrink-0 ${row.status === 'new' ? 'text-emerald-600 dark:text-emerald-400' : row.status === 'invalid' ? 'text-red-500' : 'text-slate-400'}`}>{row.status === 'new' ? '新增' : row.status === 'invalid' ? '无效' : '重复'}</span>
                                <div className="min-w-0 flex-1 break-words">
                                    <p>{row.index + 1}. {row.title}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{row.detail}</p>
                                </div>
                            </li>)}
                        </ol>
                        {preview.results.length > limit && <button type="button" onClick={() => setLimit(limit + 100)} className="text-sm text-blue-600">显示更多条目</button>}
                    </section>}
                </div>
                <footer className="p-4 sm:px-6 border-t border-slate-200 dark:border-slate-800 flex flex-wrap justify-end gap-3">
                    <button type="button" onClick={onClose} className={control}>取消</button>
                    <button type="button" disabled={reading || !preview?.additions?.length} onClick={() => onMerge(parsePaperList(text), fallbackId, filename || '粘贴清单', { allowNewCategories })} className="rounded-lg px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed">合并 {preview?.additions?.length || 0} 篇新文献{preview?.newCategories?.length > 0 ? `，新建 ${preview.newCategories.length} 个文件夹` : ''}</button>
                </footer>
            </div>
        </dialog>
    );
}
