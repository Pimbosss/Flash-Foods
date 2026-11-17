'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/services/firebase";

const initialState = {
    email: "",
    password: "",
};

export default function useLogin() {
    const router = useRouter();
    const [credentials, setCredentials] = useState({ ...initialState });

    const updatedField = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.target;
        setCredentials({ ...credentials, [name]: value });
    };

    const handleLogin = async (event: React.SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }

        if (!credentials.email || !credentials.password) {
            alert("Todos os campos são obrigatórios!");
            return;
        }

        try {
            const emailLimpo = credentials.email.toLowerCase().trim();

            // 1. Valida e-mail e senha no Firebase Authentication
            const userCredential = await signInWithEmailAndPassword(auth, emailLimpo, credentials.password);
            const uid = userCredential.user.uid;

            // 2. Busca os dados do perfil (nome, tipo, restauranteId) no Firestore
            const userDoc = await getDoc(doc(db, "users", uid));

            if (!userDoc.exists()) {
                alert("Dados do perfil não encontrados no banco!");
                return;
            }

            const usuario = userDoc.data();

            // 3. Mantém a sessão ativa no localStorage para o Header e rotas funcionarem sem alterações
            localStorage.setItem("flashfoods:user", JSON.stringify({
                id: uid,
                name: usuario.name,
                email: usuario.email,
                tipo: usuario.tipo || "cliente",
                restauranteId: usuario.restauranteId || ""
            }));

            alert("Login realizado com sucesso! 🚀");
            setCredentials(initialState);
            window.dispatchEvent(new Event("perfilAtualizado"));
            router.push("/", { scroll: true });

        } catch (error: any) {
            console.error("Erro no login:", error);
            if (error.code === "auth/invalid-credential" || error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {
                alert("E-mail ou senha incorretos! ❌");
            } else {
                alert("Erro ao conectar com o servidor de autenticação.");
            }
        }
    };

    return {
        credentials,
        router,
        updatedField,
        handleLogin
    };
}
