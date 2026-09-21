import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePaperList, planPaperImport, recentPapers, getAddedTime, categoryPathLabel, buildImportPrompt, buildImportTemplate } from '../src/lib/paperImport.js';

test('parses UTF-8 BOM, JSON arrays and AI fenced output; rejects malformed or excessive lists', () => {
    assert.deepEqual(parsePaperList('\uFEFF{"papers":[{"title":"论文"}]}'), [{ title: '论文' }]);
    assert.deepEqual(parsePaperList('```json\n[{"title":"论文"}]\n```'), [{ title: '论文' }]);
    for (const source of ['no json', '{}', '[]', '{"papers":null}', JSON.stringify(Array(2001).fill({ title: 'paper' }))]) {
        assert.throws(() => parsePaperList(source));
    }
});

test('merges category paths without touching existing records; retry is idempotent', () => {
    const categories = [{ id: 'root', name: '方向', parentId: null }];
    const papers = [{ title: 'Existing Paper', link: 'https://arxiv.org/abs/2401.00001v1', thoughts: '珍贵笔记', rating: 9 }];
    const before = JSON.stringify({ papers, categories });
    const rows = [
        { title: 'Different title', link: 'https://arxiv.org/pdf/2401.00001v3.pdf', categoryPath: ['不要新建'] },
        { title: '新增甲', categoryPath: ['方向', '子方向'], tags: ['tag', 'tag', ' '] },
        { title: '新增乙', categoryPath: ['方向', '子方向'] },
        { title: '新增甲', categoryPath: ['不要新建'] },
    ];
    const plan = planPaperImport(rows, papers, categories, '', { allowNewCategories: true });
    assert.equal(plan.additions.length, 2);
    assert.equal(plan.newCategories.length, 1);
    assert.deepEqual(plan.results.map(r => r.status), ['duplicate', 'new', 'new', 'duplicate']);
    assert.equal(plan.newCategories[0].parentId, 'root');
    assert.deepEqual(plan.additions[0].tags, ['tag']);
    assert.equal(plan.additions[0].status, 'todo');
    assert.equal(categoryPathLabel(plan.additions[0].categoryId, [...categories, ...plan.newCategories]), '方向 / 子方向');
    assert.equal(JSON.stringify({ papers, categories }), before);
    const retry = planPaperImport(rows, [...papers, ...plan.additions], [...categories, ...plan.newCategories]);
    assert.equal(retry.additions.length, 0);
    assert.equal(retry.newCategories.length, 0);
});

test('detects normalized titles, DOI links, arXiv versions, URLs and within-file aliases', () => {
    const papers = [
        { title: 'Title: With Punctuation!' },
        { title: 'DOI Paper', link: 'https://doi.org/10.1234/ABC' },
        { title: 'URL Paper', link: 'https://example.com/paper?a=1&b=2' },
    ];
    const plan = planPaperImport([
        { title: ' title with punctuation ' },
        { title: 'New DOI title', doi: 'https://doi.org/10.1234/abc' },
        { title: 'Another version', link: 'https://doi.org/10.1234/abc' },
        { title: 'New URL title', link: 'http://example.com/paper/?utm_source=ai&b=2&a=1#section' },
        { title: 'Original title', link: 'https://arxiv.org/abs/hep-th/9901001v2' },
        { title: 'Revised title', link: 'https://arxiv.org/pdf/hep-th/9901001.pdf' },
    ], papers, [{ id: 'target', name: '默认', parentId: null }], 'target');
    assert.deepEqual(plan.results.map(r => r.status), ['duplicate', 'duplicate', 'duplicate', 'duplicate', 'new', 'duplicate']);
});

