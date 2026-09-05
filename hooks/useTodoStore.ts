import { create } from "zustand";
import { supabase } from "@/lib/supabaseClient";

export interface Todo {
    id: number;
    s_date: string;
    e_date: string;
    c_date?: string | null;
    title: string;
    contents: string;
    created_at: string;
    user_id?: string | null;
    is_completed: boolean;
}

export type FilterType = "all" | "in_progress" | "completed";

interface TodoState {
    todos: Todo[];
    loading: boolean;
    filter: FilterType;
    setFilter: (filter: FilterType) => void;
    fetchTodos: () => Promise<void>;
    toggleComplete: (id: number, currentCompleted: boolean) => Promise<void>;
    deleteTodo: (id: number) => Promise<boolean>;
    addTodo: (newTodoData: Omit<Todo, "id" | "created_at">) => Promise<boolean>;
    updateTodo: (id: number, updateData: Partial<Todo>) => Promise<boolean>;
}

export const useTodoStore = create<TodoState>((set, get) => ({
    todos: [],
    loading: true,
    filter: "all",

    setFilter: (filter) => set({ filter }),

    fetchTodos: async () => {
        try {
            set({ loading: true });
            const { data, error } = await supabase
                .from("todos")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) {
                console.error("Error fetching todos:", error.message);
            } else {
                set({ todos: data || [] });
            }
        } catch (err) {
            console.error("Fetch todos exception:", err);
        } finally {
            set({ loading: false });
        }
    },

    toggleComplete: async (id: number, currentCompleted: boolean) => {
        const nextCompleted = !currentCompleted;
        const newCDate = nextCompleted ? new Date().toISOString() : null;

        // Optimistic update
        set((state) => ({
            todos: state.todos.map((todo) =>
                todo.id === id ? { ...todo, is_completed: nextCompleted, c_date: newCDate } : todo
            ),
        }));

        const { error } = await supabase
            .from("todos")
            .update({ is_completed: nextCompleted, c_date: newCDate })
            .eq("id", id);

        if (error) {
            console.error("Error updating todo completion:", error.message);
            // Revert on error
            set((state) => ({
                todos: state.todos.map((todo) =>
                    todo.id === id ? { ...todo, is_completed: currentCompleted, c_date: todo.c_date } : todo
                ),
            }));
        }
    },

    deleteTodo: async (id: number) => {
        const previousTodos = get().todos;
        set((state) => ({
            todos: state.todos.filter((t) => t.id !== id),
        }));

        const { error } = await supabase.from("todos").delete().eq("id", id);

        if (error) {
            console.error("Error deleting todo:", error.message);
            set({ todos: previousTodos });
            return false;
        }
        return true;
    },

    addTodo: async (newTodoData) => {
        const { data, error } = await supabase.from("todos").insert([newTodoData]).select();

        if (error) {
            console.error("Error adding todo:", error.message);
            const fallbackTodo: Todo = {
                id: Date.now(),
                ...newTodoData,
                created_at: new Date().toISOString(),
            };
            set((state) => ({ todos: [fallbackTodo, ...state.todos] }));
            return false;
        } else if (data && data.length > 0) {
            set((state) => ({ todos: [data[0], ...state.todos] }));
            return true;
        } else {
            await get().fetchTodos();
            return true;
        }
    },

    updateTodo: async (id: number, updateData: Partial<Todo>) => {
        const { error } = await supabase.from("todos").update(updateData).eq("id", id);

        if (error) {
            console.error("Error updating todo:", error.message);
            return false;
        }

        set((state) => ({
            todos: state.todos.map((t) => (t.id === id ? { ...t, ...updateData } : t)),
        }));
        return true;
    },
}));
