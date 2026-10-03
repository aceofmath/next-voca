import { redirect } from "next/navigation";

export default function TodosRedirectPage() {
    redirect("/mypage/todos");
}