test('invalid items are isolated and cannot create folders or execute unsafe links', () => {
    const rows = [null, [], { title: ' ' }, { title: 'Unsafe', link: 'javascript:alert(1)', categoryPath: ['invalid'] },
        { title: 'Bad tags', tags: 'one,two' }, { title: 'Bad path', categoryPath: 'A/B' },
        { title: 'Bad year', year: {} }, { title: 'Bad note', method: {} }, { title: 'Bad doi', doi: 'abc' },
        { title: 'Good', doi: '10.1234/ABC', year: 2025, id: 'untrusted', createdAt: '1900-01-01', rating: 10, status: 'read' }];
    const plan = planPaperImport(rows, [], [{ id: 'target', name: '默认', parentId: null }], 'target');
    assert.equal(plan.results.filter(r => r.status === 'invalid').length, 9);
    assert.equal(plan.newCategories.length, 0);
    assert.equal(plan.additions[0].link, 'https://doi.org/10.1234/abc');
    assert.equal(plan.additions[0].year, '2025');
    assert.equal(plan.additions[0].createdAt, undefined);
    assert.equal(plan.additions[0].id, undefined);
    assert.equal(plan.additions[0].rating, 0);
    assert.equal(plan.additions[0].status, 'todo');
});

test('requires an explicitly selected default category for missing paths', () => {
    const categories = [{ id: 'target', name: '默认', parentId: null }];
    const plan = planPaperImport([{ title: 'A' }, { title: 'B' }], [], categories, 'target');
    assert.ok(plan.additions.every(p => p.categoryId === 'target'));
    assert.equal(plan.newCategories.length, 0);
    const missing = planPaperImport([{ title: 'A' }, { title: 'B' }], [], categories, 'missing');
    assert.equal(missing.newCategories.length, 0);
    assert.equal(missing.additions.length, 0);
    assert.ok(missing.results.every(r => r.status === 'invalid'));
    const emptyLibrary = planPaperImport([{ title: 'A' }], [], [], '', { allowNewCategories: true });
    assert.equal(emptyLibrary.additions.length, 0);
    assert.equal(emptyLibrary.newCategories.length, 0);
});

test('default policy rejects invented names, translated names and wrong branches without fallback', () => {
    const categories = [
        { id: 'root', name: '方向', parentId: null },
        { id: 'child', name: '子方向', parentId: 'root' },
        { id: 'other', name: '其他', parentId: null },
    ];
    const rows = [
        { title: '正确', categoryPath: ['方向', '子方向'] },
        { title: '编造', categoryPath: ['方向', '幻觉分类'], allowNewCategories: true },
        { title: '翻译', categoryPath: ['Direction', '子方向'] },
        { title: '错分支', categoryPath: ['其他', '子方向'] },
        { title: '缺层级', categoryPath: ['子方向'] },
    ];
    const before = JSON.stringify(categories);
    const plan = planPaperImport(rows, [], categories, 'other');
    assert.deepEqual(plan.results.map(r => r.status), ['new', 'invalid', 'invalid', 'invalid', 'invalid']);
    assert.equal(plan.additions[0].categoryId, 'child');
    assert.equal(plan.newCategories.length, 0);
    assert.match(plan.results[1].detail, /幻觉分类/);
    assert.equal(JSON.stringify(categories), before);
});

test('ambiguous sibling names are rejected even when creation is enabled; explicit default ID resolves them', () => {
    const categories = [{ id: 'a', name: '同名', parentId: null }, { id: 'b', name: '同名', parentId: null }];
    for (const allowNewCategories of [false, true]) {
        const plan = planPaperImport([{ title: 'A', categoryPath: ['同名', '新增'] }], [], categories, '', { allowNewCategories });
        assert.equal(plan.additions.length, 0);
        assert.equal(plan.newCategories.length, 0);
        assert.match(plan.results[0].detail, /歧义/);
    }
    assert.equal(planPaperImport([{ title: 'A' }], [], categories, 'b').additions[0].categoryId, 'b');
});

