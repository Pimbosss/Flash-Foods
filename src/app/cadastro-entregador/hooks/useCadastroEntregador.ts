'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/services/firebase";
import Usuario from '@/core/Usuarios';

const initialState: Usuario = {
    name: "",
    email: "",
    phone: "",
    cpf: "",
    cnh: "",
    placaVeiculo: "",
    password: "",
    confirmPassword: "",
    tipo: "entregador"
};

export default function useCadastroEntregador() {
    const router = useRouter();
    const [entregador, setEntregador] = useState<Usuario>({ ...initialState });

    const updatedField = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setEntregador(prev => ({ ...prev, [name]: value }));
    };

    const save = async (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!entregador.email || !entregador.name || !entregador.password || !entregador.cnh) {
            alert("Por favor, preencha todos os campos obrigatórios! 📝");
            return;
        }

        if (entregador.password.length < 6) {
            alert("A senha deve ter pelo menos 6 caracteres! 🔐");
            return;
        }

        if (entregador.password !== entregador.confirmPassword) {
            alert("As senhas não coincidem! ❌");
            return;
        }

        try {
            const emailLimpo = entregador.email.toLowerCase().trim();

            // 1. Cria o usuário no Firebase Authentication
            const userCredential = await createUserWithEmailAndPassword(auth, emailLimpo, entregador.password);
            const uid = userCredential.user.uid;

            // 2. Salva os dados profissionais no Firestore (sem a senha)
            await setDoc(doc(db, "users", uid), {
                id: uid,
                name: entregador.name,
                email: emailLimpo,
                phone: entregador.phone,
                cpf: entregador.cpf,
                cnh: entregador.cnh,
                placaVeiculo: entregador.placaVeiculo,
                tipo: "entregador"
            });

            alert("Cadastro de entregador realizado com sucesso na nuvem! 🎉🏍️");
            setEntregador({ ...initialState });
            router.push("/login");

        } catch (error: any) {
            console.error("Erro ao cadastrar entregador:", error);
            if (error.code === "auth/email-already-in-use") {
                alert("Este e-mail já está cadastrado no sistema! ⚠️");
            } else {
                alert("Erro ao conectar com o Firebase ao tentar salvar.");
            }
        }
    };

    return { entregador, updatedField, save, router };
}
