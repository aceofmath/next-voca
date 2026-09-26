"use client";

import React, { useEffect, useState, useMemo } from "react";
import { CommonCode } from "@/lib/codeTypes";
import {
    fetchCommonCodes,
    saveCommonCode,
    deleteCommonCode,
} from "@/lib/codeUtils";
import { toast } from "sonner";

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
    Layers,
    Tag,
    AlertCircle,
    CheckCircle2,
    XCircle,
    FolderPlus,
    Loader2,
} from "lucide-react";

export default function AdminCodePage() {
    const [codes, setCodes] = useState<CommonCode[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [selectedGroupId, setSelectedGroupId] = useState<string>("");

    // Dialog state for Sub-Code
    const [isCodeDialogOpen, setIsCodeDialogOpen] = useState<boolean>(false);
    const [editingCode, setEditingCode] = useState<CommonCode | null>(null);

    // Form inputs for Sub-Code
    const [formCategory, setFormCategory] = useState<string>("");
    const [formSupCategory, setFormSupCategory] = useState<string | null>(null);
    const [formCodeValue, setFormCodeValue] = useState<string>("");
    const [formCodeName, setFormCodeName] = useState<string>("");
    const [formSortOrder, setFormSortOrder] = useState<number>(1);
    const [formIsUse, setFormIsUse] = useState<boolean>(true);
    const [formDescription, setFormDescription] = useState<string>("");
    const [formError, setFormError] = useState<string | null>(null);
    const [isSavingCode, setIsSavingCode] = useState<boolean>(false);

    // Group Code Add / Edit Dialog
    const [isGroupDialogOpen, setIsGroupDialogOpen] = useState<boolean>(false);
    const [editingGroup, setEditingGroup] = useState<CommonCode | null>(null);
    const [formGroupCategoryKey, setFormGroupCategoryKey] = useState<string>("");
    const [formGroupCodeName, setFormGroupCodeName] = useState<string>("");
    const [formGroupDescription, setFormGroupDescription] = useState<string>("");
    const [groupError, setGroupError] = useState<string | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await fetchCommonCodes("ALL");
            setCodes(data);

            // sup_category가 null 인 그룹코드만 추출
            const groups = data.filter((c) => c.supCategory === null || c.supCategory === undefined);
            if (groups.length > 0) {
                const currentSelectedGroup = groups.find((g) => g.id === selectedGroupId);
                if (!currentSelectedGroup) {
                    setSelectedGroupId(groups[0].id);
                }
            }
        } catch (err) {
            console.error("Failed to load common codes from DB:", err);
            toast.error("DB 공통코드 데이터를 불러오는데 실패했습니다.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // 1. DB code 테이블에서 sup_category가 null인 항목만 그룹 목록으로 추출
    const categoryGroups = useMemo(() => {
        return codes
            .filter((c) => c.supCategory === null || c.supCategory === undefined)
            .sort((a, b) => a.sortOrder - b.sortOrder);
    }, [codes]);

    // 현재 선택된 카테고리 그룹 객체
    const selectedGroup = useMemo(() => {
        return categoryGroups.find((g) => g.id === selectedGroupId) || categoryGroups[0] || null;
    }, [categoryGroups, selectedGroupId]);

    // 2. 선택된 카테고리 그룹 하위의 세부 코드 목록 (sup_category !== null)
    const filteredSubCodes = useMemo(() => {
        if (!selectedGroup) return [];
        return codes
            .filter(
                (c) =>
                    c.id !== selectedGroup.id &&
                    (c.supCategory === selectedGroup.id || c.category === selectedGroup.category) &&
                    (c.supCategory !== null && c.supCategory !== undefined)
            )
            .sort((a, b) => a.sortOrder - b.sortOrder);
    }, [codes, selectedGroup]);

    // Open Sub-Code Create Modal
    const handleOpenCreateCode = (targetGroup?: CommonCode) => {
        const group = targetGroup || selectedGroup;
        if (!group) {
            toast.error("선택된 그룹 코드가 없습니다. 그룹 코드를 먼저 생성하세요.");
            return;
        }

        setEditingCode(null);
        setFormCategory(group.category);
        setFormSupCategory(group.id); // sup_category에 부모 그룹의 id 설정
        setFormCodeValue("");
        setFormCodeName("");

        const currentSubCodes = codes.filter(
            (c) => c.id !== group.id && (c.supCategory === group.id || c.category === group.category)
        );
        const currentMaxSort = currentSubCodes.reduce((max, c) => (c.sortOrder > max ? c.sortOrder : max), 0);
        setFormSortOrder(currentMaxSort + 1);
        setFormIsUse(true);
        setFormDescription("");
        setFormError(null);
        setIsCodeDialogOpen(true);
    };

    // Open Sub-Code Edit Modal
    const handleOpenEditCode = (codeItem: CommonCode) => {
        setEditingCode(codeItem);
        setFormCategory(codeItem.category);
        setFormSupCategory(codeItem.supCategory || (selectedGroup ? selectedGroup.id : null));
        setFormCodeValue(codeItem.codeValue);
        setFormCodeName(codeItem.codeName);
        setFormSortOrder(codeItem.sortOrder);
        setFormIsUse(codeItem.isUse);
        setFormDescription(codeItem.description || "");
        setFormError(null);
        setIsCodeDialogOpen(true);
    };

    // Save Sub-Code
    const handleSaveCode = async () => {
        if (isSavingCode) return;
        setFormError(null);

        const catKey = formCategory.toUpperCase().trim();
        if (!catKey) {
            setFormError("그룹 식ified 키(category)가 없습니다.");
            return;
        }
        if (!formCodeValue.trim()) {
            setFormError("코드 식별값(code_value)을 입력해 주세요.");
            return;
        }
        if (!formCodeName.trim()) {
            setFormError("코드 표시명(code_name)을 입력해 주세요.");
            return;
        }

        const parentGroupId = formSupCategory || (selectedGroup ? selectedGroup.id : null);

        const newCode: CommonCode = {
            id: editingCode ? editingCode.id : "",
            category: catKey,
            codeValue: formCodeValue.trim(),
            codeName: formCodeName.trim(),
            supCategory: parentGroupId, // 부모 그룹 ID 전달
            sortOrder: Number(formSortOrder) || 1,
            isUse: formIsUse,
            description: formDescription.trim(),
            createdAt: editingCode?.createdAt || new Date().toISOString(),
        };

        setIsSavingCode(true);
        try {
            const updated = await saveCommonCode(newCode);
            setCodes(updated);
            setIsCodeDialogOpen(false);
            toast.success(editingCode ? "코드가 수정되었습니다." : "새 세부 코드가 추가되었습니다.");
        } catch (err: any) {
            console.error("Failed to save code:", err);
            const errMsg = err?.message || "코드 저장 중 오류가 발생했습니다.";
            setFormError(errMsg);
            toast.error(errMsg);
        } finally {
            setIsSavingCode(false);
        }
    };

    // Toggle IsUse status directly
    const handleToggleIsUse = async (codeItem: CommonCode) => {
        const updatedCode = { ...codeItem, isUse: !codeItem.isUse };
        try {
            const updated = await saveCommonCode(updatedCode);
            setCodes(updated);
            toast.success(`'${codeItem.codeName}' 상태가 변경되었습니다.`);
        } catch (err) {
            console.error("Failed to toggle status:", err);
            toast.error("상태 변경 실패");
        }
    };

    // Delete Sub-Code
    const handleDeleteCode = async (id: string, name: string) => {
        if (!confirm(`'${name}' 코드를 삭제하시겠습니까?`)) return;
        try {
            const updated = await deleteCommonCode(id);
            setCodes(updated);
            toast.success(`'${name}' 코드가 삭제되었습니다.`);
        } catch (err) {
            console.error("Failed to delete code:", err);
            toast.error("코드 삭제 실패");
        }
    };

    // Open Group Code Create Modal
    const handleOpenCreateGroup = () => {
        setEditingGroup(null);
        setFormGroupCategoryKey("");
        setFormGroupCodeName("");
        setFormGroupDescription("");
        setGroupError(null);
        setIsGroupDialogOpen(true);
    };

    // Open Group Code Edit Modal
    const handleOpenEditGroup = (groupItem: CommonCode, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingGroup(groupItem);
        setFormGroupCategoryKey(groupItem.category);
        setFormGroupCodeName(groupItem.codeName);
        setFormGroupDescription(groupItem.description || "");
        setGroupError(null);
        setIsGroupDialogOpen(true);
    };

    // Create / Update Group Code (sup_category: null 인 행을 DB code 테이블에 저장)
    const handleSaveGroup = async () => {
        setGroupError(null);
        const catKey = formGroupCategoryKey.toUpperCase().trim();
        if (!catKey) {
            setGroupError("영문 그룹 식별 키(category)를 입력해 주세요.");
            return;
        }
        if (!formGroupCodeName.trim()) {
            setGroupError("그룹 표시명(code_name)을 입력해 주세요.");
            return;
        }

        const newGroupRecord: CommonCode = {
            id: editingGroup ? editingGroup.id : "",
            category: catKey,
            codeValue: editingGroup ? editingGroup.codeValue : catKey,
            codeName: formGroupCodeName.trim(),
            supCategory: null, // 그룹 코드는 sup_category가 null!
            sortOrder: editingGroup ? editingGroup.sortOrder : 0,
            isUse: true,
            description: formGroupDescription.trim(),
            createdAt: editingGroup?.createdAt || new Date().toISOString(),
        };

        try {
            const updated = await saveCommonCode(newGroupRecord);
            setCodes(updated);

            const savedGroup = updated.find(
                (c) => (c.supCategory === null || c.supCategory === undefined) && c.category === catKey
            );

            if (savedGroup) {
                setSelectedGroupId(savedGroup.id);
            }

            setIsGroupDialogOpen(false);
            toast.success(
                editingGroup
                    ? "그룹 코드가 수정되었습니다."
                    : `새 그룹 코드 [${formGroupCodeName.trim()}]이(가) DB에 생성되었습니다.`
            );

            if (!editingGroup && savedGroup) {
                // 신규 생성 시 첫 하위 코드 입력을 위한 안내 및 모달 연결
                handleOpenCreateCode(savedGroup);
            }
        } catch (err: any) {
            console.error("Failed to save category group:", err);
            const errMsg = err?.message || "그룹 코드 저장 중 오류가 발생했습니다.";
            setGroupError(errMsg);
            toast.error(errMsg);
        }
    };

    // Delete Group Code
    const handleDeleteGroup = async (groupItem: CommonCode, e: React.MouseEvent) => {
        e.stopPropagation();
        const subCount = codes.filter(
            (c) => c.id !== groupItem.id && (c.supCategory === groupItem.id || c.category === groupItem.category)
        ).length;

        if (!confirm(`'${groupItem.codeName}' 그룹 코드를 삭제하시겠습니까?${subCount > 0 ? `\n(주의: 하위 세부코드 ${subCount}개도 함께 삭제됩니다)` : ""}`)) {
            return;
        }

        try {
            // 하위 세부 코드들도 삭제
            const subCodesToDelete = codes.filter(
                (c) => c.id !== groupItem.id && (c.supCategory === groupItem.id || c.category === groupItem.category)
            );
            for (const sub of subCodesToDelete) {
                await deleteCommonCode(sub.id);
            }

            const updated = await deleteCommonCode(groupItem.id);
            setCodes(updated);
            toast.success(`'${groupItem.codeName}' 그룹 코드 및 하위 세부코드가 삭제되었습니다.`);
        } catch (err) {
            console.error("Failed to delete group code:", err);
            toast.error("그룹 코드 삭제 실패");
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Database className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
                        공통코드 관리 (DB code 테이블 전용)
                    </h1>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                        하드코딩 없이 Supabase <code className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-xs">code</code> 테이블에서 <code className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-xs">sup_category IS NULL</code>인 그룹 코드 및 하위 세부 코드를 관리합니다.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="gap-2">
                        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                        새로고침
                    </Button>
                    <Button size="sm" onClick={handleOpenCreateGroup} variant="outline" className="gap-1.5 border-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300">
                        <FolderPlus className="w-4 h-4" />
                        그룹 코드 추가
                    </Button>
                    <Button size="sm" onClick={() => handleOpenCreateCode()} disabled={!selectedGroup} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
                        <Plus className="w-4 h-4" />
                        세부 코드 추가
                    </Button>
                </div>
            </div>

            {/* Main Content Layout: Left Sidebar Group Codes + Right Main Sub-Code Table */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Left Column: Category Group Navigation (sup_category IS NULL) */}
                <Card className="shadow-sm border border-zinc-200 dark:border-zinc-800 lg:col-span-1">
                    <CardHeader className="pb-3 border-b border-zinc-200 dark:border-zinc-800">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <Layers className="w-4 h-4 text-indigo-500" />
                                DB 그룹 코드 (sup_category = null)
                            </CardTitle>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleOpenCreateGroup}
                                className="h-7 w-7 p-0 text-zinc-500 hover:text-indigo-600"
                                title="새 그룹 코드 추가"
                            >
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-2 space-y-1">
                        {loading ? (
                            <div className="p-6 text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" /> DB 불러오는 중...
                            </div>
                        ) : categoryGroups.length === 0 ? (
                            <div className="p-6 text-center text-xs text-zinc-400 space-y-2">
                                <div>DB에 등록된 그룹 코드가 없습니다.</div>
                                <Button size="sm" variant="outline" onClick={handleOpenCreateGroup} className="text-xs">
                                    [+ 그룹 코드 추가]
                                </Button>
                            </div>
                        ) : (
                            categoryGroups.map((group) => {
                                const subCodeCount = codes.filter(
                                    (c) =>
                                        c.id !== group.id &&
                                        (c.supCategory === group.id || c.category === group.category) &&
                                        c.supCategory !== null
                                ).length;
                                const isSelected = selectedGroup?.id === group.id;

                                return (
                                    <div
                                        key={group.id}
                                        onClick={() => setSelectedGroupId(group.id)}
                                        className={`w-full text-left px-3 py-2.5 rounded-md transition-all flex items-center justify-between cursor-pointer group ${
                                            isSelected
                                                ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800"
                                                : "hover:bg-zinc-100 dark:hover:bg-zinc-850 text-zinc-700 dark:text-zinc-300"
                                        }`}
                                    >
                                        <div className="overflow-hidden mr-2">
                                            <div className="text-xs font-semibold truncate">{group.codeName}</div>
                                            <div className="text-[10px] text-zinc-400 font-mono tracking-tight truncate">
                                                {group.category} ({group.codeValue})
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <Badge variant={isSelected ? "default" : "secondary"} className="text-[10px] h-5 px-1.5">
                                                {subCodeCount}개
                                            </Badge>
                                            <button
                                                type="button"
                                                onClick={(e) => handleOpenEditGroup(group, e)}
                                                className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-indigo-600 transition-opacity"
                                                title="그룹 수정"
                                            >
                                                <Edit3 className="w-3 h-3" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => handleDeleteGroup(group, e)}
                                                className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-red-600 transition-opacity"
                                                title="그룹 삭제"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </CardContent>
                </Card>

                {/* Right Column: Sub-Code List Table */}
                <Card className="shadow-sm border border-zinc-200 dark:border-zinc-800 lg:col-span-3">
                    <CardHeader className="pb-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                <Tag className="w-4 h-4 text-indigo-500" />
                                {selectedGroup ? selectedGroup.codeName : "세부 코드"} 목록 ({selectedGroup?.category || "미선택"})
                            </CardTitle>
                            <CardDescription className="text-xs mt-0.5">
                                {selectedGroup?.description || "선택된 그룹 코드에 속한 하위 세부 코드입니다."}
                            </CardDescription>
                        </div>
                        <Button
                            size="sm"
                            onClick={() => handleOpenCreateCode()}
                            disabled={!selectedGroup}
                            className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            세부 코드 추가
                        </Button>
                    </CardHeader>

                    <CardContent className="p-0">
                        {filteredSubCodes.length === 0 ? (
                            <div className="p-12 text-center text-zinc-500 text-sm space-y-3">
                                <div>code 테이블에 등록된 [{selectedGroup?.codeName || selectedGroup?.category}] 세부 코드가 없습니다.</div>
                                {selectedGroup && (
                                    <Button size="sm" onClick={() => handleOpenCreateCode()} className="gap-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
                                        <Plus className="w-3.5 h-3.5" />
                                        [{selectedGroup.codeName}] 세부 코드 추가하기
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 text-zinc-500 font-semibold">
                                            <th className="py-3 px-4 w-16 text-center">순서</th>
                                            <th className="py-3 px-4">코드 값 (code_value)</th>
                                            <th className="py-3 px-4">코드 명 (code_name)</th>
                                            <th className="py-3 px-4">상세 설명</th>
                                            <th className="py-3 px-4 w-24 text-center">사용 상태</th>
                                            <th className="py-3 px-4 w-24 text-right">관리</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                        {filteredSubCodes.map((codeItem) => (
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

            {/* Sub-Code Add / Edit Modal */}
            <Dialog open={isCodeDialogOpen} onOpenChange={setIsCodeDialogOpen}>
                <DialogContent className="sm:max-w-[480px]">
                    <form onSubmit={(e) => { e.preventDefault(); handleSaveCode(); }}>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 font-bold text-lg">
                                <Tag className="w-5 h-5 text-indigo-600" />
                                {editingCode ? "세부 코드 수정" : "새 세부 코드 추가"}
                            </DialogTitle>
                            <DialogDescription>
                                그룹 [{selectedGroup?.codeName || formCategory}]에 속하는 하위 세부 코드를 작성하세요.
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
                                        그룹 식별 키 (category)
                                    </Label>
                                    <Input
                                        id="category"
                                        value={formCategory}
                                        disabled
                                        readOnly
                                        className="h-9 text-sm uppercase bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-mono"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="sortOrder" className="text-xs font-semibold">
                                        정렬 순서 (숫자)
                                    </Label>
                                    <Input
                                        id="sortOrder"
                                        type="number"
                                        value={formSortOrder}
                                        onChange={(e) => setFormSortOrder(Number(e.target.value))}
                                        className="h-9 text-sm"
                                        disabled={isSavingCode}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="codeValue" className="text-xs font-semibold">
                                        코드 값 (code_value) <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="codeValue"
                                        value={formCodeValue}
                                        onChange={(e) => setFormCodeValue(e.target.value)}
                                        placeholder="예: 101, H1, mon"
                                        className="h-9 text-sm font-mono"
                                        disabled={isSavingCode}
                                        autoFocus
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="codeName" className="text-xs font-semibold">
                                        코드 명 (code_name) <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="codeName"
                                        value={formCodeName}
                                        onChange={(e) => setFormCodeName(e.target.value)}
                                        placeholder="예: 101호, 고1, 월요일"
                                        className="h-9 text-sm"
                                        disabled={isSavingCode}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="description" className="text-xs font-semibold">
                                    설명 및 비고
                                </Label>
                                <Textarea
                                    id="description"
                                    value={formDescription}
                                    onChange={(e) => setFormDescription(e.target.value)}
                                    placeholder="코드 세부 설명 작성"
                                    className="text-sm min-h-[60px] resize-none"
                                    disabled={isSavingCode}
                                />
                            </div>

                            <div className="flex items-center gap-2 pt-1">
                                <input
                                    type="checkbox"
                                    id="isUse"
                                    checked={formIsUse}
                                    onChange={(e) => setFormIsUse(e.target.checked)}
                                    className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                                    disabled={isSavingCode}
                                />
                                <Label htmlFor="isUse" className="text-xs font-semibold cursor-pointer">
                                    이 코드를 활성화하여 시스템에서 사용합니다 (is_use)
                                </Label>
                            </div>
                        </div>

                        <DialogFooter className="pt-2 border-t flex items-center justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setIsCodeDialogOpen(false)}
                                disabled={isSavingCode}
                            >
                                취소
                            </Button>
                            <Button
                                type="submit"
                                size="sm"
                                disabled={isSavingCode}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
                            >
                                {isSavingCode && <Loader2 className="w-4 h-4 animate-spin" />}
                                {isSavingCode ? "저장 중..." : "저장하기"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Group Code Add / Edit Modal (sup_category: null) */}
            <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
                <DialogContent className="sm:max-w-[420px]">
                    <DialogHeader>
                        <DialogTitle className="font-bold text-lg flex items-center gap-2">
                            <FolderPlus className="w-5 h-5 text-indigo-600" />
                            {editingGroup ? "그룹 코드 수정" : "새 그룹 코드 추가 (sup_category = null)"}
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            DB code 테이블에 최상위 그룹 코드(sup_category = null) 항목을 등록합니다.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-2 space-y-3">
                        {groupError && (
                            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                {groupError}
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <Label htmlFor="formGroupCategoryKey" className="text-xs font-semibold">
                                영문 그룹 식별 키 (category) <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="formGroupCategoryKey"
                                value={formGroupCategoryKey}
                                onChange={(e) => setFormGroupCategoryKey(e.target.value.toUpperCase())}
                                placeholder="예: ROOM, GRADE, DAY, SUBJECT"
                                className="h-9 text-sm uppercase font-mono"
                                disabled={!!editingGroup}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="formGroupCodeName" className="text-xs font-semibold">
                                그룹 표시명 (code_name) <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="formGroupCodeName"
                                value={formGroupCodeName}
                                onChange={(e) => setFormGroupCodeName(e.target.value)}
                                placeholder="예: 강의실, 학년, 요일, 과목"
                                className="h-9 text-sm"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="formGroupDescription" className="text-xs font-semibold">
                                그룹 설명 (description)
                            </Label>
                            <Textarea
                                id="formGroupDescription"
                                value={formGroupDescription}
                                onChange={(e) => setFormGroupDescription(e.target.value)}
                                placeholder="그룹 코드 상세 설명을 입력하세요."
                                className="text-sm min-h-[60px] resize-none"
                            />
                        </div>
                    </div>

                    <DialogFooter className="pt-2 border-t flex items-center justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setIsGroupDialogOpen(false)}>
                            취소
                        </Button>
                        <Button size="sm" onClick={handleSaveGroup} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                            저장하기
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
