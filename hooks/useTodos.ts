"use client";

import { useEffect, useState } from "react";
import { startOfDay } from "date-fns";
import { useTodoStore, Todo, FilterType } from "./useTodoStore";
import { useAuth } from "./useAuth";

export function useTodos() {
    const { user, getAuthorDisplayName, getLoggedInUserName } = useAuth();
    const {
        todos,
        loading,
        filter,
        setFilter,
        fetchTodos,
        toggleComplete,
        deleteTodo,
        addTodo,
        updateTodo,
    } = useTodoStore();

    // Dialog & Form states
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [startDate, setStartDate] = useState<Date | undefined>(new Date());
    const [endDate, setEndDate] = useState<Date | undefined>(new Date());

    useEffect(() => {
        fetchTodos();
    }, [fetchTodos]);

    const resetForm = () => {
        setTitle("");
        setContent("");
        setStartDate(new Date());
        setEndDate(new Date());
        setEditingTodo(null);
    };

    const handleOpenAddDialog = () => {
        if (!user) return;
        setEditingTodo(null);
        resetForm();
        setIsDialogOpen(true);
    };

    const handleOpenEditDialog = (todo: Todo) => {
        if (!user) {
            alert("수정하려면 로그인이 필요합니다.");
            return;
        }
        setEditingTodo(todo);
        setTitle(todo.title);
        setContent(todo.contents || "");
        setStartDate(todo.s_date ? new Date(todo.s_date) : new Date());
        setEndDate(todo.e_date ? new Date(todo.e_date) : new Date());
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (!user) {
            alert("삭제하려면 로그인이 필요합니다.");
            return;
        }
        if (!confirm("이 할 일을 정말로 삭제하시겠습니까?")) return;
        const success = await deleteTodo(id);
        if (!success) {
            alert("삭제에 실패했습니다.");
        }
    };

    const handleSaveTodo = async () => {
        if (!title || !startDate || !endDate) return;

        if (!user) {
            alert("로그인이 필요합니다.");
            return;
        }

        if (startOfDay(startDate) > startOfDay(endDate)) {
            alert("시작일이 종료일보다 클 수 없습니다.");
            return;
        }

        if (editingTodo) {
            await updateTodo(editingTodo.id, {
                title,
                contents: content,
                s_date: startDate.toISOString(),
                e_date: endDate.toISOString(),
            });
        } else {
            await addTodo({
                title,
                contents: content,
                s_date: startDate.toISOString(),
                e_date: endDate.toISOString(),
                user_id: user.id,
                is_completed: false,
            });
        }

        resetForm();
        setIsDialogOpen(false);
    };

    // Filter counts
    const totalCount = todos.length;
    const inProgressCount = todos.filter((t) => !t.is_completed).length;
    const completedCount = todos.filter((t) => t.is_completed).length;

    const filteredTodos = todos.filter((todo) => {
        if (filter === "in_progress") return !todo.is_completed;
        if (filter === "completed") return todo.is_completed;
        return true;
    });

    return {
        user,
        todos: filteredTodos,
        loading,
        filter,
        setFilter,
        totalCount,
        inProgressCount,
        completedCount,
        isDialogOpen,
        setIsDialogOpen,
        editingTodo,
        title,
        setTitle,
        content,
        setContent,
        startDate,
        setStartDate,
        endDate,
        setEndDate,
        handleOpenAddDialog,
        handleOpenEditDialog,
        handleDeleteTodo: handleDelete,
        handleSaveTodo,
        toggleComplete,
        resetForm,
        getAuthorDisplayName,
        getLoggedInUserName,
    };
}
