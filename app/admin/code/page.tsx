"use client";

import React, { useEffect, useState, useMemo } from "react";
import { CommonCode, DEFAULT_CATEGORY_MAP } from "@/lib/codeTypes";
import { fetchCommonCodes, saveCommonCode, deleteCommonCode } from "@/lib/codeUtils";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Database,
    Plus,
    RefreshCw,
    Trash2,
    Edit3,
    Check,
    X,
    Layers,
    Tag,
    AlertCircle,
    CheckCircle2,
    XCircle,
    ArrowUpDown,
} from "lucide-react";

export default function AdminCodePage() {
    const [codes, setCodes] = useState<CommonCode[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [selectedCategory, setSelectedCategory] = useState<string>("ROOM");

    // Dialog state for Code
    const [isCodeDialogOpen, setIsCodeDialogOpen] = useState<boolean>(false);
    const [editingCode, setEditingCode] = useState<CommonCode | null>(null);

    // Form inputs
    const [formCategory, setFormCategory] = useState<string>("ROOM");
    const [formCodeValue, setFormCodeValue] = useState<string>("");
    const [formCodeName, setFormCodeName] = useState<string>("");
    const [formSortOrder, setFormSortOrder] = useState<number>(1);
    const [formIsUse, setFormIsUse] = useState<boolean>(true);
    const [formDescription, setFormDescription] = useState<string>("");
    const [formError, setFormError] = useState<string | null>(null);

    // Category add dialog
    const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState<boolean>(false);
    const [newCategoryKey, setNewCategoryKey] = useState<string>("");

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await fetchCommonCodes("ALL");
            setCodes(data);
        } catch (err) {
            console.error("Failed to load common codes:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Unique Categories List
    const categoryList = useMemo(() => {
        const catSet = new Set(codes.map((c) => c.category));
        // Always include ROOM and GRADE
        catSet.add("ROOM");
        catSet.add("GRADE");
        return Array.from(catSet);
    }, [codes]);

    // Codes filtered by selected category
    const filteredCodes = useMemo(() => {
        return codes
            .filter((c) => c.category === selectedCategory)
            .sort((a, b) => a.sortOrder - b.sortOrder);
    }, [codes, selectedCategory]);

    // Open Code Create Modal
    const handleOpenCreateCode = () => {
        setEditingCode(null);
        setFormCategory(selectedCategory);
        setFormCodeValue("");
        setFormCodeName("");

        const currentMaxSort = filteredCodes.reduce((max, c) => (c.sortOrder > max ? c.sortOrder : max), 0);
        setFormSortOrder(currentMaxSort + 1);
        setFormIsUse(true);
        setFormDescription("");
        setFormError(null);
        setIsCodeDialogOpen(true);
    };

    // Open Code Edit Modal
    const handleOpenEditCode = (codeItem: CommonCode) => {
        setEditingCode(codeItem);
        setFormCategory(codeItem.category);
        setFormCodeValue(codeItem.codeValue);
        setFormCodeName(codeItem.codeName);
        setFormSortOrder(codeItem.sortOrder);
        setFormIsUse(codeItem.isUse);
        setFormDescription(codeItem.description || "");
        setFormError(null);
        setIsCodeDialogOpen(true);
    };

    // Save Code
    const handleSaveCode = async () => {
        if (!formCodeValue.trim()) {
            setFormError("코드 식별값(codeValue)을 입력해 주세요.");
            return;
        }
        if (!formCodeName.trim()) {
            setFormError("코드 표시명(codeName)을 입력해 주세요.");
            return;
        }

        const newCode: CommonCode = {
            id: editingCode ? editingCode.id : `code-${Date.now()}`,
            category: formCategory.toUpperCase().trim(),
            codeValue: formCodeValue.trim(),
            codeName: formCodeName.trim(),
            sortOrder: Number(formSortOrder) || 1,
            isUse: formIsUse,
            description: formDescription.trim(),
            createdAt: editingCode?.createdAt || new Date().toISOString(),
        };

        try {
            const updated = await saveCommonCode(newCode);
            setCodes(updated);
            setIsCodeDialogOpen(false);
        } catch (err) {
            console.error("Failed to save code:", err);
            setFormError("코드 저장에 실패했습니다.");
        }
    };

    // Toggle IsUse status directly
    const handleToggleIsUse = async (codeItem: CommonCode) => {
        const updatedCode = { ...codeItem, isUse: !codeItem.isUse };
        try {
            const updated = await saveCommonCode(updatedCode);
            setCodes(updated);
        } catch (err) {
            console.error("Failed to toggle status:", err);
        }
    };

    // Delete Code
    const handleDeleteCode = async (id: string, name: string) => {
        if (!confirm(`'${name}' 코드를 삭제하시겠습니까?`)) return;
        try {
            const updated = await deleteCommonCode(id);
            setCodes(updated);
        } catch (err) {
            console.error("Failed to delete code:", err);
        }
    };

    // Create New Category
    const handleCreateCategory = () => {
        if (!newCategoryKey.trim()) return;
        const catKey = newCategoryKey.toUpperCase().trim();
        setSelectedCategory(catKey);
        setNewCategoryKey("");
        setIsCategoryDialogOpen(false);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Database className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
                        공통코드 관리
                    </h1>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                        학원 시간표, 강의실, 학년 등 시스템 전반에서 사용되는 분류 코드를 관리합니다.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="gap-2">
                        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                        새로고침
                    </Button>
                    <Button size="sm" onClick={handleOpenCreateCode} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
                        <Plus className="w-4 h-4" />
                        코드 추가
                    </Button>
                </div>
            </div>

            {/* Main Content Layout: Left Sidebar Categories + Right Main Code Table */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Left Column: Category Group Navigation */}
                <Card className="shadow-sm border border-zinc-200 dark:border-zinc-800 lg:col-span-1">
                    <CardHeader className="pb-3 border-b border-zinc-200 dark:border-zinc-800">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <Layers className="w-4 h-4 text-indigo-500" />
                                코드 그룹 카테고리
                            </CardTitle>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsCategoryDialogOpen(true)}
                                className="h-7 w-7 p-0 text-zinc-500 hover:text-zinc-900"
                                title="새 그룹 추가"
                            >
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-2 space-y-1">
                        {categoryList.map((cat) => {
                            const info = DEFAULT_CATEGORY_MAP[cat] || { name: cat, description: `${cat} 분류 코드` };
                            const catCodeCount = codes.filter((c) => c.category === cat).length;
                            const isSelected = selectedCategory === cat;

                            return (
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`w-full text-left px-3 py-2.5 rounded-md transition-all flex items-center justify-between ${
                                        isSelected
                                            ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800"
                                            : "hover:bg-zinc-100 dark:hover:bg-zinc-850 text-zinc-700 dark:text-zinc-300"
                                    }`}
                                >
                                    <div>
                                        <div className="text-xs font-semibold">{info.name}</div>
                                        <div className="text-[10px] text-zinc-400 font-mono tracking-tight">{cat}</div>
                                    </div>
                                    <Badge variant={isSelected ? "default" : "secondary"} className="text-[10px] h-5 px-1.5">
                                        {catCodeCount}개
                                    </Badge>
                                </button>
                            );
                        })}
                    </CardContent>
                </Card>

                {/* Right Column: Code List Table */}
                <Card className="shadow-sm border border-zinc-200 dark:border-zinc-800 lg:col-span-3">
                    <CardHeader className="pb-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                <Tag className="w-4 h-4 text-indigo-500" />
                                {DEFAULT_CATEGORY_MAP[selectedCategory]?.name || selectedCategory} 목록
                            </CardTitle>
                            <CardDescription className="text-xs mt-0.5">
                                {DEFAULT_CATEGORY_MAP[selectedCategory]?.description || `${selectedCategory} 카테고리에 속한 세부 코드입니다.`}
                            </CardDescription>
                        </div>
                        <Button size="sm" onClick={handleOpenCreateCode} className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8">
                            <Plus className="w-3.5 h-3.5" />
                            코드 추가
                        </Button>
                    </CardHeader>

                    <CardContent className="p-0">
                        {filteredCodes.length === 0 ? (
                            <div className="p-12 text-center text-zinc-500 text-sm">
                                등록된 코드가 없습니다. 오른쪽 상단의 [+ 코드 추가] 버튼을 눌러 새 코드를 등록하세요.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 text-zinc-500 font-semibold">
                                            <th className="py-3 px-4 w-16 text-center">순서</th>
                                            <th className="py-3 px-4">코드 값 (codeValue)</th>
                                            <th className="py-3 px-4">코드 명 (codeName)</th>
                                            <th className="py-3 px-4">상세 설명</th>
                                            <th className="py-3 px-4 w-24 text-center">사용 상태</th>
                                            <th className="py-3 px-4 w-24 text-right">관리</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                        {filteredCodes.map((codeItem) => (
                                            <tr key={codeItem.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-900/30 transition-colors">
                                                <td className="py-3 px-4 text-center font-bold text-zinc-500">
                                                    {codeItem.sortOrder}
                                                </td>
                                                <td className="py-3 px-4 font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                                                    {codeItem.codeValue}
                                                </td>
                                                <td className="py-3 px-4 font-medium text-zinc-900 dark:text-zinc-100">
                                                    {codeItem.codeName}
                                                </td>
                                                <td className="py-3 px-4 text-zinc-500 dark:text-zinc-400">
                                                    {codeItem.description || "-"}
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleIsUse(codeItem)}
                                                        className="inline-flex items-center gap-1 cursor-pointer"
                                                        title="클릭 시 상태 전환"
                                                    >
                                                        {codeItem.isUse ? (
                                                            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/25 border-emerald-500/30 gap-1 text-[10px]">
                                                                <CheckCircle2 className="w-3 h-3" /> 사용중
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="text-zinc-400 border-zinc-300 gap-1 text-[10px]">
                                                                <XCircle className="w-3 h-3" /> 미사용
                                                            </Badge>
                                                        )}
                                                    </button>
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleOpenEditCode(codeItem)}
                                                            className="h-7 w-7 p-0 text-zinc-500 hover:text-indigo-600"
                                                            title="수정"
                                                        >
                                                            <Edit3 className="w-3.5 h-3.5" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleDeleteCode(codeItem.id, codeItem.codeName)}
                                                            className="h-7 w-7 p-0 text-zinc-500 hover:text-red-600"
                                                            title="삭제"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Code Add / Edit Modal */}
            <Dialog open={isCodeDialogOpen} onOpenChange={setIsCodeDialogOpen}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 font-bold text-lg">
                            <Tag className="w-5 h-5 text-indigo-600" />
                            {editingCode ? "공통코드 수정" : "새 공통코드 추가"}
                        </DialogTitle>
                        <DialogDescription>
                            그룹 [{formCategory}]에 등록될 공통코드 항목을 작성하세요.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {formError && (
                            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                {formError}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="category" className="text-xs font-semibold">
                                    카테고리 그룹
                                </Label>
                                <Input id="category" value={formCategory} onChange={(e) => setFormCategory(e.target.value.toUpperCase())} className="h-9 text-sm uppercase" />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="sortOrder" className="text-xs font-semibold">
                                    정렬 순서 (숫자)
                                </Label>
                                <Input id="sortOrder" type="number" value={formSortOrder} onChange={(e) => setFormSortOrder(Number(e.target.value))} className="h-9 text-sm" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="codeValue" className="text-xs font-semibold">
                                    코드 값 (codeValue) <span className="text-red-500">*</span>
                                </Label>
                                <Input id="codeValue" value={formCodeValue} onChange={(e) => setFormCodeValue(e.target.value)} placeholder="예: 101, H1" className="h-9 text-sm font-mono" />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="codeName" className="text-xs font-semibold">
                                    코드 명 (codeName) <span className="text-red-500">*</span>
                                </Label>
                                <Input id="codeName" value={formCodeName} onChange={(e) => setFormCodeName(e.target.value)} placeholder="예: 101호, 고1" className="h-9 text-sm" />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="description" className="text-xs font-semibold">
                                설명 및 비고
                            </Label>
                            <Textarea id="description" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="코드 세부 설명 작성" className="text-sm min-h-[60px] resize-none" />
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                            <input type="checkbox" id="isUse" checked={formIsUse} onChange={(e) => setFormIsUse(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded cursor-pointer" />
                            <Label htmlFor="isUse" className="text-xs font-semibold cursor-pointer">
                                이 코드를 활성화하여 시스템에서 사용합니다 (is_use)
                            </Label>
                        </div>
                    </div>

                    <DialogFooter className="pt-2 border-t flex items-center justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setIsCodeDialogOpen(false)}>
                            취소
                        </Button>
                        <Button size="sm" onClick={handleSaveCode} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                            저장하기
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Category Add Modal */}
            <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                <DialogContent className="sm:max-w-[360px]">
                    <DialogHeader>
                        <DialogTitle className="font-bold text-base">새 코드 그룹 추가</DialogTitle>
                        <DialogDescription className="text-xs">
                            추가할 영문 코드 그룹 키(예: SUBJECT, STATUS 등)를 입력하세요.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-2 space-y-2">
                        <Label htmlFor="newCategoryKey" className="text-xs font-semibold">
                            카테고리 영문 키
                        </Label>
                        <Input
                            id="newCategoryKey"
                            value={newCategoryKey}
                            onChange={(e) => setNewCategoryKey(e.target.value.toUpperCase())}
                            placeholder="예: SUBJECT"
                            className="h-9 text-sm uppercase"
                        />
                    </div>

                    <DialogFooter className="pt-2 border-t">
                        <Button variant="outline" size="sm" onClick={() => setIsCategoryDialogOpen(false)}>
                            취소
                        </Button>
                        <Button size="sm" onClick={handleCreateCategory} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                            그룹 생성
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