test('new folders need an explicit opt-in on every plan; stale directory paths are revalidated', () => {
    const rows = [{ title: 'A', categoryPath: ['新目录', '子目录'] }];
    assert.equal(planPaperImport(rows, [], []).additions.length, 0);
    assert.equal(planPaperImport(rows, [], [], '', { allowNewCategories: 'true' }).additions.length, 0);
    const allowed = planPaperImport(rows, [], [], '', { allowNewCategories: true });
    assert.equal(allowed.newCategories.length, 2);
    assert.equal(planPaperImport(rows, [], allowed.newCategories).additions.length, 1);
    assert.equal(planPaperImport(rows, [], allowed.newCategories.filter(c => c.parentId === null)).additions.length, 0);
});

test('prompt includes exact current paths and descriptions; template never invents a sample folder', () => {
    const categories = [
        { id: 'a', name: 'A/B', parentId: null, description: '目录用途' },
        { id: 'b', name: '中文 "子目录"', parentId: 'a' },
    ];
    const template = buildImportTemplate(categories, 'b');
    assert.deepEqual(template.papers[0].categoryPath, ['A/B', '中文 "子目录"']);
    assert.equal(planPaperImport(template.papers, [], categories).additions.length, 1);
    const prompt = buildImportPrompt(categories, 'b');
    assert.ok(prompt.includes(JSON.stringify(template, null, 2)));
    assert.match(prompt, /目录用途/);
    assert.match(prompt, /不得自行创建/);
    assert.deepEqual(Object.keys(template.papers[0]).sort(), ['title', 'year', 'venue', 'link', 'doi', 'categoryPath', 'tags'].sort());
    assert.doesNotMatch(prompt, /\b(problem|method|results|thoughts)\b/);
    assert.ok(!prompt.includes('Self-Attention 机制'));
    assert.deepEqual(buildImportTemplate([]).papers[0].categoryPath, []);
});

test('recent additions include manual and imported papers across categories and omit unknown history', () => {
    const now = Date.parse('2026-09-18T12:00:00Z');
    const papers = [
        { id: 'legacy', ratedDate: '2026-09-18T12:00:00Z' },
        { id: 'invalid', createdAt: 'not a date' },
        { id: 'import', categoryId: 'a', createdAt: '2026-09-17T12:00:00Z', addedVia: 'import' },
        { id: 'manual', categoryId: 'b', createdAt: '2026-09-18T12:00:00Z', addedVia: 'manual' },
        { id: 'boundary', createdAt: '2026-09-11T12:00:00Z' },
        { id: 'older', createdAt: '2026-08-01T12:00:00Z' },
    ];
    assert.equal(getAddedTime(papers[0]), null);
    assert.deepEqual(recentPapers(papers, '7', now).map(p => p.id), ['manual', 'import', 'boundary']);
    assert.equal(recentPapers(papers, 'all', now).length, 4);
    assert.equal(papers[0].id, 'legacy');
});

test('import keeps original and DOI links without adding links to preview rows', () => {
    const categories = [{ id: 'a', name: '方向', parentId: null }];
    const plan = planPaperImport([
        { title: '原文', link: 'https://arxiv.org/abs/1706.03762' },
        { title: 'DOI', doi: '10.1234/Example' },
        { title: '重复', link: 'https://arxiv.org/pdf/1706.03762' },
        { title: '目录错误', link: 'https://example.org/paper', categoryPath: ['不存在'] },
        { title: '危险链接', link: 'javascript:alert(1)' },
        { title: '空链接' },
    ], [], categories, 'a');
    assert.equal(plan.additions[0].link, 'https://arxiv.org/abs/1706.03762');
    assert.equal(plan.additions[1].link, 'https://doi.org/10.1234/example');
    assert.equal(plan.results[2].status, 'duplicate');
    assert.equal(plan.results[3].status, 'invalid');
    assert.equal(plan.results[4].status, 'invalid');
    assert.equal(plan.additions[2].link, '');
    assert.ok(plan.results.every(row => !Object.hasOwn(row, 'link')));
});
