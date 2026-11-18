'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/services/firebase";
import Usuario from "@/core/Usuarios";

const initialState: Usuario = {
    email: "",
    cpf: "",
    name: "",
    phone: "",
    password: "",
    confirmPassword: "",
    tipo: "cliente",
    endereco: ""
};

export default function useCadastro() {
    const router = useRouter();
    const [user, setUser] = useState<Usuario>({ ...initialState });

    const updatedField = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.target;
        setUser({ ...user, [name]: value });
    };

    const save = async (event: React.SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!user.email || !user.cpf || !user.phone || !user.password || !user.confirmPassword || !user.name || !user.endereco) {
            alert("Todos os campos são obrigatórios! 📝");
            return;
        }

        if (user.password.length < 6) {
            alert("A senha deve ter pelo menos 6 caracteres! 🔐");
            return;
        }

        if (user.password !== user.confirmPassword) {
            alert("As senhas não coincidem! ❌");
            return;
        }

        try {
            const emailLimpo = user.email.toLowerCase().trim();

            // 1. Cria a conta no Firebase Authentication (já bloqueia e-mail duplicado automaticamente)
            const userCredential = await createUserWithEmailAndPassword(auth, emailLimpo, user.password);
            const uid = userCredential.user.uid;

            // 2. Salva os dados complementares no banco Firestore (sem salvar a senha em texto puro)
            await setDoc(doc(db, "users", uid), {
                id: uid,
                email: emailLimpo,
                name: user.name,
                cpf: user.cpf,
                phone: user.phone,
                tipo: "cliente",
                endereco: user.endereco
            });

            alert("Cadastro realizado com sucesso na nuvem! 🎉");
            setUser(initialState);
            router.push("/login");

        } catch (error: any) {
            console.error("Erro ao cadastrar no Firebase:", error);
            if (error.code === "auth/email-already-in-use") {
                alert("Este e-mail já está cadastrado no sistema! ⚠️");
            } else if (error.code === "auth/invalid-email") {
                alert("Digite um formato de e-mail válido! ⚠️");
            } else {
                alert("Erro ao realizar o cadastro. Tente novamente.");
            }
        }
    };

    return {
        router,
        user,
        updatedField,
        save
    };
}
